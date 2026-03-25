package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/data"
	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

const providerCachePrefix = "provider:"

// Handler holds dependencies for provider config endpoints.
type Handler struct {
	Pool  *pgxpool.Pool
	Redis *redis.Client
	Env   *config.Env
}

// Routes returns a Chi router with provider CRUD endpoints.
func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/", h.createProvider)
	r.Get("/", h.listProviders)
	r.Patch("/{id}", h.updateProvider)
	r.Delete("/{id}", h.deleteProvider)
	r.Post("/{id}/test", h.testProvider)
	r.Get("/available", h.listAvailable)

	return r
}

type createProviderRequest struct {
	Provider string `json:"provider"`
	Name     string `json:"name"`
	APIKey   string `json:"apiKey"`
}

type providerResponse struct {
	ID        string    `json:"id"`
	Provider  string    `json:"provider"`
	Name      string    `json:"name"`
	APIKey    string    `json:"apiKey"`
	IsEnabled bool      `json:"isEnabled"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (h *Handler) createProvider(w http.ResponseWriter, r *http.Request) {
	var req createProviderRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.Provider == "" || req.Name == "" || req.APIKey == "" {
		errors.Validation("Provider, name, and API key are required").WriteJSON(w, r.URL.Path)
		return
	}

	if _, ok := data.GetProviderConfig(req.Provider); !ok {
		errors.Validation("Unsupported provider: " + req.Provider).WriteJSON(w, r.URL.Path)
		return
	}

	encryptedKey, err := crypto.Encrypt(req.APIKey, h.Env.EncryptionSecret)
	if err != nil {
		logger.Error("encrypt API key failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()
	now := time.Now().UTC()

	_, err = h.Pool.Exec(r.Context(),
		`INSERT INTO provider_configs (id, provider, name, api_key, is_enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, true, $5, $6)`,
		id, req.Provider, req.Name, encryptedKey, now, now,
	)
	if err != nil {
		logger.Error("insert provider config failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, providerResponse{
		ID:        id,
		Provider:  req.Provider,
		Name:      req.Name,
		APIKey:    maskAPIKey(req.APIKey),
		IsEnabled: true,
		CreatedAt: now,
		UpdatedAt: now,
	})
}

func (h *Handler) listProviders(w http.ResponseWriter, r *http.Request) {
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

	var total int
	if err := h.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM provider_configs`).Scan(&total); err != nil {
		logger.Error("count provider configs failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	rows, err := h.Pool.Query(ctx,
		`SELECT id, provider, name, api_key, is_enabled, created_at, updated_at
		 FROM provider_configs
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		logger.Error("list provider configs failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var providers []providerResponse
	for rows.Next() {
		var p providerResponse
		var encryptedKey string
		if err := rows.Scan(&p.ID, &p.Provider, &p.Name, &encryptedKey, &p.IsEnabled, &p.CreatedAt, &p.UpdatedAt); err != nil {
			logger.Warn("scan provider config failed", "error", err)
			continue
		}

		decrypted, err := crypto.Decrypt(encryptedKey, h.Env.EncryptionSecret)
		if err != nil {
			p.APIKey = "sk-...****"
		} else {
			p.APIKey = maskAPIKey(decrypted)
		}

		providers = append(providers, p)
	}

	if providers == nil {
		providers = []providerResponse{}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"providers": providers,
		"total":     total,
		"page":      page,
		"limit":     limit,
	})
}

type updateProviderRequest struct {
	Name      *string `json:"name"`
	APIKey    *string `json:"apiKey"`
	IsEnabled *bool   `json:"isEnabled"`
}

func (h *Handler) updateProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		errors.Validation("Provider config ID is required").WriteJSON(w, r.URL.Path)
		return
	}

	var req updateProviderRequest
	if err := readJSON(r, &req); err != nil {
		errors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()
	now := time.Now().UTC()

	setClauses := "updated_at = $1"
	args := []any{now}
	argIdx := 2

	if req.Name != nil {
		setClauses += ", name = $" + strconv.Itoa(argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.IsEnabled != nil {
		setClauses += ", is_enabled = $" + strconv.Itoa(argIdx)
		args = append(args, *req.IsEnabled)
		argIdx++
	}
	if req.APIKey != nil && *req.APIKey != "" {
		encryptedKey, err := crypto.Encrypt(*req.APIKey, h.Env.EncryptionSecret)
		if err != nil {
			logger.Error("encrypt API key failed", err)
			errors.Internal().WriteJSON(w, r.URL.Path)
			return
		}
		setClauses += ", api_key = $" + strconv.Itoa(argIdx)
		args = append(args, encryptedKey)
		argIdx++
	}

	args = append(args, id)
	query := "UPDATE provider_configs SET " + setClauses + " WHERE id = $" + strconv.Itoa(argIdx)

	result, err := h.Pool.Exec(ctx, query, args...)
	if err != nil {
		logger.Error("update provider config failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if result.RowsAffected() == 0 {
		errors.NotFound("Provider config not found").WriteJSON(w, r.URL.Path)
		return
	}

	h.invalidateProviderCache(ctx, id)

	writeJSON(w, http.StatusOK, map[string]any{"updated": true})
}

func (h *Handler) deleteProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		errors.Validation("Provider config ID is required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	result, err := h.Pool.Exec(ctx, `DELETE FROM provider_configs WHERE id = $1`, id)
	if err != nil {
		logger.Error("delete provider config failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if result.RowsAffected() == 0 {
		errors.NotFound("Provider config not found").WriteJSON(w, r.URL.Path)
		return
	}

	h.invalidateProviderCache(ctx, id)

	writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
}

func (h *Handler) testProvider(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		errors.Validation("Provider config ID is required").WriteJSON(w, r.URL.Path)
		return
	}

	ctx := r.Context()

	var providerSlug, encryptedKey string
	err := h.Pool.QueryRow(ctx,
		`SELECT provider, api_key FROM provider_configs WHERE id = $1 LIMIT 1`,
		id,
	).Scan(&providerSlug, &encryptedKey)
	if err != nil {
		errors.NotFound("Provider config not found").WriteJSON(w, r.URL.Path)
		return
	}

	apiKey, err := crypto.Decrypt(encryptedKey, h.Env.EncryptionSecret)
	if err != nil {
		logger.Error("decrypt API key failed", err)
		errors.Internal("Failed to decrypt API key").WriteJSON(w, r.URL.Path)
		return
	}

	providerCfg, ok := data.GetProviderConfig(providerSlug)
	if !ok {
		errors.Validation("Unsupported provider: " + providerSlug).WriteJSON(w, r.URL.Path)
		return
	}

	validationURL := providerCfg.BaseURL + providerCfg.ValidationPath

	method := http.MethodGet
	if providerCfg.ValidationMethod != "" {
		method = providerCfg.ValidationMethod
	}

	var bodyReader io.Reader
	if providerCfg.ValidationBody != "" {
		bodyReader = strings.NewReader(providerCfg.ValidationBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, validationURL, bodyReader)
	if err != nil {
		logger.Error("create validation request failed", err)
		errors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	for k, v := range providerCfg.AuthHeaders(apiKey) {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"valid":   false,
			"message": fmt.Sprintf("Connection failed: %v", err),
		})
		return
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		writeJSON(w, http.StatusOK, map[string]any{
			"valid":   false,
			"message": fmt.Sprintf("API returned status %d", resp.StatusCode),
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"valid":   true,
		"message": "API key is valid",
	})
}

func (h *Handler) listAvailable(w http.ResponseWriter, r *http.Request) {
	var available []map[string]string
	for _, p := range data.SupportedProviders {
		available = append(available, map[string]string{
			"name": p.Name,
			"slug": p.Slug,
		})
	}

	writeJSON(w, http.StatusOK, available)
}

func (h *Handler) invalidateProviderCache(ctx context.Context, id string) {
	if h.Redis == nil {
		return
	}
	cacheKey := providerCachePrefix + id
	if err := h.Redis.Del(ctx, cacheKey).Err(); err != nil {
		logger.Warn("failed to invalidate provider cache", "error", err, "id", id)
	}
}

// maskAPIKey masks an API key showing only "sk-...xxxx" format.
func maskAPIKey(key string) string {
	if len(key) <= 8 {
		return "sk-...****"
	}
	return "sk-..." + key[len(key)-4:]
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}
