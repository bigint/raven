package admin

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"
	"github.com/redis/go-redis/v9"

	apperrors "github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

type Handler struct {
	pool *pgxpool.Pool
	rdb  *redis.Client
}

func NewHandler(pool *pgxpool.Pool, rdb *redis.Client) *Handler {
	return &Handler{pool: pool, rdb: rdb}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/stats", h.stats)
	r.Get("/users", h.listUsers)
	r.Patch("/users/{id}", h.updateUser)
	r.Delete("/users/{id}", h.deleteUser)
	r.Get("/invitations", h.listInvitations)
	r.Post("/invitations", h.createInvitation)
	r.Delete("/invitations/{id}", h.deleteInvitation)
	r.Get("/audit-logs", h.auditLogs)
	r.Get("/settings", h.getSettings)
	r.Put("/settings", h.updateSettings)
	return r
}

func (h *Handler) stats(w http.ResponseWriter, r *http.Request) {
	var userCount, providerCount, keyCount int64

	err := h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM users").Scan(&userCount)
	if err != nil {
		logger.Error("failed to count users", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	err = h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM provider_configs").Scan(&providerCount)
	if err != nil {
		logger.Error("failed to count providers", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	err = h.pool.QueryRow(r.Context(), "SELECT COUNT(*) FROM virtual_keys").Scan(&keyCount)
	if err != nil {
		logger.Error("failed to count keys", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"userCount":     userCount,
		"providerCount": providerCount,
		"keyCount":      keyCount,
	})
}

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, email, role, image, created_at
		 FROM users ORDER BY created_at DESC`)
	if err != nil {
		logger.Error("failed to list users", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var users []map[string]any
	for rows.Next() {
		var id, name, email, role string
		var image *string
		var createdAt any
		if err := rows.Scan(&id, &name, &email, &role, &image, &createdAt); err != nil {
			logger.Error("failed to scan user", err)
			continue
		}
		u := map[string]any{
			"id":        id,
			"name":      name,
			"email":     email,
			"role":      role,
			"createdAt": createdAt,
		}
		if image != nil {
			u["image"] = *image
		}
		users = append(users, u)
	}

	if users == nil {
		users = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, users)
}

type updateUserRequest struct {
	Role *string `json:"role"`
}

func (h *Handler) updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateUserRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Role == nil {
		apperrors.Validation("role is required").WriteJSON(w, r.URL.Path)
		return
	}

	tag, err := h.pool.Exec(r.Context(),
		"UPDATE users SET role = $2 WHERE id = $1",
		id, *req.Role,
	)
	if err != nil {
		logger.Error("failed to update user role", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("User not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM users WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete user", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("User not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "deleted": true})
}

func (h *Handler) listInvitations(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, email, role, token, expires_at, accepted_at, created_at
		 FROM invitations ORDER BY created_at DESC`)
	if err != nil {
		logger.Error("failed to list invitations", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var invitations []map[string]any
	for rows.Next() {
		var id, email, role, token string
		var expiresAt any
		var acceptedAt, createdAt any
		if err := rows.Scan(&id, &email, &role, &token, &expiresAt, &acceptedAt, &createdAt); err != nil {
			logger.Error("failed to scan invitation", err)
			continue
		}
		invitations = append(invitations, map[string]any{
			"id":         id,
			"email":      email,
			"role":       role,
			"token":      token,
			"expiresAt":  expiresAt,
			"acceptedAt": acceptedAt,
			"createdAt":  createdAt,
		})
	}

	if invitations == nil {
		invitations = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, invitations)
}

type createInvitationRequest struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	ExpiresAt string `json:"expiresAt"`
	Token     string `json:"token"`
}

func (h *Handler) createInvitation(w http.ResponseWriter, r *http.Request) {
	var req createInvitationRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Email == "" || req.Role == "" {
		apperrors.Validation("email and role are required").WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()

	token := req.Token
	if token == "" {
		token, _ = cuid2.CreateId()
	}

	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err == nil {
			expiresAt = &t
		}
	}
	if expiresAt == nil {
		t := time.Now().AddDate(0, 0, 7)
		expiresAt = &t
	}

	var retID, email, role, retToken string
	var retExpiresAt, createdAt any

	err := h.pool.QueryRow(r.Context(),
		`INSERT INTO invitations (id, email, role, token, expires_at)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, email, role, token, expires_at, created_at`,
		id, req.Email, req.Role, token, expiresAt,
	).Scan(&retID, &email, &role, &retToken, &retExpiresAt, &createdAt)
	if err != nil {
		logger.Error("failed to create invitation", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        retID,
		"email":     email,
		"role":      role,
		"token":     retToken,
		"expiresAt": retExpiresAt,
		"createdAt": createdAt,
	})
}

func (h *Handler) deleteInvitation(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM invitations WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete invitation", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Invitation not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "deleted": true})
}

func (h *Handler) auditLogs(w http.ResponseWriter, r *http.Request) {
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

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		"SELECT key, value FROM settings ORDER BY key ASC")
	if err != nil {
		logger.Error("failed to get settings", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	settings := map[string]string{}
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			logger.Error("failed to scan setting", err)
			continue
		}
		settings[key] = value
	}

	writeJSON(w, http.StatusOK, settings)
}

type updateSettingsRequest struct {
	Settings map[string]string `json:"settings"`
}

func (h *Handler) updateSettings(w http.ResponseWriter, r *http.Request) {
	var req updateSettingsRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		logger.Error("failed to begin transaction", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer tx.Rollback(r.Context())

	for key, value := range req.Settings {
		_, err := tx.Exec(r.Context(),
			`INSERT INTO settings (key, value) VALUES ($1, $2)
			 ON CONFLICT (key) DO UPDATE SET value = $2`,
			key, value,
		)
		if err != nil {
			logger.Error("failed to upsert setting", err, "key", key)
			apperrors.Internal().WriteJSON(w, r.URL.Path)
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		logger.Error("failed to commit settings", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	// Invalidate settings cache
	if h.rdb != nil {
		h.rdb.Del(r.Context(), "settings")
	}

	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
