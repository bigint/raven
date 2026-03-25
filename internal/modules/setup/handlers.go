package setup

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
	r.Get("/status", h.status)
	r.Post("/complete", h.complete)
	return r
}

func (h *Handler) status(w http.ResponseWriter, r *http.Request) {
	var count int64
	err := h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		logger.Error("failed to check setup status", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"needsSetup": count == 0,
	})
}

type completeRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func (h *Handler) complete(w http.ResponseWriter, r *http.Request) {
	// Check if any users already exist
	var count int64
	err := h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		logger.Error("failed to check user count", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if count > 0 {
		apperrors.Conflict("Setup has already been completed").WriteJSON(w, r.URL.Path)
		return
	}

	var req completeRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Name == "" || req.Email == "" {
		apperrors.Validation("name and email are required").WriteJSON(w, r.URL.Path)
		return
	}

	id := cuid2.Generate()

	var retID, name, email, role string
	var createdAt any

	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO users (id, name, email, role)
		 VALUES ($1, $2, $3, 'admin')
		 RETURNING id, name, email, role, created_at`,
		id, req.Name, req.Email,
	).Scan(&retID, &name, &email, &role, &createdAt)
	if err != nil {
		logger.Error("failed to create admin user", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        retID,
		"name":      name,
		"email":     email,
		"role":      role,
		"createdAt": createdAt,
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
