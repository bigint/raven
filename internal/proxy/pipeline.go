package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/data"
	"github.com/bigint/raven/internal/logger"
)

// PipelineInput contains all parameters needed to run the proxy pipeline.
type PipelineInput struct {
	Pool                 *pgxpool.Pool
	Redis                *redis.Client
	Env                  *config.Env
	AuthHeader           string
	Method               string
	Path                 string
	BodyText             string
	SessionID            string
	UserAgent            string
	UserIDHeader         string
	IncomingHeaders      map[string]string
	ExtraResponseHeaders map[string]string
	ProviderPath         string
	UpstreamPathOverride string
	SkipRouting          bool
	StrictBody           bool
}

// RunPipeline orchestrates the full proxy request flow from authentication through execution.
func RunPipeline(w http.ResponseWriter, r *http.Request, input *PipelineInput) {
	ctx := r.Context()
	startTime := time.Now()

	// 1. Auth + settings (would run in parallel in production)
	// authenticateKey and getInstanceSettings are external dependencies;
	// we define the expected interfaces and call them.
	authResult, err := authenticateKey(ctx, input.Pool, input.Redis, input.AuthHeader)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	settings, err := getInstanceSettings(ctx, input.Pool, input.Redis)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	// 2. Parse JSON body
	var parsedBody map[string]any
	if input.BodyText != "" {
		if err := json.Unmarshal([]byte(input.BodyText), &parsedBody); err != nil {
			if input.StrictBody {
				writeJSONError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid JSON body")
				return
			}
			parsedBody = make(map[string]any)
		}
	} else {
		parsedBody = make(map[string]any)
	}

	// 3. Model validation
	modelStr, hasModel := parsedBody["model"].(string)
	messages, _ := parsedBody["messages"].([]any)
	hasMessages := len(messages) > 0

	if hasModel {
		if _, exists := data.ModelCatalog[modelStr]; !exists {
			writeJSONError(w, http.StatusBadRequest, "UNSUPPORTED_MODEL",
				fmt.Sprintf("Model '%s' is not supported. Use /v1/models to see available models.", modelStr))
			return
		}
	}

	// 4. Gate checks (rate limit, budget, guardrails, routing) — would run in parallel
	virtualKeyID := authResult.VirtualKeyID
	rpm := authResult.RateLimitRPM
	rpd := authResult.RateLimitRPD

	if rpm == 0 {
		rpm = settings.GlobalRateLimitRPM
	}
	if rpd == 0 {
		rpd = settings.GlobalRateLimitRPD
	}

	if err := checkRateLimit(ctx, input.Redis, virtualKeyID, rpm, rpd); err != nil {
		writeErrorResponse(w, err)
		return
	}

	if err := checkBudgets(ctx, input.Pool, input.Redis, virtualKeyID); err != nil {
		writeErrorResponse(w, err)
		return
	}

	var guardrailWarnings []string
	var guardrailMatches []GuardrailMatch
	if hasMessages {
		result, err := evaluateGuardrails(ctx, input.Pool, input.Redis, messages)
		if err != nil {
			writeErrorResponse(w, err)
			return
		}
		if result != nil {
			guardrailWarnings = result.Warnings
			guardrailMatches = result.Matches
		}
	}

	// Routing rules
	if hasModel && !input.SkipRouting {
		routingResult, err := evaluateRoutingRules(ctx, input.Pool, modelStr, parsedBody)
		if err == nil && routingResult != nil && routingResult.RuleApplied {
			parsedBody["model"] = routingResult.Model
			modelStr = routingResult.Model
		}
	}

	// 5. Extract end-user identity
	endUser := input.UserIDHeader
	if endUser == "" {
		if u, ok := parsedBody["user"].(string); ok {
			endUser = u
		}
	}
	if endUser == "" {
		if meta, ok := parsedBody["metadata"].(map[string]any); ok {
			if uid, ok := meta["user_id"].(string); ok {
				endUser = uid
			}
		}
	}

	// 6. Cache check + provider resolution (would run in parallel)
	providerPath := input.ProviderPath
	providerName, _, upstreamPath := parseProviderFromPath(providerPath)

	cacheResult := checkCache(ctx, input.Redis, providerName, parsedBody)

	providerResolution, err := resolveProvider(ctx, input.Pool, input.Env, input.Redis, providerPath)
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	resolvedPath := input.UpstreamPathOverride
	if resolvedPath == "" {
		resolvedPath = upstreamPath
	}

	requestedModel := modelStr
	if requestedModel == "" {
		requestedModel = "unknown"
	}

	// Serve cache hit
	if cacheResult != nil && cacheResult.Hit {
		serveCacheHit(w, cacheResult, requestedModel)
		return
	}

	// 7. Parse + execute
	parsed := ParseIncomingRequest(parsedBody, providerResolution.ProviderName)

	// Apply default max tokens from settings when not specified
	if parsed.MaxTokens == nil && settings.DefaultMaxTokens > 0 {
		parsed.MaxTokens = &settings.DefaultMaxTokens
	}

	if parsed.RequiresRawProxy {
		writeJSONError(w, http.StatusBadRequest, "UNSUPPORTED_PARAMETER",
			`Parameter "n" > 1 is not currently supported. Please send separate requests.`)
		return
	}

	resp, err := Execute(ctx, &ExecuteInput{
		Pool:               input.Pool,
		Redis:              input.Redis,
		Env:                input.Env,
		EndUser:            endUser,
		StartTime:          startTime,
		ParsedBody:         parsedBody,
		Parsed:             parsed,
		RequestedModel:     requestedModel,
		ProviderName:       providerResolution.ProviderName,
		ProviderConfigID:   providerResolution.ProviderConfigID,
		ProviderConfigName: providerResolution.ProviderConfigName,
		DecryptedAPIKey:    providerResolution.DecryptedAPIKey,
		VirtualKeyID:       virtualKeyID,
		Method:             input.Method,
		Path:               resolvedPath,
		SessionID:          input.SessionID,
		UserAgent:          input.UserAgent,
		GuardrailWarnings:  guardrailWarnings,
		GuardrailMatches:   guardrailMatches,
		IncomingHeaders:    input.IncomingHeaders,
		ExtraHeaders:       input.ExtraResponseHeaders,
		RequestTimeoutMs:   settings.RequestTimeoutSeconds * 1000,
		LogRequestBodies:   settings.LogRequestBodies,
		LogResponseBodies:  settings.LogResponseBodies,
		BodyText:           input.BodyText,
	})
	if err != nil {
		writeErrorResponse(w, err)
		return
	}

	// Write response to client
	writeProxyResponse(w, resp, parsed.IsStreaming)
}

