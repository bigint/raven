package user

import (
	"encoding/json"
	"net/http"

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
	r.Get("/", h.getProfile)
	return r
}

func (h *Handler) getProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("userId")
	if userID == nil {
		apperrors.Unauthorized().WriteJSON(w, r.URL.Path)
		return
	}

	var id, name, email, role string
	var image *string
	var createdAt any

	err := h.pool.QueryRow(r.Context(),
		"SELECT id, name, email, role, image, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&id, &name, &email, &role, &image, &createdAt)
	if err != nil {
		logger.Error("failed to get user profile", err)
		apperrors.NotFound("User not found").WriteJSON(w, r.URL.Path)
		return
	}

	result := map[string]any{
		"id":        id,
		"name":      name,
		"email":     email,
		"role":      role,
		"createdAt": createdAt,
	}
	if image != nil {
		result["image"] = *image
	}

	writeJSON(w, http.StatusOK, result)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}
