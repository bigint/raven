package routingrules

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
	Name           string `json:"name"`
	SourceModel    string `json:"sourceModel"`
	TargetModel    string `json:"targetModel"`
	Condition      string `json:"condition"`
	ConditionValue string `json:"conditionValue"`
	Priority       int    `json:"priority"`
	IsEnabled      bool   `json:"isEnabled"`
}

type updateRequest struct {
	Name           *string `json:"name"`
	SourceModel    *string `json:"sourceModel"`
	TargetModel    *string `json:"targetModel"`
	Condition      *string `json:"condition"`
	ConditionValue *string `json:"conditionValue"`
	Priority       *int    `json:"priority"`
	IsEnabled      *bool   `json:"isEnabled"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Name == "" || req.SourceModel == "" || req.TargetModel == "" {
		apperrors.Validation("name, sourceModel, and targetModel are required").WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()

	var retID, name, sourceModel, targetModel, condition, conditionValue string
	var priority int
	var isEnabled bool
	var createdAt any

	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO routing_rules (id, name, source_model, target_model, condition, condition_value, priority, is_enabled)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, name, source_model, target_model, condition, condition_value, priority, is_enabled, created_at`,
		id, req.Name, req.SourceModel, req.TargetModel, req.Condition, req.ConditionValue, req.Priority, req.IsEnabled,
	).Scan(&retID, &name, &sourceModel, &targetModel, &condition, &conditionValue, &priority, &isEnabled, &createdAt)
	if err != nil {
		logger.Error("failed to create routing rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":             retID,
		"name":           name,
		"sourceModel":    sourceModel,
		"targetModel":    targetModel,
		"condition":      condition,
		"conditionValue": conditionValue,
		"priority":       priority,
		"isEnabled":      isEnabled,
		"createdAt":      createdAt,
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, source_model, target_model, condition, condition_value, priority, is_enabled, created_at
		 FROM routing_rules ORDER BY priority ASC`)
	if err != nil {
		logger.Error("failed to list routing rules", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var rules []map[string]any
	for rows.Next() {
		var id, name, sourceModel, targetModel, condition, conditionValue string
		var priority int
		var isEnabled bool
		var createdAt any
		if err := rows.Scan(&id, &name, &sourceModel, &targetModel, &condition, &conditionValue, &priority, &isEnabled, &createdAt); err != nil {
			logger.Error("failed to scan routing rule", err)
			continue
		}
		rules = append(rules, map[string]any{
			"id":             id,
			"name":           name,
			"sourceModel":    sourceModel,
			"targetModel":    targetModel,
			"condition":      condition,
			"conditionValue": conditionValue,
			"priority":       priority,
			"isEnabled":      isEnabled,
			"createdAt":      createdAt,
		})
	}

	if rules == nil {
		rules = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, rules)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE routing_rules SET
			name = COALESCE($2, name),
			source_model = COALESCE($3, source_model),
			target_model = COALESCE($4, target_model),
			condition = COALESCE($5, condition),
			condition_value = COALESCE($6, condition_value),
			priority = COALESCE($7, priority),
			is_enabled = COALESCE($8, is_enabled)
		 WHERE id = $1`,
		id, req.Name, req.SourceModel, req.TargetModel, req.Condition, req.ConditionValue, req.Priority, req.IsEnabled,
	)
	if err != nil {
		logger.Error("failed to update routing rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Routing rule not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM routing_rules WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete routing rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Routing rule not found").WriteJSON(w, r.URL.Path)
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
