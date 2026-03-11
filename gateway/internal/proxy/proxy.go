package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/bigint-studio/raven/internal/auth"
	"github.com/bigint-studio/raven/internal/budget"
	"github.com/bigint-studio/raven/internal/cache"
	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/observe"
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/internal/router"
	"github.com/bigint-studio/raven/internal/store"
	"github.com/bigint-studio/raven/pkg/types"
)

// Engine is the core reverse proxy engine.
type Engine struct {
	cfg            *config.Config
	registry       *providers.Registry
	router         *router.DefaultRouter
	pool           *Pool
	stream         *StreamProxy
	cache          *cache.Orchestrator
	health         *providers.HealthChecker
	metrics        *observe.Metrics
	costCalc       *observe.CostCalculator
	budgetMgr      *budget.Manager
	budgetTracker  *budget.Tracker
	store          store.Store
}

// NewEngine creates a new proxy engine.
func NewEngine(
	cfg *config.Config,
	registry *providers.Registry,
	rt *router.DefaultRouter,
	pool *Pool,
	cacheOrch *cache.Orchestrator,
	health *providers.HealthChecker,
	metrics *observe.Metrics,
	costCalc *observe.CostCalculator,
	budgetMgr *budget.Manager,
	budgetTracker *budget.Tracker,
	st store.Store,
) *Engine {
	return &Engine{
		cfg:           cfg,
		registry:      registry,
		router:        rt,
		pool:          pool,
		stream:        NewStreamProxy(pool),
		cache:         cacheOrch,
		health:        health,
		metrics:       metrics,
		costCalc:      costCalc,
		budgetMgr:     budgetMgr,
		budgetTracker: budgetTracker,
		store:         st,
	}
}

// HandleChatCompletions handles POST /v1/chat/completions.
func (e *Engine) HandleChatCompletions(w http.ResponseWriter, r *http.Request) {
	e.handleProxy(w, r, "chat_completions")
}

// HandleCompletions handles POST /v1/completions.
func (e *Engine) HandleCompletions(w http.ResponseWriter, r *http.Request) {
	e.handleProxy(w, r, "completions")
}

// HandleEmbeddings handles POST /v1/embeddings.
func (e *Engine) HandleEmbeddings(w http.ResponseWriter, r *http.Request) {
	e.handleProxy(w, r, "embeddings")
}

// HandleModels handles GET /v1/models.
func (e *Engine) HandleModels(w http.ResponseWriter, r *http.Request) {
	models := e.registry.ListModels()
	resp := types.ModelListResponse{
		Object: "list",
		Data:   models,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp) //nolint:errcheck
}

