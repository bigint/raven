package providers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/data"
	apperrors "github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

type Handler struct {
	pool             *pgxpool.Pool
	rdb              *redis.Client
	encryptionSecret string
}

func NewHandler(pool *pgxpool.Pool, rdb *redis.Client, encryptionSecret string) *Handler {
	return &Handler{pool: pool, rdb: rdb, encryptionSecret: encryptionSecret}
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
	Provider string `json:"provider"`
	APIKey   string `json:"apiKey"`
	IsActive bool   `json:"isActive"`
}

type updateRequest struct {
	APIKey   *string `json:"apiKey"`
	IsActive *bool   `json:"isActive"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Provider == "" || req.APIKey == "" {
		apperrors.Validation("provider and apiKey are required").WriteJSON(w, r.URL.Path)
		return
	}

	if _, ok := data.GetProviderConfig(req.Provider); !ok {
		apperrors.Validation("Unsupported provider").WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()

	encrypted, err := crypto.Encrypt(req.APIKey, h.encryptionSecret)
	if err != nil {
		logger.Error("failed to encrypt api key", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	var retID, provider string
	var isActive bool
	var createdAt any

	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO provider_configs (id, provider, api_key_encrypted, is_active)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, provider, is_active, created_at`,
		id, req.Provider, encrypted, req.IsActive,
	).Scan(&retID, &provider, &isActive, &createdAt)
	if err != nil {
		logger.Error("failed to create provider config", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        retID,
		"provider":  provider,
		"isActive":  isActive,
		"createdAt": createdAt,
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, provider, is_active, created_at
		 FROM provider_configs ORDER BY created_at DESC`)
	if err != nil {
		logger.Error("failed to list provider configs", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var configs []map[string]any
	for rows.Next() {
		var id, provider string
		var isActive bool
		var createdAt any
		if err := rows.Scan(&id, &provider, &isActive, &createdAt); err != nil {
			logger.Error("failed to scan provider config", err)
			continue
		}
		configs = append(configs, map[string]any{
			"id":        id,
			"provider":  provider,
			"isActive":  isActive,
			"createdAt": createdAt,
		})
	}

	if configs == nil {
		configs = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, configs)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	var encrypted *string
	if req.APIKey != nil && *req.APIKey != "" {
		enc, err := crypto.Encrypt(*req.APIKey, h.encryptionSecret)
		if err != nil {
			logger.Error("failed to encrypt api key", err)
			apperrors.Internal().WriteJSON(w, r.URL.Path)
			return
		}
		encrypted = &enc
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE provider_configs SET
			api_key_encrypted = COALESCE($2, api_key_encrypted),
			is_active = COALESCE($3, is_active)
		 WHERE id = $1`,
		id, encrypted, req.IsActive,
	)
	if err != nil {
		logger.Error("failed to update provider config", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Provider config not found").WriteJSON(w, r.URL.Path)
		return
	}

	// Invalidate cache
	if h.rdb != nil {
		h.rdb.Del(r.Context(), "pc:*")
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM provider_configs WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete provider config", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Provider config not found").WriteJSON(w, r.URL.Path)
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
