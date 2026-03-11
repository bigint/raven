// Package admin provides the admin API for the Raven gateway.
package admin

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/bigint-studio/raven/internal/observe"
	"github.com/bigint-studio/raven/internal/providers"
	"github.com/bigint-studio/raven/internal/store"
	"github.com/bigint-studio/raven/pkg/types"
)

// Router handles admin API requests.
type Router struct {
	store    store.Store
	registry *providers.Registry
	health   *providers.HealthChecker
	metrics  *observe.Metrics
}

// NewRouter creates a new admin API router.
func NewRouter(st store.Store, registry *providers.Registry, health *providers.HealthChecker, metrics *observe.Metrics) *Router {
	return &Router{
		store:    st,
		registry: registry,
		health:   health,
		metrics:  metrics,
	}
}

// Routes returns the admin API chi router.
func (a *Router) Routes() chi.Router {
	r := chi.NewRouter()

	// Organizations.
	r.Route("/orgs", func(r chi.Router) {
		r.Get("/", a.listOrgs)
		r.Post("/", a.createOrg)
		r.Get("/{id}", a.getOrg)
		r.Put("/{id}", a.updateOrg)
		r.Delete("/{id}", a.deleteOrg)
	})

	// Teams.
	r.Route("/teams", func(r chi.Router) {
		r.Get("/", a.listTeams)
		r.Post("/", a.createTeam)
		r.Get("/{id}", a.getTeam)
		r.Put("/{id}", a.updateTeam)
		r.Delete("/{id}", a.deleteTeam)
	})

	// Users.
	r.Route("/users", func(r chi.Router) {
		r.Get("/", a.listUsers)
		r.Post("/", a.createUser)
		r.Get("/{id}", a.getUser)
		r.Put("/{id}", a.updateUser)
		r.Delete("/{id}", a.deleteUser)
	})

	// Virtual Keys.
	r.Route("/keys", func(r chi.Router) {
		r.Get("/", a.listKeys)
		r.Post("/", a.createKey)
		r.Get("/{id}", a.getKey)
		r.Put("/{id}", a.updateKey)
		r.Delete("/{id}", a.deleteKey)
	})

	// Provider configuration (API keys managed via UI).
	r.Post("/providers", a.createProviderConfig)
	r.Get("/providers", a.listProviders)
	r.Get("/providers/{name}", a.getProviderConfig)
	r.Patch("/providers/{name}", a.updateProviderConfig)
	r.Delete("/providers/{name}", a.deleteProviderConfig)
	r.Get("/providers/{name}/health", a.getProviderHealth)

	// Models.
	r.Get("/models", a.listModels)

	// Logs.
	r.Get("/logs", a.listLogs)
	r.Get("/logs/{id}", a.getLog)

	// Health.
	r.Get("/health", a.healthCheck)

	return r
}

// --- Helpers ---

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data) //nolint:errcheck
}

func writeAdminResponse(w http.ResponseWriter, data any, total, page, perPage int) {
	resp := types.AdminResponse{
		Data: data,
		Meta: &types.AdminPageMeta{
			Total:   total,
			Page:    page,
			PerPage: perPage,
		},
	}
	writeJSON(w, http.StatusOK, resp)
}

func parseListOpts(r *http.Request) store.ListOpts {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	return store.ListOpts{
		Page:    page,
		PerPage: perPage,
		Search:  r.URL.Query().Get("search"),
		Status:  r.URL.Query().Get("status"),
		OrgID:   r.URL.Query().Get("org_id"),
		TeamID:  r.URL.Query().Get("team_id"),
	}
}

// --- Organizations ---

func (a *Router) listOrgs(w http.ResponseWriter, r *http.Request) {
	opts := parseListOpts(r)
	orgs, total, err := a.store.ListOrgs(r.Context(), opts)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if orgs == nil {
		orgs = []*store.Org{}
	}
	writeAdminResponse(w, orgs, total, opts.Page, opts.PerPage)
}

func (a *Router) createOrg(w http.ResponseWriter, r *http.Request) {
	var org store.Org
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	if err := a.store.CreateOrg(r.Context(), &org); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusCreated, types.AdminResponse{Data: org})
}

func (a *Router) getOrg(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	org, err := a.store.GetOrg(r.Context(), id)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if org == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: org})
}

func (a *Router) updateOrg(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var org store.Org
	if err := json.NewDecoder(r.Body).Decode(&org); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	org.ID = id
	if err := a.store.UpdateOrg(r.Context(), &org); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: org})
}

func (a *Router) deleteOrg(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := a.store.DeleteOrg(r.Context(), id); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Teams ---

func (a *Router) listTeams(w http.ResponseWriter, r *http.Request) {
	opts := parseListOpts(r)
	orgID := r.URL.Query().Get("org_id")
	teams, total, err := a.store.ListTeams(r.Context(), orgID, opts)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if teams == nil {
		teams = []*store.Team{}
	}
	writeAdminResponse(w, teams, total, opts.Page, opts.PerPage)
}

func (a *Router) createTeam(w http.ResponseWriter, r *http.Request) {
	var team store.Team
	if err := json.NewDecoder(r.Body).Decode(&team); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	if err := a.store.CreateTeam(r.Context(), &team); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusCreated, types.AdminResponse{Data: team})
}

