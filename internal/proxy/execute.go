package proxy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/data"
	"github.com/bigint/raven/internal/logger"
	"github.com/bigint/raven/internal/proxy/providers"
)

// providerClient is a shared HTTP client with no timeout for streaming support.
var providerClient = &http.Client{Timeout: 0}

const maxProviderRetries = 2

// ExecuteInput contains all parameters needed to execute a proxy request.
type ExecuteInput struct {
	Pool               *pgxpool.Pool
	Redis              *redis.Client
	Env                *config.Env
	EndUser            string
	StartTime          time.Time
	ParsedBody         map[string]any
	Parsed             *ParsedRequest
	RequestedModel     string
	ProviderName       string
	ProviderConfigID   string
	ProviderConfigName string
	DecryptedAPIKey    string
	VirtualKeyID       string
	Method             string
	Path               string
	SessionID          string
	UserAgent          string
	GuardrailWarnings  []string
	GuardrailMatches   []GuardrailMatch // GuardrailMatch defined in guardrails.go
	IncomingHeaders    map[string]string
	ExtraHeaders       map[string]string
	RequestTimeoutMs   int
	LogRequestBodies   bool
	LogResponseBodies  bool
	BodyText           string
}

// activeProvider tracks the current provider during execution (may change on fallback).
type activeProvider struct {
	name       string
	configID   string
	configName string
}

// Execute performs the actual LLM API call, handling both streaming and buffered responses.
func Execute(ctx context.Context, input *ExecuteInput) (*http.Response, error) {
	contentAnalysis := AnalyzeContent(input.ParsedBody, input.SessionID)

	active := &activeProvider{
		name:       input.ProviderName,
		configID:   input.ProviderConfigID,
		configName: input.ProviderConfigName,
	}

	// Prepare the request body for the provider
	bodyBytes, err := prepareProviderBody(input.ProviderName, input.ParsedBody)
	if err != nil {
		return nil, fmt.Errorf("prepare body: %w", err)
	}

	passthroughHeaders := providers.FilterPassthroughHeaders(input.IncomingHeaders)

	providerCfg, _ := data.GetProviderConfig(input.ProviderName)
	baseURL := providerCfg.BaseURL

	buildRequest := func(apiKey, providerName string) (*http.Request, error) {
		return providers.CreateProviderRequest(
			providerName,
			apiKey,
			baseURL,
			input.RequestedModel,
			input.Path,
			bodyBytes,
			passthroughHeaders,
			input.Parsed.IsStreaming,
		)
	}

	doRequest := func(apiKey, providerName string) (*http.Response, error) {
		var lastErr error
		for attempt := 0; attempt <= maxProviderRetries; attempt++ {
			req, err := buildRequest(apiKey, providerName)
			if err != nil {
				return nil, err
			}

			if input.RequestTimeoutMs > 0 {
				timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(input.RequestTimeoutMs)*time.Millisecond)
				req = req.WithContext(timeoutCtx)
				_ = cancel
			} else {
				req = req.WithContext(ctx)
			}

			resp, err := providerClient.Do(req)
			if err != nil {
				lastErr = err
				continue
			}

			if resp.StatusCode >= 500 && attempt < maxProviderRetries {
				resp.Body.Close()
				lastErr = &ProviderError{
					Message: fmt.Sprintf("provider returned status %d", resp.StatusCode),
					Status:  resp.StatusCode,
				}
				continue
			}

			if resp.StatusCode >= 400 {
				respBody, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				return nil, &ProviderError{
					Message: fmt.Sprintf("provider error: %d", resp.StatusCode),
					Status:  resp.StatusCode,
					RawBody: string(respBody),
				}
			}

			return resp, nil
		}
		return nil, lastErr
	}

	// Try primary provider
	resp, err := doRequest(input.DecryptedAPIKey, input.ProviderName)
	if err != nil {
		logger.Error("primary provider failed", err,
			"provider", input.ProviderName,
			"providerConfigId", input.ProviderConfigID,
		)

		// Try fallback providers
		fallbacks, fbErr := GetFallbackProviders(ctx, input.Pool, input.Env, input.ProviderConfigID, input.ProviderName)
		if fbErr == nil {
			for _, fb := range fallbacks {
				active.configID = fb.ProviderConfigID
				active.configName = fb.ProviderConfigName
				active.name = fb.ProviderName

				fbResp, fbErr := doRequest(fb.DecryptedAPIKey, fb.ProviderName)
				if fbErr != nil {
					logger.Error("fallback provider failed", fbErr,
						"provider", fb.ProviderName,
						"providerConfigId", fb.ProviderConfigID,
					)
					continue
				}

				// Fallback succeeded
				if input.Parsed.IsStreaming {
					return handleStreamingResponse(fbResp, input, active, &contentAnalysis)
				}
				return handleBufferedResponse(fbResp, input, active, &contentAnalysis)
			}
		}

		// All providers failed
		body, status := FormatErrorResponse(err)
		emitLogEntry(input, active, &contentAnalysis, status, TokenUsage{}, 0, "")
		return &http.Response{
			StatusCode: status,
			Header:     buildResponseHeaders(input, false),
			Body:       io.NopCloser(bytes.NewBufferString(body)),
		}, nil
	}

	// Primary succeeded
	if input.Parsed.IsStreaming {
		return handleStreamingResponse(resp, input, active, &contentAnalysis)
	}
	return handleBufferedResponse(resp, input, active, &contentAnalysis)
}

