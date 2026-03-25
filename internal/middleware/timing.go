package middleware

import (
	"fmt"
	"net/http"
	"time"
)

const responseTimeHeader = "X-Response-Time"

// Timing is a Chi middleware that tracks request duration and sets the
// X-Response-Time header (value in milliseconds). The header is written
// via a response wrapper so it is included even when the handler has
// already started writing the body.
func Timing(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		tw := &timingWriter{ResponseWriter: w, start: start}
		next.ServeHTTP(tw, r)
	})
}

// timingWriter intercepts WriteHeader to inject the timing header
// before the status line is flushed.
type timingWriter struct {
	http.ResponseWriter
	start       time.Time
	wroteHeader bool
}

func (tw *timingWriter) WriteHeader(code int) {
	if !tw.wroteHeader {
		elapsed := time.Since(tw.start)
		tw.ResponseWriter.Header().Set(responseTimeHeader, fmt.Sprintf("%.2fms", float64(elapsed.Microseconds())/1000.0))
		tw.wroteHeader = true
	}
	tw.ResponseWriter.WriteHeader(code)
}

func (tw *timingWriter) Write(b []byte) (int, error) {
	if !tw.wroteHeader {
		tw.WriteHeader(http.StatusOK)
	}
	return tw.ResponseWriter.Write(b)
}
