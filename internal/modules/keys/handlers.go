package keys

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

// Handler holds dependencies for virtual key endpoints.
type Handler struct {
	Pool *pgxpool.Pool
	Env  *config.Env
}

// Routes returns a Chi router with key CRUD endpoints.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.createKey)
	r.Get("/", h.listKeys)
	r.Patch("/{id}", h.updateKey)
	r.Delete("/{id}", h.deleteKey)

	return r
}

type createKeyRequest struct {
	Name         string `json:"name"`
	RateLimitRpm *int   `json:"rateLimitRpm"`
	RateLimitRpd *int   `json:"rateLimitRpd"`
}

type keyResponse struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	KeyPrefix    string     `json:"keyPrefix"`
	IsActive     bool       `json:"isActive"`
	RateLimitRpm *int       `json:"rateLimitRpm"`
	RateLimitRpd *int       `json:"rateLimitRpd"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	ExpiresAt    *time.Time `json:"expiresAt"`
}

func (h *Handler) createKey(w http.ResponseWriter, r *http.Request) {
	var req createKeyRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Name == "" {
		errors.Validation("Name is required").WriteJSON(w, r.URL.Path)
		return
	}

	// Generate key: rk_{env}_{24 random bytes base64url}
	env := "test"
	if h.Env.IsProduction() {
		env = "live"
	}

	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		logger.Error("generate random bytes failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	rawKey := "rk_" + env + "_" + base64.URLEncoding.EncodeToString(randomBytes)
	keyHash := crypto.HashSHA256(rawKey)
	keyPrefix := rawKey[:12]

	id := cuid2.Generate()
	now := time.Now().UTC()

	_, err := h.Pool.Exec(r.Context(),
		`INSERT INTO virtual_keys (id, name, key_hash, key_prefix, is_active, rate_limit_rpm, rate_limit_rpd, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8)`,
		id, req.Name, keyHash, keyPrefix, req.RateLimitRpm, req.RateLimitRpd, now, now,
	)
	if err != nil {
		logger.Error("insert virtual key failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":           id,
		"name":         req.Name,
		"key":          rawKey,
		"keyPrefix":    keyPrefix,
		"isActive":     true,
		"rateLimitRpm": req.RateLimitRpm,
		"rateLimitRpd": req.RateLimitRpd,
		"createdAt":    now,
		"updatedAt":    now,
	})
}

func (h *Handler) listKeys(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Get total count
	var total int
	if err := h.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM virtual_keys`).Scan(&total); err != nil {
		logger.Error("count virtual keys failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	rows, err := h.Pool.Query(ctx,
		`SELECT id, name, key_prefix, is_active, rate_limit_rpm, rate_limit_rpd, created_at, updated_at, expires_at
		 FROM virtual_keys
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		logger.Error("list virtual keys failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var keys []keyResponse
	for rows.Next() {
		var k keyResponse
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.IsActive, &k.RateLimitRpm, &k.RateLimitRpd, &k.CreatedAt, &k.UpdatedAt, &k.ExpiresAt); err != nil {
			logger.Warn("scan virtual key failed", "error", err)
			continue
		}
		keys = append(keys, k)
	}

	if keys == nil {
		keys = []keyResponse{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"keys":  keys,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

type updateKeyRequest struct {
	Name         *string `json:"name"`
	RateLimitRpm *int    `json:"rateLimitRpm"`
	RateLimitRpd *int    `json:"rateLimitRpd"`
	IsActive     *bool   `json:"isActive"`
}

func (h *Handler) updateKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		errors.Validation("Key ID is required").WriteJSON(w, r.URL.Path)
		return
	}

	var req updateKeyRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()
	now := time.Now().UTC()

	// Build dynamic update
	setClauses := "updated_at = $1"
	args := []any{now}
	argIdx := 2

	if req.Name != nil {
		setClauses += ", name = $" + strconv.Itoa(argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.RateLimitRpm != nil {
		setClauses += ", rate_limit_rpm = $" + strconv.Itoa(argIdx)
		args = append(args, *req.RateLimitRpm)
		argIdx++
	}
	if req.RateLimitRpd != nil {
		setClauses += ", rate_limit_rpd = $" + strconv.Itoa(argIdx)
		args = append(args, *req.RateLimitRpd)
		argIdx++
	}
	if req.IsActive != nil {
		setClauses += ", is_active = $" + strconv.Itoa(argIdx)
		args = append(args, *req.IsActive)
		argIdx++
	}

	args = append(args, id)
	query := "UPDATE virtual_keys SET " + setClauses + " WHERE id = $" + strconv.Itoa(argIdx)

	result, err := h.Pool.Exec(ctx, query, args...)
	if err != nil {
		logger.Error("update virtual key failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if result.RowsAffected() == 0 {
		errors.NotFound("Key not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (h *Handler) deleteKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		errors.Validation("Key ID is required").WriteJSON(w, r.URL.Path)
		return
	}

	result, err := h.Pool.Exec(r.Context(), `DELETE FROM virtual_keys WHERE id = $1`, id)
	if err != nil {
		logger.Error("delete virtual key failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if result.RowsAffected() == 0 {
		errors.NotFound("Key not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