// handleProxy is the core proxy logic shared across endpoints.
func (e *Engine) handleProxy(w http.ResponseWriter, r *http.Request, endpoint string) {
	ctx := r.Context()
	startTime := time.Now()

	// Read request body.
	body, err := io.ReadAll(r.Body)
	if err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	defer r.Body.Close()

	// Parse the request.
	proxyReq := &types.ProxyRequest{
		Body:     body,
		Endpoint: endpoint,
		KeyID:    auth.GetKeyID(ctx),
		OrgID:    auth.GetOrgID(ctx),
		TeamID:   auth.GetTeamID(ctx),
		UserID:   auth.GetUserID(ctx),
	}

	// Parse request based on endpoint.
	switch endpoint {
	case "chat_completions":
		var chatReq types.ChatCompletionRequest
		if err := json.Unmarshal(body, &chatReq); err != nil {
			types.ErrBadRequest.WriteJSON(w)
			return
		}
		proxyReq.ChatRequest = &chatReq
		proxyReq.OriginalModel = chatReq.Model
		proxyReq.Stream = chatReq.Stream
	case "completions":
		var compReq types.CompletionRequest
		if err := json.Unmarshal(body, &compReq); err != nil {
			types.ErrBadRequest.WriteJSON(w)
			return
		}
		proxyReq.CompletionRequest = &compReq
		proxyReq.OriginalModel = compReq.Model
		proxyReq.Stream = compReq.Stream
	case "embeddings":
		var embReq types.EmbeddingRequest
		if err := json.Unmarshal(body, &embReq); err != nil {
			types.ErrBadRequest.WriteJSON(w)
			return
		}
		proxyReq.EmbeddingRequest = &embReq
		proxyReq.OriginalModel = embReq.Model
	}

	// Route the request.
	decision, err := e.router.Route(ctx, proxyReq)
	if err != nil {
		slog.Error("routing failed", "error", err, "model", proxyReq.OriginalModel)
		types.ErrProviderUnavailable.WriteJSON(w)
		return
	}

	proxyReq.Provider = decision.Provider
	proxyReq.Model = decision.Model

	// Budget check.
	if e.budgetMgr != nil {
		budgetResult, err := e.budgetMgr.Check(ctx, proxyReq.KeyID, proxyReq.UserID, proxyReq.TeamID, proxyReq.OrgID)
		if err != nil {
			slog.Error("budget check failed", "error", err)
		} else if budgetResult != nil && !budgetResult.Allowed {
			types.ErrBudgetExceeded.WriteJSON(w)
			return
		}
	}

	// Cache check (non-streaming only).
	if !proxyReq.Stream && e.cache != nil {
		cacheKey := cache.BuildCacheKey(proxyReq)
		cached, err := e.cache.Get(ctx, cacheKey)
		if err == nil && cached != nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Raven-Cache", "hit")
			w.WriteHeader(http.StatusOK)
			w.Write(cached.Response) //nolint:errcheck

			e.recordMetrics(proxyReq, http.StatusOK, startTime, cached.Usage, true)
			return
		}
	}

	// Get adapter.
	adapter, ok := e.registry.GetAdapter(proxyReq.Provider)
	if !ok {
		slog.Error("adapter not found", "provider", proxyReq.Provider)
		types.ErrProviderUnavailable.WriteJSON(w)
		return
	}

	// Get API key for provider.
	apiKey := e.getProviderAPIKey(proxyReq.Provider)

	// Transform request.
	upstreamReq, err := adapter.TransformRequest(proxyReq)
	if err != nil {
		slog.Error("request transformation failed", "error", err, "provider", proxyReq.Provider)
		types.ErrInternal.WriteJSON(w)
		return
	}

	// Add auth headers.
	for k, v := range adapter.AuthHeaders(apiKey) {
		upstreamReq.Header.Set(k, v)
	}

	// Set request context.
	upstreamReq = upstreamReq.WithContext(ctx)

	// Send the request.
	var client *http.Client
	if proxyReq.Stream {
		client = e.pool.GetStreamClient(proxyReq.Provider)
	} else {
		client = e.pool.GetClient(proxyReq.Provider)
	}

	upstreamResp, err := client.Do(upstreamReq)
	if err != nil {
		slog.Error("upstream request failed", "error", err, "provider", proxyReq.Provider)
		e.health.RecordError(proxyReq.Provider)
		types.ErrProviderUnavailable.WriteJSON(w)
		return
	}

	e.health.RecordSuccess(proxyReq.Provider)

	// Handle streaming responses.
	if proxyReq.Stream && upstreamResp.StatusCode == http.StatusOK {
		if err := e.stream.ProxyStream(w, upstreamResp, adapter); err != nil {
			slog.Error("stream proxy failed", "error", err)
		}
		e.recordMetrics(proxyReq, http.StatusOK, startTime, nil, false)
		return
	}

	defer upstreamResp.Body.Close()

	// Transform response.
	proxyResp, err := adapter.TransformResponse(upstreamResp)
	if err != nil {
		slog.Error("response transformation failed", "error", err, "provider", proxyReq.Provider)
		types.ErrInternal.WriteJSON(w)
		return
	}

	// Cache successful non-streaming responses.
	if !proxyReq.Stream && proxyResp.StatusCode == http.StatusOK && e.cache != nil {
		cacheKey := cache.BuildCacheKey(proxyReq)
		cacheEntry := &cache.CacheEntry{
			Response:  proxyResp.Body,
			Usage:     proxyResp.Usage,
			CreatedAt: time.Now(),
		}
		if err := e.cache.Set(ctx, cacheKey, cacheEntry, e.cfg.Cache.Exact.TTL); err != nil {
			slog.Warn("cache set failed", "error", err)
		}
	}

	// Track spend.
	if proxyResp.Usage != nil && e.budgetTracker != nil {
		cost := e.costCalc.Calculate(proxyReq.Provider, proxyReq.Model, proxyResp.Usage)
		if cost > 0 {
			if err := e.budgetTracker.RecordSpend(ctx, proxyReq.KeyID, proxyReq.UserID, proxyReq.TeamID, proxyReq.OrgID, cost); err != nil {
				slog.Error("spend tracking failed", "error", err)
			}
		}
	}

	// Write response.
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Raven-Cache", "miss")
	w.Header().Set("X-Raven-Provider", proxyReq.Provider)
	w.WriteHeader(proxyResp.StatusCode)
	w.Write(proxyResp.Body) //nolint:errcheck

	e.recordMetrics(proxyReq, proxyResp.StatusCode, startTime, proxyResp.Usage, false)
}