// prepareProviderBody transforms the request body to the target provider's format.
func prepareProviderBody(provider string, body map[string]any) ([]byte, error) {
	switch provider {
	case "anthropic":
		return providers.TransformToAnthropic(body)
	case "google":
		// Use OpenAI-compatible endpoint by default
		return providers.TransformToGoogle(body, false)
	default:
		return providers.TransformToOpenAI(body)
	}
}

// handleStreamingResponse creates an HTTP response that streams SSE events.
func handleStreamingResponse(
	providerResp *http.Response,
	input *ExecuteInput,
	active *activeProvider,
	contentAnalysis *ContentAnalysis,
) (*http.Response, error) {
	pr, pw := io.Pipe()

	go func() {
		defer pw.Close()

		rw := &pipeResponseWriter{pw: pw}

		FormatStreamingResponse(
			rw,
			providerResp.Body,
			active.name,
			input.RequestedModel,
			input.Parsed.IncludeUsage,
			func(usage TokenUsage) {
				cost := EstimateCost(input.RequestedModel, usage.InputTokens, usage.OutputTokens)
				emitLogEntry(input, active, contentAnalysis, http.StatusOK, usage, cost, "")

				// Update last used and metrics
				go UpdateLastUsed(context.Background(), input.Redis, input.VirtualKeyID)
				go UpdateMetrics(context.Background(), input.Redis, active.configID, time.Since(input.StartTime).Milliseconds(), cost)
			},
		)
	}()

	headers := buildResponseHeaders(input, true)

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     headers,
		Body:       pr,
	}, nil
}

// handleBufferedResponse reads the full provider response and formats it.
func handleBufferedResponse(
	providerResp *http.Response,
	input *ExecuteInput,
	active *activeProvider,
	contentAnalysis *ContentAnalysis,
) (*http.Response, error) {
	defer providerResp.Body.Close()

	result, err := parseProviderResponse(providerResp.Body, active.name)
	if err != nil {
		body, status := FormatErrorResponse(err)
		return &http.Response{
			StatusCode: status,
			Header:     buildResponseHeaders(input, false),
			Body:       io.NopCloser(bytes.NewBufferString(body)),
		}, nil
	}

	formatted := FormatBufferedResponse(result, input.RequestedModel)

	cost := EstimateCost(input.RequestedModel, formatted.Usage.InputTokens, formatted.Usage.OutputTokens)
	latencyMs := time.Since(input.StartTime).Milliseconds()

	responseText := ""
	if input.LogResponseBodies {
		responseText = formatted.Text
	}

	emitLogEntry(input, active, contentAnalysis, http.StatusOK, formatted.Usage, cost, responseText)

	// Async post-processing
	go UpdateLastUsed(context.Background(), input.Redis, input.VirtualKeyID)
	go UpdateMetrics(context.Background(), input.Redis, active.configID, latencyMs, cost)
	go StoreCache(context.Background(), input.Redis, active.name, input.ParsedBody, formatted.Text, 0)

	headers := buildResponseHeaders(input, false)

	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     headers,
		Body:       io.NopCloser(bytes.NewBufferString(formatted.Text)),
	}, nil
}

// parseProviderResponse reads a buffered response from any provider and normalizes it.
func parseProviderResponse(body io.Reader, provider string) (*BufferedResult, error) {
	switch provider {
	case "anthropic":
		resp, usage, err := providers.ParseAnthropicResponse(body)
		if err != nil {
			return nil, err
		}

		openAIResp := providers.AnthropicToOpenAIResponse(resp, "")
		return extractBufferedResult(openAIResp, TokenUsage{
			InputTokens:     usage.InputTokens,
			OutputTokens:    usage.OutputTokens,
			CacheReadTokens: usage.CacheReadInputTokens,
			CacheWriteTokens: usage.CacheCreationInputTokens,
			CachedTokens:    usage.CacheReadInputTokens + usage.CacheCreationInputTokens,
		})

	case "google":
		resp, usage, err := providers.ParseGoogleResponse(body)
		if err != nil {
			return nil, err
		}

		openAIResp := providers.GoogleToOpenAIResponse(resp)
		return extractBufferedResult(openAIResp, TokenUsage{
			InputTokens:     usage.PromptTokens,
			OutputTokens:    usage.CompletionTokens,
			CachedTokens:    usage.CachedTokens,
			CacheReadTokens: usage.CachedTokens,
		})

	default:
		// OpenAI and compatible providers
		resp, usage, err := providers.ParseOpenAIResponse(body)
		if err != nil {
			return nil, err
		}

		return extractBufferedResult(resp, TokenUsage{
			InputTokens:     usage.PromptTokens,
			OutputTokens:    usage.CompletionTokens,
			CachedTokens:    usage.CachedTokens,
			CacheReadTokens: usage.CachedTokens,
			ReasoningTokens: usage.ReasoningTokens,
		})
	}
}

