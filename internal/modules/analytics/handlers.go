package analytics

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

type Handler struct {
	pool *pgxpool.Pool
}

func NewHandler(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/stats", h.stats)
	r.Get("/usage", h.usage)
	r.Get("/requests", h.requests)
	r.Get("/models", h.models)
	r.Get("/sessions", h.sessions)
	r.Get("/logs/{id}", h.logDetail)
	r.Post("/star/{id}", h.toggleStar)
	return r
}

func parseDateRange(r *http.Request) (time.Time, time.Time) {
	now := time.Now().UTC()
	from := now.AddDate(0, 0, -30)
	to := now

	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		} else if t, err := time.Parse("2006-01-02", v); err == nil {
			from = t
		}
	}

	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		} else if t, err := time.Parse("2006-01-02", v); err == nil {
			to = t.Add(24*time.Hour - time.Second)
		}
	}

	return from, to
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	from, to := parseDateRange(r)

	var totalRequests int64
	var totalInputTokens, totalOutputTokens int64
	var totalCost float64
	var avgLatency float64
	var cacheHits, cacheMisses int64

	err := h.pool.QueryRow(r.Context(),
		`SELECT
			COUNT(*),
			COALESCE(SUM(input_tokens), 0),
			COALESCE(SUM(output_tokens), 0),
			COALESCE(SUM(cost), 0),
			COALESCE(AVG(latency), 0),
			COALESCE(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END), 0)
		 FROM request_logs
		 WHERE created_at >= $1 AND created_at <= $2`,
		from, to,
	).Scan(&totalRequests, &totalInputTokens, &totalOutputTokens, &totalCost, &avgLatency, &cacheHits, &cacheMisses)
	if err != nil {
		logger.Error("failed to query stats", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	cacheHitRate := 0.0
	if cacheHits+cacheMisses > 0 {
		cacheHitRate = math.Round(float64(cacheHits)/float64(cacheHits+cacheMisses)*10000) / 100
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"totalRequests":   totalRequests,
		"totalInputTokens":  totalInputTokens,
		"totalOutputTokens": totalOutputTokens,
		"totalCost":       totalCost,
		"avgLatency":      avgLatency,
		"cacheHitRate":    cacheHitRate,
	})
}

