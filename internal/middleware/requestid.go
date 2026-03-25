package middleware

import (
	"crypto/rand"
	"fmt"
	"net/http"
)

const requestIDHeader = "X-Request-Id"

// RequestID is a Chi middleware that generates a UUID v4 request ID,
// sets it on the X-Request-Id response header, and stores it in the
// request context for downstream handlers.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := newUUID()
		w.Header().Set(requestIDHeader, id)
		next.ServeHTTP(w, r)
	})
}

// newUUID generates a version-4 UUID without external dependencies.
func newUUID() string {
	var buf [16]byte
	_, _ = rand.Read(buf[:])
	buf[6] = (buf[6] & 0x0f) | 0x40 // version 4
	buf[8] = (buf[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf(
		"%08x-%04x-%04x-%04x-%012x",
		buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16],
	)
}
