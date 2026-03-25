package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bigint/raven/internal/errors"
)

type contextKey int

const authUserKey contextKey = iota

// AuthUser holds the authenticated user info stored in request context.
type AuthUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

// GetAuthUser retrieves the authenticated user from the request context.
func GetAuthUser(ctx context.Context) *AuthUser {
	u, _ := ctx.Value(authUserKey).(*AuthUser)
	return u
}

// SessionMiddleware extracts the session token from cookies, validates the session,
// and sets the AuthUser in the request context.
func SessionMiddleware(pool *pgxpool.Pool, isProduction bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractSessionToken(r, isProduction)
			if token == "" {
				errors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			session, user, err := GetSessionByToken(r.Context(), pool, token)
			if err != nil {
				errors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			if session.ExpiresAt.Before(time.Now()) {
				errors.Unauthorized("Session expired").WriteJSON(w, r.URL.Path)
				return
			}

			authUser := &AuthUser{
				ID:    user.ID,
				Email: user.Email,
				Name:  user.Name,
				Role:  user.Role,
			}

			ctx := context.WithValue(r.Context(), authUserKey, authUser)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// PlatformAdminMiddleware ensures the authenticated user has the "admin" role.
func PlatformAdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetAuthUser(r.Context())
		if user == nil {
			errors.Unauthorized().WriteJSON(w, r.URL.Path)
			return
		}

		if user.Role != "admin" {
			errors.Forbidden("Admin access required").WriteJSON(w, r.URL.Path)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// extractSessionToken reads the session token from the cookie.
// In production, it checks for the "__Secure-" prefixed cookie first.
func extractSessionToken(r *http.Request, isProduction bool) string {
	cookieNames := []string{"better-auth.session_token"}
	if isProduction {
		cookieNames = []string{"__Secure-better-auth.session_token", "better-auth.session_token"}
	}

	for _, name := range cookieNames {
		if c, err := r.Cookie(name); err == nil && c.Value != "" {
			// The cookie value may contain a dot-separated token (token.suffix); use the full value.
			return strings.TrimSpace(c.Value)
		}
	}

	return ""
}