// extractBufferedResult pulls message content from an OpenAI-format response.
func extractBufferedResult(resp map[string]any, usage TokenUsage) (*BufferedResult, error) {
	result := &BufferedResult{Usage: usage}

	choices, _ := resp["choices"].([]any)
	if len(choices) == 0 {
		return result, nil
	}

	choice, _ := choices[0].(map[string]any)
	if choice == nil {
		return result, nil
	}

	result.FinishReason, _ = choice["finish_reason"].(string)

	message, _ := choice["message"].(map[string]any)
	if message == nil {
		return result, nil
	}

	if content, ok := message["content"].(string); ok {
		result.Text = content
	}

	if reasoning, ok := message["reasoning_content"].(string); ok {
		result.Reasoning = reasoning
	}

	if toolCalls, ok := message["tool_calls"].([]any); ok {
		for _, tc := range toolCalls {
			tcMap, ok := tc.(map[string]any)
			if !ok {
				continue
			}
			fn, _ := tcMap["function"].(map[string]any)
			if fn == nil {
				continue
			}

			id, _ := tcMap["id"].(string)
			name, _ := fn["name"].(string)
			var input any
			if args, ok := fn["arguments"].(string); ok {
				_ = json.Unmarshal([]byte(args), &input)
			} else {
				input = fn["arguments"]
			}

			result.ToolCalls = append(result.ToolCalls, ToolCallResult{
				ToolCallID: id,
				ToolName:   name,
				Input:      input,
			})
		}
	}

	return result, nil
}

// emitLogEntry builds and sends a log entry for the request.
func emitLogEntry(
	input *ExecuteInput,
	active *activeProvider,
	contentAnalysis *ContentAnalysis,
	statusCode int,
	usage TokenUsage,
	cost float64,
	responseText string,
) {
	latencyMs := time.Since(input.StartTime).Milliseconds()

	logData := LogData{
		VirtualKeyID:       input.VirtualKeyID,
		Provider:           active.name,
		ProviderConfigID:   active.configID,
		ProviderConfigName: active.configName,
		Model:              input.RequestedModel,
		Method:             input.Method,
		Path:               input.Path,
		StatusCode:         statusCode,
		InputTokens:        usage.InputTokens,
		OutputTokens:       usage.OutputTokens,
		ReasoningTokens:    usage.ReasoningTokens,
		Cost:               cost,
		LatencyMs:          latencyMs,
		CachedTokens:       usage.CachedTokens,
		CacheHit:           false,
		EndUser:            input.EndUser,
		HasImages:          contentAnalysis.HasImages,
		ImageCount:         contentAnalysis.ImageCount,
		HasToolUse:         contentAnalysis.HasToolUse,
		ToolCount:          contentAnalysis.ToolCount,
		ToolNames:          contentAnalysis.ToolNames,
		SessionID:          contentAnalysis.SessionID,
		UserAgent:          input.UserAgent,
		GuardrailMatches:   input.GuardrailMatches,
	}

	if input.LogRequestBodies && input.BodyText != "" {
		logData.RequestBody = input.BodyText
	}
	if responseText != "" {
		logData.ResponseBody = responseText
	}

	LogAndPublish(input.Pool, logData, input.Redis)
}

// buildResponseHeaders constructs the response headers.
func buildResponseHeaders(input *ExecuteInput, streaming bool) http.Header {
	headers := http.Header{}

	if streaming {
		headers.Set("Content-Type", "text/event-stream")
		headers.Set("Cache-Control", "no-cache")
		headers.Set("Connection", "keep-alive")
	} else {
		headers.Set("Content-Type", "application/json")
	}

	if len(input.GuardrailWarnings) > 0 {
		warnings := ""
		for i, w := range input.GuardrailWarnings {
			if i > 0 {
				warnings += "; "
			}
			warnings += w
		}
		headers.Set("X-Guardrail-Warnings", warnings)
	}

	for k, v := range input.ExtraHeaders {
		headers.Set(k, v)
	}

	return headers
}

// pipeResponseWriter implements http.ResponseWriter over an io.PipeWriter
// for streaming SSE through an http.Response body.
type pipeResponseWriter struct {
	pw      *io.PipeWriter
	headers http.Header
}

func (w *pipeResponseWriter) Header() http.Header {
	if w.headers == nil {
		w.headers = make(http.Header)
	}
	return w.headers
}

func (w *pipeResponseWriter) Write(data []byte) (int, error) {
	return w.pw.Write(data)
}

func (w *pipeResponseWriter) WriteHeader(_ int) {}

func (w *pipeResponseWriter) Flush() {}
