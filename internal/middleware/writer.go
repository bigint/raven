package middleware

import (
	"context"
	"net/http"

	"github.com/bigint/raven/internal/errors"
)

type contextKey string

// UserContextKey is the context key under which AuthUser is stored.
const UserContextKey contextKey = "user"

// AuthUser represents the authenticated user stored in request context.
type AuthUser struct {
	ID    string
	Email string
	Name  string
	Role  string
}

// UserFromContext extracts the AuthUser from the request context.
// Returns nil when no user is present.
func UserFromContext(ctx context.Context) *AuthUser {
	u, _ := ctx.Value(UserContextKey).(*AuthUser)
	return u
}

// mutationMethods is the set of HTTP methods considered mutations.
var mutationMethods = map[string]struct{}{
	http.MethodPost:   {},
	http.MethodPut:    {},
	http.MethodPatch:  {},
	http.MethodDelete: {},
}

// Writer is a Chi middleware that checks whether the authenticated user
// has write access. Viewers are denied on mutation methods (POST, PUT,
// PATCH, DELETE) with a 403 Forbidden response.
func Writer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, isMutation := mutationMethods[r.Method]; isMutation {
			user := UserFromContext(r.Context())
			if user == nil {
				errors.Unauthorized("Not authenticated").WriteJSON(w, r.URL.Path)
				return
			}
			if user.Role == "viewer" {
				errors.Forbidden("Viewers have read-only access").WriteJSON(w, r.URL.Path)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