// writeProxyResponse forwards the Execute response to the client.
func writeProxyResponse(w http.ResponseWriter, resp *http.Response, isStreaming bool) {
	// Copy headers
	for k, vals := range resp.Header {
		for _, v := range vals {
			w.Header().Set(k, v)
		}
	}

	if isStreaming {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.WriteHeader(resp.StatusCode)

		flusher, ok := w.(http.Flusher)
		if ok {
			// Stream the response body
			buf := make([]byte, 4096)
			for {
				n, err := resp.Body.Read(buf)
				if n > 0 {
					w.Write(buf[:n])
					flusher.Flush()
				}
				if err != nil {
					break
				}
			}
		} else {
			io.Copy(w, resp.Body)
		}
	} else {
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}

	resp.Body.Close()
}

// writeErrorResponse writes an error as an HTTP response.
func writeErrorResponse(w http.ResponseWriter, err error) {
	body, status := FormatErrorResponse(err)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	fmt.Fprint(w, body)
}

// writeJSONError writes a JSON error response.
func writeJSONError(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]any{
			"code":    code,
			"message": message,
		},
	})
}

// parseProviderFromPath extracts the provider name, config ID, and upstream path from a URL path.
func parseProviderFromPath(reqPath string) (providerName, configID, upstreamPath string) {
	trimmed := strings.TrimPrefix(reqPath, "/v1/proxy/")
	trimmed = strings.TrimPrefix(trimmed, "/")

	segments := strings.SplitN(trimmed, "/", 2)
	providerSegment := segments[0]

	if len(segments) > 1 {
		upstreamPath = "/" + segments[1]
	} else {
		upstreamPath = "/"
	}

	tildeIdx := strings.Index(providerSegment, "~")
	if tildeIdx == -1 {
		providerName = providerSegment
	} else {
		providerName = providerSegment[:tildeIdx]
		configID = providerSegment[tildeIdx+1:]
	}

	return
}

