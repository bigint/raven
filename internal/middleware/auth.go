package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	apperrors "github.com/bigint/raven/internal/errors"
	"github.com/bigint/raven/internal/logger"
)

type contextKey string

const (
	UserIDKey contextKey = "userId"
	UserRoleKey contextKey = "userRole"
)

// SessionAuth validates the session token from cookies or Authorization header
// and injects the userId and userRole into the request context.
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
				apperrors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			var userID, userRole string
			err := pool.QueryRow(r.Context(),
				`SELECT s.user_id, u.role FROM sessions s
				 JOIN users u ON u.id = s.user_id
				 WHERE s.token = $1 AND s.expires_at > NOW()`,
				token,
			).Scan(&userID, &userRole)
			if err != nil {
				logger.Warn("session auth failed", "error", err)
				apperrors.Unauthorized().WriteJSON(w, r.URL.Path)
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, UserRoleKey, userRole)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin checks that the authenticated user has the "admin" role.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role, _ := r.Context().Value(UserRoleKey).(string)
		if role != "admin" {
			apperrors.Forbidden("Admin access required").WriteJSON(w, r.URL.Path)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// GetUserID extracts the user ID from the request context.
func GetUserID(ctx context.Context) string {
	id, _ := ctx.Value(UserIDKey).(string)
	return id
}

// GetUserRole extracts the user role from the request context.
func GetUserRole(ctx context.Context) string {
	role, _ := ctx.Value(UserRoleKey).(string)
	return role
}
