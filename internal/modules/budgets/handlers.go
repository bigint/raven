package budgets

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"

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
	r.Post("/", h.create)
	r.Get("/", h.list)
	r.Patch("/{id}", h.update)
	r.Delete("/{id}", h.delete)
	return r
}

type createRequest struct {
	EntityType     string  `json:"entityType"`
	EntityID       string  `json:"entityId"`
	LimitAmount    float64 `json:"limitAmount"`
	Period         string  `json:"period"`
	AlertThreshold float64 `json:"alertThreshold"`
}

type updateRequest struct {
	LimitAmount    *float64 `json:"limitAmount"`
	AlertThreshold *float64 `json:"alertThreshold"`
	Period         *string  `json:"period"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.EntityType == "" || req.EntityID == "" || req.LimitAmount <= 0 || req.Period == "" {
		apperrors.Validation("entityType, entityId, limitAmount, and period are required").WriteJSON(w, r.URL.Path)
		return
	}

	id := cuid2.Generate()

	var result map[string]any
	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO budgets (id, entity_type, entity_id, limit_amount, alert_threshold, period)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, entity_type, entity_id, limit_amount, alert_threshold, period, created_at`,
		id, req.EntityType, req.EntityID, req.LimitAmount, req.AlertThreshold, req.Period,
	).Scan(&result)
	if err != nil {
		// Fall back to a simpler scan
		var retID, entityType, entityID, period string
		var limitAmount, alertThreshold float64
		var createdAt any
		err = h.pool.QueryRow(r.Context(),
			`INSERT INTO budgets (id, entity_type, entity_id, limit_amount, alert_threshold, period)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id, entity_type, entity_id, limit_amount, alert_threshold, period, created_at`,
			id, req.EntityType, req.EntityID, req.LimitAmount, req.AlertThreshold, req.Period,
		).Scan(&retID, &entityType, &entityID, &limitAmount, &alertThreshold, &period, &createdAt)
		if err != nil {
			logger.Error("failed to create budget", err)
			apperrors.Internal().WriteJSON(w, r.URL.Path)
			return
		}
		result = map[string]any{
			"id":             retID,
			"entityType":     entityType,
			"entityId":       entityID,
			"limitAmount":    limitAmount,
			"alertThreshold": alertThreshold,
			"period":         period,
			"createdAt":      createdAt,
		}
	}

	writeJSON(w, http.StatusCreated, result)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, entity_type, entity_id, limit_amount, alert_threshold, period, created_at
		 FROM budgets ORDER BY created_at DESC`)
	if err != nil {
		logger.Error("failed to list budgets", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var budgets []map[string]any
	for rows.Next() {
		var id, entityType, entityID, period string
		var limitAmount, alertThreshold float64
		var createdAt any
		if err := rows.Scan(&id, &entityType, &entityID, &limitAmount, &alertThreshold, &period, &createdAt); err != nil {
			logger.Error("failed to scan budget", err)
			continue
		}
		budgets = append(budgets, map[string]any{
			"id":             id,
			"entityType":     entityType,
			"entityId":       entityID,
			"limitAmount":    limitAmount,
			"alertThreshold": alertThreshold,
			"period":         period,
			"createdAt":      createdAt,
		})
	}

	if budgets == nil {
		budgets = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, budgets)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE budgets SET
			limit_amount = COALESCE($2, limit_amount),
			alert_threshold = COALESCE($3, alert_threshold),
			period = COALESCE($4, period)
		 WHERE id = $1`,
		id, req.LimitAmount, req.AlertThreshold, req.Period,
	)
	if err != nil {
		logger.Error("failed to update budget", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Budget not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM budgets WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete budget", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Budget not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "deleted": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