func (h *Handler) usage(w http.ResponseWriter, r *http.Request) {
	from, to := parseDateRange(r)
	groupBy := r.URL.Query().Get("groupBy")
	if groupBy == "" {
		groupBy = "day"
	}

	truncExpr := "day"
	if groupBy == "hour" {
		truncExpr = "hour"
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT
			date_trunc('`+truncExpr+`', created_at) AS period,
			COUNT(*) AS requests,
			COALESCE(SUM(input_tokens), 0) AS input_tokens,
			COALESCE(SUM(output_tokens), 0) AS output_tokens,
			COALESCE(SUM(cost), 0) AS cost
		 FROM request_logs
		 WHERE created_at >= $1 AND created_at <= $2
		 GROUP BY period
		 ORDER BY period ASC`,
		from, to,
	)
	if err != nil {
		logger.Error("failed to query usage", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var usage []map[string]any
	for rows.Next() {
		var period time.Time
		var requests, inputTokens, outputTokens int64
		var cost float64
		if err := rows.Scan(&period, &requests, &inputTokens, &outputTokens, &cost); err != nil {
			logger.Error("failed to scan usage row", err)
			continue
		}
		usage = append(usage, map[string]any{
			"period":       period,
			"requests":     requests,
			"inputTokens":  inputTokens,
			"outputTokens": outputTokens,
			"cost":         cost,
		})
	}

	if usage == nil {
		usage = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, usage)
}

func (h *Handler) requests(w http.ResponseWriter, r *http.Request) {
	from, to := parseDateRange(r)
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	model := q.Get("model")
	status := q.Get("status")
	starred := q.Get("starred")

	query := `SELECT id, model, provider, input_tokens, output_tokens, cost, latency,
		 status, cache_hit, is_starred, created_at
		 FROM request_logs WHERE created_at >= $1 AND created_at <= $2`
	countQuery := `SELECT COUNT(*) FROM request_logs WHERE created_at >= $1 AND created_at <= $2`
	args := []any{from, to}
	argIdx := 3

	if model != "" {
		query += ` AND model = $` + strconv.Itoa(argIdx)
		countQuery += ` AND model = $` + strconv.Itoa(argIdx)
		args = append(args, model)
		argIdx++
	}
	if status != "" {
		statusInt, _ := strconv.Atoi(status)
		query += ` AND status = $` + strconv.Itoa(argIdx)
		countQuery += ` AND status = $` + strconv.Itoa(argIdx)
		args = append(args, statusInt)
		argIdx++
	}
	if starred == "true" {
		query += ` AND is_starred = true`
		countQuery += ` AND is_starred = true`
	}

	var totalCount int64
	err := h.pool.QueryRow(r.Context(), countQuery, args...).Scan(&totalCount)
	if err != nil {
		logger.Error("failed to count requests", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	query += ` ORDER BY created_at DESC LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := h.pool.Query(r.Context(), query, args...)
	if err != nil {
		logger.Error("failed to query requests", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var logs []map[string]any
	for rows.Next() {
		var id, rModel, provider string
		var inputTokens, outputTokens, rStatus int64
		var cost, latency float64
		var cacheHit, isStarred bool
		var createdAt any
		if err := rows.Scan(&id, &rModel, &provider, &inputTokens, &outputTokens, &cost, &latency, &rStatus, &cacheHit, &isStarred, &createdAt); err != nil {
			logger.Error("failed to scan request log", err)
			continue
		}
		logs = append(logs, map[string]any{
			"id":           id,
			"model":        rModel,
			"provider":     provider,
			"inputTokens":  inputTokens,
			"outputTokens": outputTokens,
			"cost":         cost,
			"latency":      latency,
			"status":       rStatus,
			"cacheHit":     cacheHit,
			"isStarred":    isStarred,
			"createdAt":    createdAt,
		})
	}

	if logs == nil {
		logs = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"logs":       logs,
		"totalCount": totalCount,
		"page":       page,
		"limit":      limit,
	})
}

func (h *Handler) models(w http.ResponseWriter, r *http.Request) {
	from, to := parseDateRange(r)

	rows, err := h.pool.Query(r.Context(),
		`SELECT model, provider,
			COUNT(*) AS requests,
			COALESCE(SUM(input_tokens), 0) AS input_tokens,
			COALESCE(SUM(output_tokens), 0) AS output_tokens,
			COALESCE(SUM(cost), 0) AS cost,
			COALESCE(AVG(latency), 0) AS avg_latency
		 FROM request_logs
		 WHERE created_at >= $1 AND created_at <= $2
		 GROUP BY model, provider
		 ORDER BY requests DESC`,
		from, to,
	)
	if err != nil {
		logger.Error("failed to query model usage", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var models []map[string]any
	for rows.Next() {
		var model, provider string
		var requests, inputTokens, outputTokens int64
		var cost, avgLatency float64
		if err := rows.Scan(&model, &provider, &requests, &inputTokens, &outputTokens, &cost, &avgLatency); err != nil {
			logger.Error("failed to scan model usage", err)
			continue
		}
		models = append(models, map[string]any{
			"model":        model,
			"provider":     provider,
			"requests":     requests,
			"inputTokens":  inputTokens,
			"outputTokens": outputTokens,
			"cost":         cost,
			"avgLatency":   avgLatency,
		})
	}

	if models == nil {
		models = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, models)
}

func (h *Handler) sessions(w http.ResponseWriter, r *http.Request) {
	from, to := parseDateRange(r)

	rows, err := h.pool.Query(r.Context(),
		`SELECT session_id, MIN(created_at) AS started_at, MAX(created_at) AS last_activity,
			COUNT(*) AS requests, COALESCE(SUM(cost), 0) AS total_cost
		 FROM request_logs
		 WHERE session_id IS NOT NULL AND created_at >= $1 AND created_at <= $2
		 GROUP BY session_id
		 ORDER BY last_activity DESC`,
		from, to,
	)
	if err != nil {
		logger.Error("failed to query sessions", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var sessions []map[string]any
	for rows.Next() {
		var sessionID string
		var startedAt, lastActivity any
		var requests int64
		var totalCost float64
		if err := rows.Scan(&sessionID, &startedAt, &lastActivity, &requests, &totalCost); err != nil {
			logger.Error("failed to scan session", err)
			continue
		}
		sessions = append(sessions, map[string]any{
			"sessionId":    sessionID,
			"startedAt":    startedAt,
			"lastActivity": lastActivity,
			"requests":     requests,
			"totalCost":    totalCost,
		})
	}

	if sessions == nil {
		sessions = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, sessions)
}

func (h *Handler) logDetail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var logID, model, provider string
	var inputTokens, outputTokens, status int64
	var cost, latency float64
	var cacheHit, isStarred bool
	var requestBody, responseBody, metadata, errorMsg *string
	var sessionID *string
	var virtualKeyID *string
	var createdAt any

	err := h.pool.QueryRow(r.Context(),
		`SELECT id, model, provider, input_tokens, output_tokens, cost, latency,
			status, cache_hit, is_starred, request_body, response_body, metadata, error,
			session_id, virtual_key_id, created_at
		 FROM request_logs WHERE id = $1`,
		id,
	).Scan(&logID, &model, &provider, &inputTokens, &outputTokens, &cost, &latency,
		&status, &cacheHit, &isStarred, &requestBody, &responseBody, &metadata, &errorMsg,
		&sessionID, &virtualKeyID, &createdAt)
	if err != nil {
		apperrors.NotFound("Request log not found").WriteJSON(w, r.URL.Path)
		return
	}

	result := map[string]any{
		"id":           logID,
		"model":        model,
		"provider":     provider,
		"inputTokens":  inputTokens,
		"outputTokens": outputTokens,
		"cost":         cost,
		"latency":      latency,
		"status":       status,
		"cacheHit":     cacheHit,
		"isStarred":    isStarred,
		"createdAt":    createdAt,
	}

	if requestBody != nil {
		result["requestBody"] = json.RawMessage(*requestBody)
	}
	if responseBody != nil {
		result["responseBody"] = json.RawMessage(*responseBody)
	}
	if metadata != nil {
		result["metadata"] = json.RawMessage(*metadata)
	}
	if errorMsg != nil {
		result["error"] = *errorMsg
	}
	if sessionID != nil {
		result["sessionId"] = *sessionID
	}
	if virtualKeyID != nil {
		result["virtualKeyId"] = *virtualKeyID
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) toggleStar(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE request_logs SET is_starred = NOT is_starred WHERE id = $1`,
		id,
	)
	if err != nil {
		logger.Error("failed to toggle star", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Request log not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "toggled": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
