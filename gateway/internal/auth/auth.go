// Package auth provides authentication middleware for the Raven gateway.
package auth

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/store"
	"github.com/bigint-studio/raven/pkg/types"
)

type contextKey string

const (
	// ContextKeyID is the context key for the virtual key ID.
	ContextKeyID contextKey = "key_id"
	// ContextOrgID is the context key for the organization ID.
	ContextOrgID contextKey = "org_id"
	// ContextTeamID is the context key for the team ID.
	ContextTeamID contextKey = "team_id"
	// ContextUserID is the context key for the user ID.
	ContextUserID contextKey = "user_id"
	// ContextIsAdmin is the context key for admin status.
	ContextIsAdmin contextKey = "is_admin"
)

// Middleware provides authentication middleware.
type Middleware struct {
	cfg      *config.Config
	store    store.Store
	keyAuth  *KeyValidator
}

// NewMiddleware creates a new auth middleware.
func NewMiddleware(cfg *config.Config, st store.Store) *Middleware {
	return &Middleware{
		cfg:     cfg,
		store:   st,
		keyAuth: NewKeyValidator(st),
	}
}

// Authenticate is the main authentication middleware.
func (m *Middleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := extractAPIKey(r)
		if apiKey == "" {
			types.ErrUnauthorized.WriteJSON(w)
			return
		}

		ctx := r.Context()

		// Check admin key first.
		if m.cfg.Admin.APIKey != "" && apiKey == m.cfg.Admin.APIKey {
			ctx = context.WithValue(ctx, ContextIsAdmin, true)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Validate virtual key.
		keyCtx, err := m.keyAuth.Validate(ctx, apiKey)
		if err != nil {
			slog.Warn("authentication failed", "error", err)
			types.ErrUnauthorized.WriteJSON(w)
			return
		}

		ctx = context.WithValue(ctx, ContextKeyID, keyCtx.KeyID)
		ctx = context.WithValue(ctx, ContextOrgID, keyCtx.OrgID)
		ctx = context.WithValue(ctx, ContextTeamID, keyCtx.TeamID)
		ctx = context.WithValue(ctx, ContextUserID, keyCtx.UserID)
		ctx = context.WithValue(ctx, ContextIsAdmin, false)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminOnly middleware restricts access to admin users.
func (m *Middleware) AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAdmin, _ := r.Context().Value(ContextIsAdmin).(bool)
		if !isAdmin {
			types.ErrForbidden.WriteJSON(w)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// extractAPIKey extracts the API key from the Authorization header.
func extractAPIKey(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return ""
	}

	// Support "Bearer <key>" format.
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}

	return auth
}

// GetKeyID returns the key ID from the context.
func GetKeyID(ctx context.Context) string {
	v, _ := ctx.Value(ContextKeyID).(string)
	return v
}

// GetOrgID returns the org ID from the context.
func GetOrgID(ctx context.Context) string {
	v, _ := ctx.Value(ContextOrgID).(string)
	return v
}

// GetTeamID returns the team ID from the context.
func GetTeamID(ctx context.Context) string {
	v, _ := ctx.Value(ContextTeamID).(string)
	return v
}

// GetUserID returns the user ID from the context.
func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(ContextUserID).(string)
	return v
}

// IsAdmin returns whether the current request is from an admin.
func IsAdmin(ctx context.Context) bool {
	v, _ := ctx.Value(ContextIsAdmin).(bool)
	return v
}
