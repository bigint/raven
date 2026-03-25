package proxy

import (
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
	"github.com/bigint/raven/internal/errors"
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

// InstanceSettings holds instance-level configuration loaded from the database.
type InstanceSettings struct {
	GlobalRateLimitRPM    *int
	GlobalRateLimitRPD    *int
	DefaultMaxTokens      int
	RequestTimeoutSeconds int
	LogRequestBodies      bool
	LogResponseBodies     bool
}

// RunPipeline orchestrates the full proxy request flow from authentication through execution.
func RunPipeline(w http.ResponseWriter, r *http.Request, input *PipelineInput) {
	ctx := r.Context()
	startTime := time.Now()

	// 1. Auth + settings in parallel
	type authResult struct {
		vk  *VirtualKey
		err error
	}
	type settingsResult struct {
		cfg *InstanceSettings
		err error
	}

	authCh := make(chan authResult, 1)
	settingsCh := make(chan settingsResult, 1)

	go func() {
		vk, err := AuthenticateKey(ctx, input.Pool, input.Redis, input.AuthHeader)
		authCh <- authResult{vk, err}
	}()

	go func() {
		cfg, err := LoadInstanceSettings(ctx, input.Pool, input.Redis)
		settingsCh <- settingsResult{cfg, err}
	}()

	authRes := <-authCh
	if authRes.err != nil {
		writeAppError(w, r, authRes.err)
		return
	}
	virtualKey := authRes.vk

	settingsRes := <-settingsCh
	if settingsRes.err != nil {
		writeAppError(w, r, settingsRes.err)
		return
	}
	cfg := settingsRes.cfg

	// 2. Parse JSON body
	var parsedBody map[string]any
	if input.BodyText != "" {
		if err := json.Unmarshal([]byte(input.BodyText), &parsedBody); err != nil {
			if input.StrictBody {
				errors.Validation("Invalid JSON body").WriteJSON(w, r.URL.Path)
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

	// 4. Gate checks in parallel: rate limit, budget, guardrails, routing
	rpm := virtualKey.RateLimitRpm
	rpd := virtualKey.RateLimitRpd

	if rpm == nil {
		rpm = cfg.GlobalRateLimitRPM
	}
	if rpd == nil {
		rpd = cfg.GlobalRateLimitRPD
	}

	type gateResults struct {
		rateLimitErr    error
		budgetErr       error
		guardrailResult *GuardrailResult
		guardrailErr    error
		routingResult   *RoutingRuleResult
	}

	gates := make(chan gateResults, 1)
	go func() {
		var gr gateResults

		// Rate limit
		gr.rateLimitErr = CheckRateLimit(ctx, input.Redis, virtualKey.ID, rpm, rpd)

		// Budget
		if gr.rateLimitErr == nil {
			gr.budgetErr = CheckBudgets(ctx, input.Pool, input.Redis, virtualKey.ID)
		}

		// Guardrails
		if hasMessages && gr.rateLimitErr == nil && gr.budgetErr == nil {
			var guardrailMessages []GuardrailMessage
			for _, raw := range messages {
				msg, ok := raw.(map[string]any)
				if !ok {
					continue
				}
				role, _ := msg["role"].(string)
				var contentStr string
				switch c := msg["content"].(type) {
				case string:
					contentStr = c
				default:
					b, _ := json.Marshal(c)
					contentStr = string(b)
				}
				guardrailMessages = append(guardrailMessages, GuardrailMessage{
					Role:    role,
					Content: contentStr,
				})
			}
			gr.guardrailResult, gr.guardrailErr = EvaluateGuardrails(ctx, input.Pool, input.Redis, guardrailMessages)
		}

		// Routing
		if hasModel && !input.SkipRouting && gr.rateLimitErr == nil && gr.budgetErr == nil {
			gr.routingResult = EvaluateRoutingRules(ctx, input.Pool, input.Redis, modelStr, parsedBody)
		}

		gates <- gr
	}()

	gr := <-gates

	if gr.rateLimitErr != nil {
		writeAppError(w, r, gr.rateLimitErr)
		return
	}
	if gr.budgetErr != nil {
		writeAppError(w, r, gr.budgetErr)
		return
	}
	if gr.guardrailErr != nil {
		writeAppError(w, r, gr.guardrailErr)
		return
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

	// 6. Apply routing rule result
	guardrailWarnings := []string{}
	var guardrailMatches []GuardrailMatch
	if gr.guardrailResult != nil {
		guardrailWarnings = gr.guardrailResult.Warnings
		guardrailMatches = gr.guardrailResult.Matches
	}

	if gr.routingResult != nil && gr.routingResult.RuleApplied {
		parsedBody["model"] = gr.routingResult.Model
		modelStr = gr.routingResult.Model
	}

	// 7. Cache + provider resolution in parallel
	parsed := ParseProviderFromPath(input.ProviderPath)

	type resolveResults struct {
		cacheResult *CacheResult
		resolution  *ProviderResolution
		resolveErr  error
	}

	resolveCh := make(chan resolveResults, 1)
	go func() {
		var rr resolveResults
		rr.cacheResult = CheckCache(ctx, input.Redis, parsed.ProviderName, parsedBody)
		rr.resolution, rr.resolveErr = ResolveProvider(ctx, input.Pool, input.Env, input.ProviderPath, input.Redis, StrategyRandom)
		resolveCh <- rr
	}()

	rr := <-resolveCh

	if rr.resolveErr != nil {
		writeAppError(w, r, rr.resolveErr)
		return
	}

	resolvedPath := input.UpstreamPathOverride
	if resolvedPath == "" {
		resolvedPath = rr.resolution.UpstreamPath
	}

	requestedModel := modelStr
	if requestedModel == "" {
		requestedModel = "unknown"
	}

	// 8. Serve cache hit
	if rr.cacheResult != nil && rr.cacheResult.Hit {
		serveCacheHitResponse(w, input, rr.cacheResult, requestedModel, startTime,
			rr.resolution, endUser, guardrailWarnings, guardrailMatches, virtualKey.ID)
		return
	}

	// 9. Parse incoming request
	parsedReq := ParseIncomingRequest(parsedBody, rr.resolution.ProviderName)

	// 10. Apply default max tokens from settings when not specified
	if parsedReq.MaxTokens == nil && cfg.DefaultMaxTokens > 0 {
		parsedReq.MaxTokens = &cfg.DefaultMaxTokens
	}

	if parsedReq.RequiresRawProxy {
		writeJSONError(w, http.StatusBadRequest, "UNSUPPORTED_PARAMETER",
			`Parameter "n" > 1 is not currently supported. Please send separate requests.`)
		return
	}

	// 11. Execute
	resp, err := Execute(ctx, &ExecuteInput{
		Pool:               input.Pool,
		Redis:              input.Redis,
		Env:                input.Env,
		EndUser:            endUser,
		StartTime:          startTime,
		ParsedBody:         parsedBody,
		Parsed:             parsedReq,
		RequestedModel:     requestedModel,
		ProviderName:       rr.resolution.ProviderName,
		ProviderConfigID:   rr.resolution.ProviderConfigID,
		ProviderConfigName: rr.resolution.ProviderConfigName,
		DecryptedAPIKey:    rr.resolution.DecryptedAPIKey,
		VirtualKeyID:       virtualKey.ID,
		Method:             input.Method,
		Path:               resolvedPath,
		SessionID:          input.SessionID,
		UserAgent:          input.UserAgent,
		GuardrailWarnings:  guardrailWarnings,
		GuardrailMatches:   guardrailMatches,
		IncomingHeaders:    input.IncomingHeaders,
		ExtraHeaders:       input.ExtraResponseHeaders,
		RequestTimeoutMs:   cfg.RequestTimeoutSeconds * 1000,
		LogRequestBodies:   cfg.LogRequestBodies,
		LogResponseBodies:  cfg.LogResponseBodies,
		BodyText:           input.BodyText,
	})
	if err != nil {
		writeAppError(w, r, err)
		return
	}

	// Write response to client
	writeProxyResponse(w, resp, parsedReq.IsStreaming)
}

// RoutingRuleResult holds the result of routing rule evaluation.
type RoutingRuleResult struct {
	RuleApplied bool
	Model       string
}

// EvaluateRoutingRules evaluates routing rules for model selection.
// This is a stub that calls into the content router module.
func EvaluateRoutingRules(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, model string, body map[string]any) *RoutingRuleResult {
	// Placeholder: routing rules will be loaded from the database and evaluated.
	// Returns nil when no rules match.
	return nil
}

// LoadInstanceSettings retrieves instance-level settings from the database.
// This is a stub that will be replaced by the actual settings module.
func LoadInstanceSettings(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) (*InstanceSettings, error) {
	cacheKey := "instance:settings"

	if rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var settings InstanceSettings
			if jsonErr := json.Unmarshal([]byte(cached), &settings); jsonErr == nil {
				return &settings, nil
			}
		}
	}

	var settings InstanceSettings
	err := pool.QueryRow(ctx,
		`SELECT
			COALESCE(global_rate_limit_rpm, 60),
			COALESCE(global_rate_limit_rpd, 1000),
			COALESCE(default_max_tokens, 4096),
			COALESCE(request_timeout_seconds, 300),
			COALESCE(log_request_bodies, false),
			COALESCE(log_response_bodies, false)
		FROM instance_settings LIMIT 1`,
	).Scan(
		&settings.GlobalRateLimitRPM,
		&settings.GlobalRateLimitRPD,
		&settings.DefaultMaxTokens,
		&settings.RequestTimeoutSeconds,
		&settings.LogRequestBodies,
		&settings.LogResponseBodies,
	)
	if err != nil {
		// Return defaults if no settings found
		defaultRPM := 60
		defaultRPD := 1000
		return &InstanceSettings{
			GlobalRateLimitRPM:    &defaultRPM,
			GlobalRateLimitRPD:    &defaultRPD,
			DefaultMaxTokens:      4096,
			RequestTimeoutSeconds: 300,
			LogRequestBodies:      false,
			LogResponseBodies:     false,
		}, nil
	}

	if rdb != nil {
		data, jsonErr := json.Marshal(&settings)
		if jsonErr == nil {
			rdb.Set(ctx, cacheKey, data, 30*time.Second)
		}
	}

	return &settings, nil
}

// serveCacheHitResponse writes a cached response to the client and logs it.
func serveCacheHitResponse(
	w http.ResponseWriter,
	input *PipelineInput,
	cacheResult *CacheResult,
	model string,
	startTime time.Time,
	resolution *ProviderResolution,
	endUser string,
	guardrailWarnings []string,
	guardrailMatches []GuardrailMatch,
	virtualKeyID string,
) {
	// Extract usage from cached body
	usage := MapUsage(cacheResult.Parsed)
	cost := EstimateCost(model, usage.InputTokens, usage.OutputTokens)
	latencyMs := time.Since(startTime).Milliseconds()

	LogAndPublish(input.Pool, LogData{
		VirtualKeyID:       virtualKeyID,
		Provider:           resolution.ProviderName,
		ProviderConfigID:   resolution.ProviderConfigID,
		ProviderConfigName: resolution.ProviderConfigName,
		Model:              model,
		Method:             input.Method,
		Path:               resolution.UpstreamPath,
		StatusCode:         http.StatusOK,
		InputTokens:        usage.InputTokens,
		OutputTokens:       usage.OutputTokens,
		ReasoningTokens:    usage.ReasoningTokens,
		Cost:               cost,
		LatencyMs:          latencyMs,
		CachedTokens:       usage.CachedTokens,
		CacheHit:           true,
		EndUser:            endUser,
		SessionID:          input.SessionID,
		UserAgent:          input.UserAgent,
		GuardrailMatches:   guardrailMatches,
	}, input.Redis)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "HIT")
	if len(guardrailWarnings) > 0 {
		warnings := ""
		for i, gw := range guardrailWarnings {
			if i > 0 {
				warnings += "; "
			}
			warnings += gw
		}
		w.Header().Set("X-Guardrail-Warnings", warnings)
	}
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, cacheResult.Body)
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

// writeAppError writes an error as an HTTP response, handling AppError types.
func writeAppError(w http.ResponseWriter, r *http.Request, err error) {
	if appErr, ok := errors.IsAppError(err); ok {
		appErr.WriteJSON(w, r.URL.Path)
		return
	}

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

// writeSettingsError is used for initialization errors that are not AppError.
func init() {
	// Ensure logger is available even if Init hasn't been called
	if logger.Log == nil {
		logger.Init(false)
	}
}
