package webhooks

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nrednav/cuid2"

	"github.com/bigint/raven/internal/crypto"
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
	r.Post("/", h.create)
	r.Get("/", h.list)
	r.Patch("/{id}", h.update)
	r.Delete("/{id}", h.delete)
	r.Post("/{id}/test", h.test)
	return r
}

type createRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

type updateRequest struct {
	URL       *string  `json:"url"`
	Events    []string `json:"events"`
	IsEnabled *bool    `json:"isEnabled"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req createRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	if req.URL == "" || len(req.Events) == 0 {
		apperrors.Validation("url and events are required").WriteJSON(w, r.URL.Path)
		return
	}

	id, _ := cuid2.CreateId()

	secretBytes, err := crypto.RandomBytes(32)
	if err != nil {
		logger.Error("failed to generate webhook secret", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	secret := "whsec_" + hex.EncodeToString(secretBytes)

	eventsJSON, _ := json.Marshal(req.Events)

	var retID, url, retSecret string
	var events json.RawMessage
	var isEnabled bool
	var createdAt any

	err = h.pool.QueryRow(r.Context(),
		`INSERT INTO webhooks (id, url, events, secret, is_enabled)
		 VALUES ($1, $2, $3, $4, true)
		 RETURNING id, url, events, secret, is_enabled, created_at`,
		id, req.URL, eventsJSON, secret,
	).Scan(&retID, &url, &events, &retSecret, &isEnabled, &createdAt)
	if err != nil {
		logger.Error("failed to create webhook", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        retID,
		"url":       url,
		"events":    events,
		"secret":    retSecret,
		"isEnabled": isEnabled,
		"createdAt": createdAt,
	})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	rows, err := h.pool.Query(r.Context(),
		`SELECT id, url, events, is_enabled, created_at
		 FROM webhooks ORDER BY created_at DESC`)
	if err != nil {
		logger.Error("failed to list webhooks", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}
	defer rows.Close()

	var hooks []map[string]any
	for rows.Next() {
		var id, url string
		var events json.RawMessage
		var isEnabled bool
		var createdAt any
		if err := rows.Scan(&id, &url, &events, &isEnabled, &createdAt); err != nil {
			logger.Error("failed to scan webhook", err)
			continue
		}
		hooks = append(hooks, map[string]any{
			"id":        id,
			"url":       url,
			"events":    events,
			"isEnabled": isEnabled,
			"createdAt": createdAt,
		})
	}

	if hooks == nil {
		hooks = []map[string]any{}
	}

	writeJSON(w, http.StatusOK, hooks)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req updateRequest
	if err := readJSON(r, &req); err != nil {
		apperrors.Validation("Invalid request body").WriteJSON(w, r.URL.Path)
		return
	}

	var eventsJSON []byte
	if req.Events != nil {
		eventsJSON, _ = json.Marshal(req.Events)
	}

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE webhooks SET
			url = COALESCE($2, url),
			events = COALESCE($3, events),
			is_enabled = COALESCE($4, is_enabled)
		 WHERE id = $1`,
		id, req.URL, eventsJSON, req.IsEnabled,
	)
	if err != nil {
		logger.Error("failed to update webhook", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Webhook not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "updated": true})
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	tag, err := h.pool.Exec(r.Context(), "DELETE FROM webhooks WHERE id = $1", id)
	if err != nil {
		logger.Error("failed to delete webhook", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	if tag.RowsAffected() == 0 {
		apperrors.NotFound("Webhook not found").WriteJSON(w, r.URL.Path)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"id": id, "deleted": true})
}

func (h *Handler) test(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var url, secret string
	err := h.pool.QueryRow(r.Context(),
		"SELECT url, secret FROM webhooks WHERE id = $1",
		id,
	).Scan(&url, &secret)
	if err != nil {
		apperrors.NotFound("Webhook not found").WriteJSON(w, r.URL.Path)
		return
	}

	testPayload := map[string]any{
		"type":      "test",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"data": map[string]any{
			"message": "This is a test webhook delivery",
		},
	}

	body, _ := json.Marshal(testPayload)
	signature := crypto.SignHMAC(string(body), secret)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		logger.Error("failed to create test webhook request", err)
		apperrors.Internal().WriteJSON(w, r.URL.Path)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("X-Webhook-ID", id)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"success":  false,
			"error":    err.Error(),
			"webhookId": id,
		})
		return
	}
	defer resp.Body.Close()

	writeJSON(w, http.StatusOK, map[string]any{
		"success":    resp.StatusCode >= 200 && resp.StatusCode < 300,
		"statusCode": resp.StatusCode,
		"webhookId":  id,
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
