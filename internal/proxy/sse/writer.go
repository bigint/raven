package sse

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// WriteSSE writes a single Server-Sent Event data frame and flushes the response.
func WriteSSE(w http.ResponseWriter, data any) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal SSE data: %w", err)
	}

	_, err = fmt.Fprintf(w, "data: %s\n\n", jsonData)
	if err != nil {
		return fmt.Errorf("write SSE data: %w", err)
	}

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}

// WriteSSERaw writes a raw string as an SSE data frame and flushes the response.
func WriteSSERaw(w http.ResponseWriter, data string) error {
	_, err := fmt.Fprintf(w, "data: %s\n\n", data)
	if err != nil {
		return fmt.Errorf("write SSE data: %w", err)
	}

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}

	return nil
}

// WriteDone writes the SSE termination signal and flushes the response.
func WriteDone(w http.ResponseWriter) {
	fmt.Fprint(w, "data: [DONE]\n\n")

	if f, ok := w.(http.Flusher); ok {
		f.Flush()
	}
}

// SetSSEHeaders sets the standard headers for an SSE response.
func SetSSEHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
}