func (a *Router) getTeam(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	team, err := a.store.GetTeam(r.Context(), id)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if team == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: team})
}

func (a *Router) updateTeam(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var team store.Team
	if err := json.NewDecoder(r.Body).Decode(&team); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	team.ID = id
	if err := a.store.UpdateTeam(r.Context(), &team); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: team})
}

func (a *Router) deleteTeam(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := a.store.DeleteTeam(r.Context(), id); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Users ---

func (a *Router) listUsers(w http.ResponseWriter, r *http.Request) {
	opts := parseListOpts(r)
	users, total, err := a.store.ListUsers(r.Context(), opts)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if users == nil {
		users = []*store.User{}
	}
	writeAdminResponse(w, users, total, opts.Page, opts.PerPage)
}

func (a *Router) createUser(w http.ResponseWriter, r *http.Request) {
	var user store.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	if err := a.store.CreateUser(r.Context(), &user); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusCreated, types.AdminResponse{Data: user})
}

func (a *Router) getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	user, err := a.store.GetUser(r.Context(), id)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if user == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: user})
}

func (a *Router) updateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var user store.User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	user.ID = id
	if err := a.store.UpdateUser(r.Context(), &user); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: user})
}

func (a *Router) deleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := a.store.DeleteUser(r.Context(), id); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Virtual Keys ---

func (a *Router) listKeys(w http.ResponseWriter, r *http.Request) {
	opts := parseListOpts(r)
	keys, total, err := a.store.ListKeys(r.Context(), opts)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if keys == nil {
		keys = []*store.VirtualKey{}
	}
	writeAdminResponse(w, keys, total, opts.Page, opts.PerPage)
}

func (a *Router) createKey(w http.ResponseWriter, r *http.Request) {
	var key store.VirtualKey
	if err := json.NewDecoder(r.Body).Decode(&key); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	if err := a.store.CreateKey(r.Context(), &key); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusCreated, types.AdminResponse{Data: key})
}

func (a *Router) getKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	key, err := a.store.GetKey(r.Context(), id)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if key == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: key})
}

func (a *Router) updateKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var key store.VirtualKey
	if err := json.NewDecoder(r.Body).Decode(&key); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}
	key.ID = id
	if err := a.store.UpdateKey(r.Context(), &key); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: key})
}

func (a *Router) deleteKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := a.store.DeleteKey(r.Context(), id); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Providers ---

// maskAPIKey returns a masked version of an API key, showing only the last 4 characters.
func maskAPIKey(key string) string {
	if len(key) <= 4 {
		return "****"
	}
	prefix := key[:3]
	suffix := key[len(key)-4:]
	return prefix + "..." + suffix
}

func (a *Router) listProviders(w http.ResponseWriter, r *http.Request) {
	names := a.registry.ListProviders()

	// Load provider configs from DB.
	configs, err := a.store.ListProviderConfigs(r.Context())
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}

	// Build a map of configs by name.
	configMap := make(map[string]*store.ProviderConfig)
	for _, cfg := range configs {
		configMap[cfg.Name] = cfg
	}

	providerList := make([]map[string]any, 0, len(names))

	for _, name := range names {
		spec, ok := a.registry.GetSpec(name)
		if !ok {
			continue
		}
		health := a.health.GetHealth(name)
		entry := map[string]any{
			"name":         spec.Name,
			"display_name": spec.DisplayName,
			"base_url":     spec.BaseURL,
			"healthy":      health.Healthy,
			"models":       len(spec.Models),
			"configured":   false,
			"enabled":      false,
		}

		if cfg, exists := configMap[name]; exists {
			entry["configured"] = true
			entry["enabled"] = cfg.Enabled
			entry["api_key"] = maskAPIKey(cfg.APIKey)
			if cfg.BaseURL != "" {
				entry["base_url_override"] = cfg.BaseURL
			}
		}

		providerList = append(providerList, entry)
	}

	writeJSON(w, http.StatusOK, types.AdminResponse{Data: providerList})
}

