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

// GuardrailMatch describes a matched guardrail rule for logging.
type GuardrailMatch struct {
	RuleName       string `json:"ruleName"`
	RuleType       string `json:"ruleType"`
	Action         string `json:"action"`
	MatchedContent string `json:"matchedContent"`
}

// ExecuteInput contains all parameters needed to execute a proxy request.
type ExecuteInput struct {
	Pool              *pgxpool.Pool
	Redis             *redis.Client
	Env               *config.Env
	EndUser           string
	StartTime         time.Time
	ParsedBody        map[string]any
	Parsed            *ParsedRequest
	RequestedModel    string
	ProviderName      string
	ProviderConfigID  string
	ProviderConfigName string
	DecryptedAPIKey   string
	VirtualKeyID      string
	Method            string
	Path              string
	SessionID         string
	UserAgent         string
	GuardrailWarnings []string
	GuardrailMatches  []GuardrailMatch
	IncomingHeaders   map[string]string
	ExtraHeaders      map[string]string
	RequestTimeoutMs  int
	LogRequestBodies  bool
	LogResponseBodies bool
	BodyText          string
}

// ContentAnalysis holds metadata about the request content.
type ContentAnalysis struct {
	HasImages  bool
	ImageCount int
	HasToolUse bool
	ToolCount  int
	ToolNames  []string
	SessionID  string
}

// analyzeContent extracts metadata from the request body for logging.
func analyzeContent(body map[string]any, sessionID string) ContentAnalysis {
	analysis := ContentAnalysis{SessionID: sessionID}

	if sessionID == "" {
		analysis.SessionID = fmt.Sprintf("sess-%d", time.Now().UnixNano())
	}

	// Count images
	if messages, ok := body["messages"].([]any); ok {
		for _, raw := range messages {
			msg, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			content, ok := msg["content"].([]any)
			if !ok {
				continue
			}
			for _, block := range content {
				b, ok := block.(map[string]any)
				if !ok {
					continue
				}
				blockType, _ := b["type"].(string)
				if blockType == "image_url" || blockType == "image" {
					analysis.ImageCount++
				}
			}
		}
	}
	analysis.HasImages = analysis.ImageCount > 0

	// Detect tools
	if tools, ok := body["tools"].([]any); ok && len(tools) > 0 {
		analysis.HasToolUse = true
		analysis.ToolCount = len(tools)
		for _, raw := range tools {
			t, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			if fn, ok := t["function"].(map[string]any); ok {
				if name, ok := fn["name"].(string); ok {
					analysis.ToolNames = append(analysis.ToolNames, name)
				}
			} else if name, ok := t["name"].(string); ok {
				analysis.ToolNames = append(analysis.ToolNames, name)
			}
		}
	}

	return analysis
}

// estimateCost calculates the estimated cost based on token usage and model pricing.
func estimateCost(model string, inputTokens, outputTokens int) float64 {
	inputPrice, outputPrice, ok := data.GetModelPricing(model)
	if !ok {
		return 0
	}
	return (float64(inputTokens)/1_000_000)*inputPrice +
		(float64(outputTokens)/1_000_000)*outputPrice
}

