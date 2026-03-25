package models

import (
	"encoding/json"
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bigint/raven/internal/data"
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
	r.Get("/", h.listAll)
	return r
}

func (h *Handler) AvailableRoutes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.listAvailable)
	return r
}

func (h *Handler) listAll(w http.ResponseWriter, r *http.Request) {
	var models []data.ModelDefinition
	for _, m := range data.ModelCatalog {
		models = append(models, m)
	}

	sort.Slice(models, func(i, j int) bool {
		if models[i].Provider != models[j].Provider {
			return models[i].Provider < models[j].Provider
		}
		return models[i].Name < models[j].Name
	})

	writeJSON(w, http.StatusOK, models)
}

func (h *Handler) listAvailable(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		"SELECT DISTINCT provider FROM provider_configs WHERE is_active = true")
	if err != nil {
		logger.Error("failed to query active providers", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	activeProviders := map[string]bool{}
	for rows.Next() {
		var provider string
		if err := rows.Scan(&provider); err != nil {
			continue
		}
		activeProviders[provider] = true
	}

	var models []data.ModelDefinition
	for _, m := range data.ModelCatalog {
		if activeProviders[m.Provider] {
			models = append(models, m)
		}
	}

	sort.Slice(models, func(i, j int) bool {
		if models[i].Provider != models[j].Provider {
			return models[i].Provider < models[j].Provider
		}
		return models[i].Name < models[j].Name
	})

	if models == nil {
		models = []data.ModelDefinition{}
	}

	writeJSON(w, http.StatusOK, models)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{"data": data})
}