func (a *Router) createProviderConfig(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		APIKey      string `json:"api_key"`
		BaseURL     string `json:"base_url"`
		Enabled     *bool  `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}

	if req.Name == "" || req.APIKey == "" {
		types.NewAPIError(http.StatusBadRequest, "invalid_request_error", "name and api_key are required", "missing_fields").WriteJSON(w)
		return
	}

	// Check if already exists.
	existing, err := a.store.GetProviderConfigByName(r.Context(), req.Name)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if existing != nil {
		types.NewAPIError(http.StatusConflict, "conflict_error", "provider config already exists", "duplicate").WriteJSON(w)
		return
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	// Use display name from registry spec if not provided.
	displayName := req.DisplayName
	if displayName == "" {
		if spec, ok := a.registry.GetSpec(req.Name); ok {
			displayName = spec.DisplayName
		}
	}

	cfg := &store.ProviderConfig{
		Name:        req.Name,
		DisplayName: displayName,
		APIKey:      req.APIKey,
		BaseURL:     req.BaseURL,
		Enabled:     enabled,
	}

	if err := a.store.CreateProviderConfig(r.Context(), cfg); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}

	// Update registry credentials.
	if cfg.Enabled {
		a.registry.SetCredentials(cfg.Name, cfg.APIKey, cfg.BaseURL)
	}

	// Return response with masked API key.
	resp := map[string]any{
		"id":           cfg.ID,
		"name":         cfg.Name,
		"display_name": cfg.DisplayName,
		"api_key":      maskAPIKey(cfg.APIKey),
		"base_url":     cfg.BaseURL,
		"enabled":      cfg.Enabled,
		"created_at":   cfg.CreatedAt,
		"updated_at":   cfg.UpdatedAt,
	}
	writeJSON(w, http.StatusCreated, types.AdminResponse{Data: resp})
}

func (a *Router) getProviderConfig(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	cfg, err := a.store.GetProviderConfigByName(r.Context(), name)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if cfg == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}

	resp := map[string]any{
		"id":           cfg.ID,
		"name":         cfg.Name,
		"display_name": cfg.DisplayName,
		"api_key":      maskAPIKey(cfg.APIKey),
		"base_url":     cfg.BaseURL,
		"org_id":       cfg.OrgID,
		"enabled":      cfg.Enabled,
		"created_at":   cfg.CreatedAt,
		"updated_at":   cfg.UpdatedAt,
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: resp})
}

func (a *Router) updateProviderConfig(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	existing, err := a.store.GetProviderConfigByName(r.Context(), name)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if existing == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}

	// Decode partial update.
	var req map[string]any
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		types.ErrBadRequest.WriteJSON(w)
		return
	}

	if v, ok := req["api_key"].(string); ok && v != "" {
		existing.APIKey = v
	}
	if v, ok := req["base_url"].(string); ok {
		existing.BaseURL = v
	}
	if v, ok := req["display_name"].(string); ok {
		existing.DisplayName = v
	}
	if v, ok := req["org_id"].(string); ok {
		existing.OrgID = v
	}
	if v, ok := req["enabled"].(bool); ok {
		existing.Enabled = v
	}

	if err := a.store.UpdateProviderConfig(r.Context(), existing); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}

	// Update registry credentials.
	if existing.Enabled {
		a.registry.SetCredentials(existing.Name, existing.APIKey, existing.BaseURL)
	}

	resp := map[string]any{
		"id":           existing.ID,
		"name":         existing.Name,
		"display_name": existing.DisplayName,
		"api_key":      maskAPIKey(existing.APIKey),
		"base_url":     existing.BaseURL,
		"org_id":       existing.OrgID,
		"enabled":      existing.Enabled,
		"created_at":   existing.CreatedAt,
		"updated_at":   existing.UpdatedAt,
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: resp})
}

func (a *Router) deleteProviderConfig(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	cfg, err := a.store.GetProviderConfigByName(r.Context(), name)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if cfg == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}

	if err := a.store.DeleteProviderConfig(r.Context(), cfg.ID); err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (a *Router) getProviderHealth(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	health := a.health.GetHealth(name)
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: health})
}

// --- Models ---

func (a *Router) listModels(w http.ResponseWriter, r *http.Request) {
	_ = r
	models := a.registry.ListModels()
	writeJSON(w, http.StatusOK, types.AdminResponse{
		Data: models,
		Meta: &types.AdminPageMeta{Total: len(models)},
	})
}

// --- Logs ---

func (a *Router) listLogs(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	opts := store.LogQueryOpts{
		Cursor:   r.URL.Query().Get("cursor"),
		Limit:    limit,
		KeyID:    r.URL.Query().Get("key_id"),
		OrgID:    r.URL.Query().Get("org_id"),
		Provider: r.URL.Query().Get("provider"),
		Model:    r.URL.Query().Get("model"),
	}

	logs, nextCursor, err := a.store.ListLogs(r.Context(), opts)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if logs == nil {
		logs = []*store.RequestLog{}
	}

	resp := map[string]any{
		"data": logs,
		"meta": map[string]any{
			"cursor": nextCursor,
			"total":  len(logs),
		},
	}
	writeJSON(w, http.StatusOK, resp)
}

func (a *Router) getLog(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	log, err := a.store.GetLog(r.Context(), id)
	if err != nil {
		types.ErrInternal.WriteJSON(w)
		return
	}
	if log == nil {
		types.ErrNotFound.WriteJSON(w)
		return
	}
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: log})
}

// --- Health ---

func (a *Router) healthCheck(w http.ResponseWriter, r *http.Request) {
	_ = r
	healthData := a.health.GetAllHealth()
	writeJSON(w, http.StatusOK, types.AdminResponse{Data: healthData})
}
