package proxy

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/bigint-studio/raven/internal/providers"
)

// StreamProxy handles SSE stream proxying.
type StreamProxy struct {
	pool *Pool
}

// NewStreamProxy creates a new stream proxy.
func NewStreamProxy(pool *Pool) *StreamProxy {
	return &StreamProxy{pool: pool}
}

// ProxyStream proxies an SSE stream from an upstream provider to the client.
func (s *StreamProxy) ProxyStream(w http.ResponseWriter, upstreamResp *http.Response, adapter providers.Adapter) error {
	flusher, ok := w.(http.Flusher)
	if !ok {
		return fmt.Errorf("response writer does not support flushing")
	}

	// Set SSE headers.
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	reader := bufio.NewReader(upstreamResp.Body)
	defer upstreamResp.Body.Close()

	for {
		line, err := reader.ReadBytes('\n')
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return fmt.Errorf("reading stream: %w", err)
		}

		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}

		// Handle SSE data lines.
		lineStr := string(line)

		if strings.HasPrefix(lineStr, "data: ") {
			data := strings.TrimPrefix(lineStr, "data: ")

			// Pass through [DONE] signal.
			if data == "[DONE]" {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				flusher.Flush()
				return nil
			}

			// Transform the chunk through the adapter.
			transformed, err := adapter.TransformStreamChunk([]byte(data))
			if err != nil {
				slog.Warn("error transforming stream chunk", "error", err)
				continue
			}

			if transformed == nil {
				continue
			}

			// Check if transformed result is [DONE].
			if string(transformed) == "[DONE]" {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				flusher.Flush()
				return nil
			}

			fmt.Fprintf(w, "data: %s\n\n", string(transformed))
			flusher.Flush()
		} else if strings.HasPrefix(lineStr, "event: ") {
			// Pass through event type for providers that use it (e.g., Anthropic).
			// The data will be on the next line.
			continue
		}
	}
}
