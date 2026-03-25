package auditlogs

import (
	"encoding/json"
	"net/http"
	"strconv"

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
	r.Get("/", h.list)
	return r
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
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

	var totalCount int64
	err := h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM audit_logs").Scan(&totalCount)
	if err != nil {
		logger.Error("failed to count audit logs", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, action, actor_id, actor_type, target_id, target_type, metadata, ip_address, created_at
		 FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		logger.Error("failed to list audit logs", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var logs []map[string]any
	for rows.Next() {
		var id, action string
		var actorID, actorType, targetID, targetType, ipAddress *string
		var metadata *json.RawMessage
		var createdAt any
		if err := rows.Scan(&id, &action, &actorID, &actorType, &targetID, &targetType, &metadata, &ipAddress, &createdAt); err != nil {
			logger.Error("failed to scan audit log", err)
			continue
		}
		entry := map[string]any{
			"id":        id,
			"action":    action,
			"createdAt": createdAt,
		}
		if actorID != nil {
			entry["actorId"] = *actorID
		}
		if actorType != nil {
			entry["actorType"] = *actorType
		}
		if targetID != nil {
			entry["targetId"] = *targetID
		}
		if targetType != nil {
			entry["targetType"] = *targetType
		}
		if metadata != nil {
			entry["metadata"] = metadata
		}
		if ipAddress != nil {
			entry["ipAddress"] = *ipAddress
		}
		logs = append(logs, entry)
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

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}
