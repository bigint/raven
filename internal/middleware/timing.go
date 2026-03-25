package middleware

import (
	"fmt"
	"net/http"
	"time"
)

const responseTimeHeader = "X-Response-Time"

// Timing is a Chi middleware that tracks request duration and sets the
// X-Response-Time header (value in milliseconds).
func Timing(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		elapsed := time.Since(start)
		w.Header().Set(responseTimeHeader, fmt.Sprintf("%.2fms", float64(elapsed.Microseconds())/1000.0))
	})
}