// --- Stub types and functions for pipeline dependencies ---
// These represent interfaces to other modules that will be implemented separately.

// AuthResult holds the result of key authentication.
type AuthResult struct {
	VirtualKeyID string
	RateLimitRPM int
	RateLimitRPD int
}

// InstanceSettings holds instance-level configuration.
type InstanceSettings struct {
	GlobalRateLimitRPM    int
	GlobalRateLimitRPD    int
	DefaultMaxTokens      int
	RequestTimeoutSeconds int
	LogRequestBodies      bool
	LogResponseBodies     bool
}

// ProviderResolution holds the resolved provider details.
type ProviderResolution struct {
	DecryptedAPIKey    string
	ProviderConfigID   string
	ProviderConfigName string
	ProviderName       string
	UpstreamPath       string
}

// GuardrailResult holds the result of guardrail evaluation.
type GuardrailResult struct {
	Warnings []string
	Matches  []GuardrailMatch
}

// RoutingResult holds the result of routing rule evaluation.
type RoutingResult struct {
	RuleApplied bool
	Model       string
}

// CacheResult holds the result of a cache lookup.
type CacheResult struct {
	Hit  bool
	Body string
}

// authenticateKey validates the API key and returns virtual key info.
// This is a stub that will be replaced by the actual auth module.
func authenticateKey(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, authHeader string) (*AuthResult, error) {
	if authHeader == "" {
		return nil, &ProviderError{Message: "Unauthorized", Status: http.StatusUnauthorized}
	}
	// Placeholder: actual implementation queries the database
	logger.Info("authenticateKey called", "authHeader", "***")
	return &AuthResult{VirtualKeyID: "pending"}, nil
}

// getInstanceSettings retrieves instance-level settings.
// This is a stub that will be replaced by the actual settings module.
func getInstanceSettings(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) (*InstanceSettings, error) {
	return &InstanceSettings{
		GlobalRateLimitRPM:    60,
		GlobalRateLimitRPD:    1000,
		DefaultMaxTokens:      4096,
		RequestTimeoutSeconds: 300,
		LogRequestBodies:      false,
		LogResponseBodies:     false,
	}, nil
}

// checkRateLimit enforces rate limits for a virtual key.
// This is a stub that will be replaced by the actual rate limiter module.
func checkRateLimit(ctx context.Context, rdb *redis.Client, virtualKeyID string, rpm, rpd int) error {
	return nil
}

// checkBudgets verifies budget constraints for a virtual key.
// This is a stub that will be replaced by the actual budget module.
func checkBudgets(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, virtualKeyID string) error {
	return nil
}

// evaluateGuardrails checks messages against guardrail rules.
// This is a stub that will be replaced by the actual guardrails module.
func evaluateGuardrails(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, messages []any) (*GuardrailResult, error) {
	return nil, nil
}

// evaluateRoutingRules evaluates routing rules for model selection.
// This is a stub that will be replaced by the actual routing module.
func evaluateRoutingRules(ctx context.Context, pool *pgxpool.Pool, model string, body map[string]any) (*RoutingResult, error) {
	return nil, nil
}

// checkCache checks for a cached response.
// This is a stub that will be replaced by the actual cache module.
func checkCache(ctx context.Context, rdb *redis.Client, provider string, body map[string]any) *CacheResult {
	return nil
}

// serveCacheHit writes a cached response to the client.
// This is a stub that will be replaced by the actual cache module.
func serveCacheHit(w http.ResponseWriter, cacheResult *CacheResult, model string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "HIT")
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, cacheResult.Body)
}

// resolveProvider resolves the provider configuration for a request.
// This is a stub that will be replaced by the actual provider resolver module.
func resolveProvider(ctx context.Context, pool *pgxpool.Pool, env *config.Env, rdb *redis.Client, providerPath string) (*ProviderResolution, error) {
	providerName, configID, upstreamPath := parseProviderFromPath(providerPath)
	_ = configID

	if providerName == "" {
		return nil, &ProviderError{Message: "Provider not specified in path", Status: http.StatusBadRequest}
	}

	// Placeholder: actual implementation queries the database and decrypts API key
	return &ProviderResolution{
		ProviderName:       providerName,
		ProviderConfigID:   "pending",
		ProviderConfigName: "",
		DecryptedAPIKey:    "",
		UpstreamPath:       upstreamPath,
	}, nil
}