// getProviderAPIKey returns the API key for a provider from config.
func (e *Engine) getProviderAPIKey(provider string) string {
	if p, ok := e.cfg.Providers[provider]; ok {
		return p.APIKey
	}
	return ""
}

// recordMetrics records request metrics.
func (e *Engine) recordMetrics(req *types.ProxyRequest, statusCode int, startTime time.Time, usage *types.Usage, cacheHit bool) {
	duration := time.Since(startTime)
	status := strconv.Itoa(statusCode)

	var inputTokens, outputTokens int
	var cost float64
	if usage != nil {
		inputTokens = usage.PromptTokens
		outputTokens = usage.CompletionTokens
		cost = e.costCalc.Calculate(req.Provider, req.Model, usage)
	}

	e.metrics.RecordRequest(req.Provider, req.Model, status, req.Endpoint,
		duration.Seconds(), 0, inputTokens, outputTokens, cost)

	// Log the request.
	logEntry := &observe.RequestLogEntry{
		RequestID:    getRequestID(req),
		Method:       "POST",
		Path:         "/v1/" + strings.ReplaceAll(req.Endpoint, "_", "/"),
		Provider:     req.Provider,
		Model:        req.Model,
		StatusCode:   statusCode,
		Duration:     duration,
		InputTokens:  inputTokens,
		OutputTokens: outputTokens,
		Cost:         cost,
		CacheHit:     cacheHit,
		Stream:       req.Stream,
		KeyID:        req.KeyID,
		OrgID:        req.OrgID,
	}
	observe.LogRequest(logEntry)

	// Store the log entry.
	if e.store != nil {
		storeLog := &store.RequestLog{
			ID:           fmt.Sprintf("log_%d", time.Now().UnixNano()),
			KeyID:        req.KeyID,
			OrgID:        req.OrgID,
			TeamID:       req.TeamID,
			UserID:       req.UserID,
			Provider:     req.Provider,
			Model:        req.Model,
			Endpoint:     req.Endpoint,
			Method:       "POST",
			StatusCode:   statusCode,
			InputTokens:  inputTokens,
			OutputTokens: outputTokens,
			Cost:         cost,
			LatencyMs:    duration.Milliseconds(),
			Stream:       req.Stream,
			CacheHit:     cacheHit,
		}
		if err := e.store.CreateLog(context.Background(), storeLog); err != nil {
			slog.Warn("failed to store request log", "error", err)
		}
	}
}

// getRequestID extracts the request ID from metadata.
func getRequestID(req *types.ProxyRequest) string {
	if req.Metadata != nil {
		if id, ok := req.Metadata["request_id"]; ok {
			return id
		}
	}
	return ""
}