// Execute performs the actual LLM API call, handling both streaming and buffered responses.
func Execute(ctx context.Context, input *ExecuteInput) (*http.Response, error) {
	contentAnalysis := analyzeContent(input.ParsedBody, input.SessionID)

	// Active provider tracking for fallback updates
	activeProvider := struct {
		name       string
		configID   string
		configName string
	}{
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

	// Try execution with primary provider
	doRequest := func(apiKey, providerName string) (*http.Response, error) {
		var lastErr error
		for attempt := 0; attempt <= maxProviderRetries; attempt++ {
			req, err := buildRequest(apiKey, providerName)
			if err != nil {
				return nil, err
			}

			if input.RequestTimeoutMs > 0 {
				var cancel context.CancelFunc
				reqCtx, cancel := context.WithTimeout(ctx, time.Duration(input.RequestTimeoutMs)*time.Millisecond)
				req = req.WithContext(reqCtx)
				_ = cancel // cancel will be called when response is consumed or on error
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

	resp, err := doRequest(input.DecryptedAPIKey, input.ProviderName)
	if err != nil {
		// Log the primary failure
		logger.Error("primary provider failed", err,
			"provider", input.ProviderName,
			"providerConfigId", input.ProviderConfigID,
		)

		// Fallback providers would be fetched from DB here.
		// For now, return the error formatted as a response.
		body, status := FormatErrorResponse(err)

		logEntry(input, &activeProvider, &contentAnalysis, status, ZeroUsage(), 0, "")

		return &http.Response{
			StatusCode: status,
			Header:     buildResponseHeaders(input, false),
			Body:       io.NopCloser(bytes.NewBufferString(body)),
		}, nil
	}

	// Handle streaming response
	if input.Parsed.IsStreaming {
		return handleStreamingResponse(resp, input, &activeProvider, &contentAnalysis)
	}

	// Handle buffered response
	return handleBufferedResponse(resp, input, &activeProvider, &contentAnalysis)
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
	activeProvider *struct {
		name       string
		configID   string
		configName string
	},
	contentAnalysis *ContentAnalysis,
) (*http.Response, error) {
	pr, pw := io.Pipe()

	go func() {
		defer pw.Close()

		rw := &pipeResponseWriter{pw: pw}

		FormatStreamingResponse(
			rw,
			providerResp.Body,
			activeProvider.name,
			input.RequestedModel,
			input.Parsed.IncludeUsage,
			func(usage TokenUsage) {
				cost := estimateCost(input.RequestedModel, usage.InputTokens, usage.OutputTokens)
				logEntry(input, activeProvider, contentAnalysis, http.StatusOK, usage, cost, "")
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
	activeProvider *struct {
		name       string
		configID   string
		configName string
	},
	contentAnalysis *ContentAnalysis,
) (*http.Response, error) {
	defer providerResp.Body.Close()

	result, err := parseProviderResponse(providerResp.Body, activeProvider.name)
	if err != nil {
		body, status := FormatErrorResponse(err)
		return &http.Response{
			StatusCode: status,
			Header:     buildResponseHeaders(input, false),
			Body:       io.NopCloser(bytes.NewBufferString(body)),
		}, nil
	}

	formatted := FormatBufferedResponse(result, input.RequestedModel)

	cost := estimateCost(input.RequestedModel, formatted.Usage.InputTokens, formatted.Usage.OutputTokens)

	logEntry(input, activeProvider, contentAnalysis, http.StatusOK, formatted.Usage, cost, formatted.Text)

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
			InputTokens:    usage.PromptTokens,
			OutputTokens:   usage.CompletionTokens,
			CachedTokens:   usage.CachedTokens,
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

// logEntry logs the request metrics (placeholder for full logging integration).
func logEntry(
	input *ExecuteInput,
	activeProvider *struct {
		name       string
		configID   string
		configName string
	},
	contentAnalysis *ContentAnalysis,
	statusCode int,
	usage TokenUsage,
	cost float64,
	responseText string,
) {
	latencyMs := time.Since(input.StartTime).Milliseconds()

	logger.Info("proxy request",
		"provider", activeProvider.name,
		"providerConfigId", activeProvider.configID,
		"model", input.RequestedModel,
		"method", input.Method,
		"path", input.Path,
		"statusCode", statusCode,
		"inputTokens", usage.InputTokens,
		"outputTokens", usage.OutputTokens,
		"reasoningTokens", usage.ReasoningTokens,
		"cachedTokens", usage.CachedTokens,
		"cost", fmt.Sprintf("%.6f", cost),
		"latencyMs", latencyMs,
		"hasImages", contentAnalysis.HasImages,
		"hasToolUse", contentAnalysis.HasToolUse,
		"virtualKeyId", input.VirtualKeyID,
		"sessionId", contentAnalysis.SessionID,
	)
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

func (w *pipeResponseWriter) WriteHeader(statusCode int) {
	// No-op for pipe writer; status is set on the http.Response directly
}

func (w *pipeResponseWriter) Flush() {
	// Pipe writes are unbuffered; no explicit flush needed
}
