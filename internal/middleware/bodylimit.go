package middleware

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/bigint/raven/internal/errors"
)

// BodyLimit returns a Chi middleware that rejects requests whose
// Content-Length exceeds maxBytes. When the limit is exceeded a 413
// response with Problem Details JSON (RFC 9457) is returned.
func BodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.ContentLength > maxBytes {
				appErr := errors.NewAppError(
					http.StatusRequestEntityTooLarge,
					"BODY_TOO_LARGE",
					fmt.Sprintf("Request body too large: %s bytes exceeds the %s byte limit",
						strconv.FormatInt(r.ContentLength, 10),
						strconv.FormatInt(maxBytes, 10)),
					map[string]any{
						"maxBytes":      maxBytes,
						"contentLength": r.ContentLength,
					},
				)
				appErr.WriteJSON(w, r.URL.Path)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
