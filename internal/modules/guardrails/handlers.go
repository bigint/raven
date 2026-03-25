package guardrails

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
	Name      string          `json:"name"`
	Type      string          `json:"type"`
	Action    string          `json:"action"`
	Config    json.RawMessage `json:"config"`
	Priority  int             `json:"priority"`
	IsEnabled bool            `json:"isEnabled"`
}

type updateRequest struct {
	Name      *string          `json:"name"`
	Type      *string          `json:"type"`
	Action    *string          `json:"action"`
	Config    *json.RawMessage `json:"config"`
	Priority  *int             `json:"priority"`
	IsEnabled *bool            `json:"isEnabled"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Name == "" || req.Type == "" || req.Action == "" {
		apperrors.Validation("name, type, and action are required").WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()

	var retID, name, ruleType, action string
	var config json.RawMessage
	var priority int
	var isEnabled bool
	var createdAt any

	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO guardrail_rules (id, name, type, action, config, priority, is_enabled)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, name, type, action, config, priority, is_enabled, created_at`,
		id, req.Name, req.Type, req.Action, req.Config, req.Priority, req.IsEnabled,
	).Scan(&retID, &name, &ruleType, &action, &config, &priority, &isEnabled, &createdAt)
	if err != nil {
		logger.Error("failed to create guardrail rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        retID,
		"name":      name,
		"type":      ruleType,
		"action":    action,
		"config":    config,
		"priority":  priority,
		"isEnabled": isEnabled,
		"createdAt": createdAt,
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, type, action, config, priority, is_enabled, created_at
		 FROM guardrail_rules ORDER BY priority ASC`)
	if err != nil {
		logger.Error("failed to list guardrail rules", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var rules []map[string]any
	for rows.Next() {
		var id, name, ruleType, action string
		var config json.RawMessage
		var priority int
		var isEnabled bool
		var createdAt any
		if err := rows.Scan(&id, &name, &ruleType, &action, &config, &priority, &isEnabled, &createdAt); err != nil {
			logger.Error("failed to scan guardrail rule", err)
			continue
		}
		rules = append(rules, map[string]any{
			"id":        id,
			"name":      name,
			"type":      ruleType,
			"action":    action,
			"config":    config,
			"priority":  priority,
			"isEnabled": isEnabled,
			"createdAt": createdAt,
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
		`UPDATE guardrail_rules SET
			name = COALESCE($2, name),
			type = COALESCE($3, type),
			action = COALESCE($4, action),
			config = COALESCE($5, config),
			priority = COALESCE($6, priority),
			is_enabled = COALESCE($7, is_enabled)
		 WHERE id = $1`,
		id, req.Name, req.Type, req.Action, req.Config, req.Priority, req.IsEnabled,
	)
	if err != nil {
		logger.Error("failed to update guardrail rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Guardrail rule not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM guardrail_rules WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete guardrail rule", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Guardrail rule not found").WriteJSON(w, r.URL.Path)
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
