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

	// Providers.
	r.Get("/providers", a.listProviders)
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

func (a *Router) listProviders(w http.ResponseWriter, r *http.Request) {
	_ = r
	names := a.registry.ListProviders()
	providerList := make([]map[string]any, 0, len(names))

	for _, name := range names {
		spec, ok := a.registry.GetSpec(name)
		if !ok {
			continue
		}
		health := a.health.GetHealth(name)
		providerList = append(providerList, map[string]any{
			"name":         spec.Name,
			"display_name": spec.DisplayName,
			"base_url":     spec.BaseURL,
			"healthy":      health.Healthy,
			"models":       len(spec.Models),
		})
	}

	writeJSON(w, http.StatusOK, types.AdminResponse{Data: providerList})
}

func (a *Router) getProviderHealth(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	_ = r
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
