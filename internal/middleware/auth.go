package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

// SessionAuth validates the session token from cookies or Authorization header
// and injects the AuthUser into the request context.
func SessionAuth(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var token string

			// Check cookie first
			if cookie, err := r.Cookie("better-auth.session_token"); err == nil {
				token = cookie.Value
			}

			// Fall back to Authorization header
			if token == "" {
				auth := r.Header.Get("Authorization")
				if strings.HasPrefix(auth, "Bearer ") {
					token = strings.TrimPrefix(auth, "Bearer ")
				}
			}

			// Strip the signature part if present (better-auth format: token.signature)
			if idx := strings.LastIndex(token, "."); idx > 0 {
				token = token[:idx]
			}

			if token == "" {
				errors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			var userID, email, name, role string
			err := pool.QueryRow(r.Context(),
				`SELECT u.id, u.email, u.name, u.role FROM sessions s
				 JOIN users u ON u.id = s.user_id
				 WHERE s.token = $1 AND s.expires_at > NOW()`,
				token,
			).Scan(&userID, &email, &name, &role)
			if err != nil {
				logger.Warn("session auth failed", "error", err)
				errors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			user := &AuthUser{
				ID:    userID,
				Email: email,
				Name:  name,
				Role:  role,
			}

			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin checks that the authenticated user has the "admin" role.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := UserFromContext(r.Context())
		if user == nil || user.Role != "admin" {
			errors.Forbidden("Admin access required").WriteJSON(w, r.URL.Path)
			return
		}
		next.ServeHTTP(w, r)
	})
}
