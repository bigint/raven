package invitations

import (
	"encoding/json"
	"net/http"
	"time"

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
	r.Get("/{token}", h.validate)
	r.Post("/{token}/accept", h.accept)
	return r
}

func (h *Handler) validate(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var id, email, role string
	var expiresAt time.Time
	var acceptedAt *time.Time

	err := h.pool.QueryRow(r.Context(),
		"SELECT id, email, role, expires_at, accepted_at FROM invitations WHERE token = $1",
		token,
	).Scan(&id, &email, &role, &expiresAt, &acceptedAt)
	if err != nil {
		apperrors.NotFound("Invitation not found").WriteJSON(w, r.URL.Path)
		return
	}

	if acceptedAt != nil {
		apperrors.Conflict("Invitation has already been accepted").WriteJSON(w, r.URL.Path)
		return
	}

	if time.Now().After(expiresAt) {
		apperrors.Validation("Invitation has expired").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"id":        id,
		"email":     email,
		"role":      role,
		"expiresAt": expiresAt,
		"valid":     true,
	})
}

type acceptRequest struct {
	Name string `json:"name"`
}

func (h *Handler) accept(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")

	var invID, email, role string
	var expiresAt time.Time
	var acceptedAt *time.Time

	err := h.pool.QueryRow(r.Context(),
		"SELECT id, email, role, expires_at, accepted_at FROM invitations WHERE token = $1",
		token,
	).Scan(&invID, &email, &role, &expiresAt, &acceptedAt)
	if err != nil {
		apperrors.NotFound("Invitation not found").WriteJSON(w, r.URL.Path)
		return
	}

	if acceptedAt != nil {
		apperrors.Conflict("Invitation has already been accepted").WriteJSON(w, r.URL.Path)
		return
	}

	if time.Now().After(expiresAt) {
		apperrors.Validation("Invitation has expired").WriteJSON(w, r.URL.Path)
		return
	}

	var req acceptRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Name == "" {
		req.Name = email
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		logger.Error("failed to begin transaction", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer tx.Rollback(r.Context())

	userID, _ := cuid2.Generate()

	_, err = tx.Exec(r.Context(),
		"INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)",
		userID, req.Name, email, role,
	)
	if err != nil {
		logger.Error("failed to create user from invitation", err)
		apperrors.Conflict("User with this email already exists").WriteJSON(w, r.URL.Path)
		return
	}

	now := time.Now()
	_, err = tx.Exec(r.Context(),
		"UPDATE invitations SET accepted_at = $2 WHERE id = $1",
		invID, now,
	)
	if err != nil {
		logger.Error("failed to mark invitation as accepted", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		logger.Error("failed to commit invitation acceptance", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":    userID,
		"name":  req.Name,
		"email": email,
		"role":  role,
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
