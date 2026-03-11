package raven

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

func newTestServer(handler http.HandlerFunc) (*httptest.Server, *Client) {
	srv := httptest.NewServer(handler)
	client := NewClient(srv.URL, "test-key", WithMaxRetries(2))
	return srv, client
}

func chatResponseJSON() string {
	resp := ChatCompletionResponse{
		ID:      "chatcmpl-abc123",
		Object:  "chat.completion",
		Created: 1700000000,
		Model:   "openai/gpt-4o",
		Choices: []Choice{
			{
				Index: 0,
				Message: &Message{
					Role:    "assistant",
					Content: "Hello! How can I help you?",
				},
				FinishReason: ptr("stop"),
			},
		},
		Usage: &Usage{
			PromptTokens:     10,
			CompletionTokens: 8,
			TotalTokens:      18,
		},
	}
	b, _ := json.Marshal(resp)
	return string(b)
}

func ptr(s string) *string { return &s }

// ---------------------------------------------------------------------------
// Client creation
// ---------------------------------------------------------------------------

func TestNewClient(t *testing.T) {
	c := NewClient("http://localhost:8080", "key-123")
	if c.baseURL != "http://localhost:8080" {
		t.Fatalf("expected base URL http://localhost:8080, got %s", c.baseURL)
	}
	if c.apiKey != "key-123" {
		t.Fatalf("expected api key key-123, got %s", c.apiKey)
	}
	if c.maxRetries != 3 {
		t.Fatalf("expected default maxRetries 3, got %d", c.maxRetries)
	}
}

func TestNewClientWithOptions(t *testing.T) {
	c := NewClient("http://localhost:8080", "key-123", WithMaxRetries(5))
	if c.maxRetries != 5 {
		t.Fatalf("expected maxRetries 5, got %d", c.maxRetries)
	}
}

// ---------------------------------------------------------------------------
// Chat completions
// ---------------------------------------------------------------------------

func TestCreateChatCompletion(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/v1/chat/completions" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		if auth := r.Header.Get("Authorization"); auth != "Bearer test-key" {
			t.Fatalf("unexpected auth header: %s", auth)
		}

		var req ChatCompletionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Fatalf("decoding request: %v", err)
		}
		if req.Model != "openai/gpt-4o" {
			t.Fatalf("expected model openai/gpt-4o, got %s", req.Model)
		}

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, chatResponseJSON())
	})
	defer srv.Close()

	resp, err := client.CreateChatCompletion(context.Background(), ChatCompletionRequest{
		Model: "openai/gpt-4o",
		Messages: []Message{
			{Role: "user", Content: "Hello"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ID != "chatcmpl-abc123" {
		t.Fatalf("expected id chatcmpl-abc123, got %s", resp.ID)
	}
	content, ok := resp.Choices[0].Message.Content.(string)
	if !ok || content != "Hello! How can I help you?" {
		t.Fatalf("unexpected content: %v", resp.Choices[0].Message.Content)
	}
	if resp.Usage.TotalTokens != 18 {
		t.Fatalf("expected 18 total tokens, got %d", resp.Usage.TotalTokens)
	}
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

func TestCreateChatCompletionStream(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)

		chunks := []ChatCompletionChunk{
			{
				ID: "chatcmpl-abc123", Object: "chat.completion.chunk",
				Created: 1700000000, Model: "openai/gpt-4o",
				Choices: []StreamChoice{
					{Index: 0, Delta: Message{Role: "assistant", Content: "Hello"}},
				},
			},
			{
				ID: "chatcmpl-abc123", Object: "chat.completion.chunk",
				Created: 1700000000, Model: "openai/gpt-4o",
				Choices: []StreamChoice{
					{Index: 0, Delta: Message{Role: "assistant", Content: "!"}, FinishReason: ptr("stop")},
				},
			},
		}

		for _, chunk := range chunks {
			data, _ := json.Marshal(chunk)
			fmt.Fprintf(w, "data: %s\n\n", data)
		}
		fmt.Fprint(w, "data: [DONE]\n\n")
	})
	defer srv.Close()

	stream, err := client.CreateChatCompletionStream(context.Background(), ChatCompletionRequest{
		Model: "openai/gpt-4o",
		Messages: []Message{
			{Role: "user", Content: "Hi"},
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer stream.Close()

	var chunks []ChatCompletionChunk
	for stream.Next() {
		chunks = append(chunks, *stream.Current())
	}
	if err := stream.Err(); err != nil {
		t.Fatalf("stream error: %v", err)
	}

	if len(chunks) != 2 {
		t.Fatalf("expected 2 chunks, got %d", len(chunks))
	}
	c0, ok := chunks[0].Choices[0].Delta.Content.(string)
	if !ok || c0 != "Hello" {
		t.Fatalf("expected first chunk content 'Hello', got %v", chunks[0].Choices[0].Delta.Content)
	}
}

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

func TestCreateEmbedding(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		resp := EmbeddingResponse{
			Object: "list",
			Data: []EmbeddingData{
				{Object: "embedding", Embedding: []float64{0.1, 0.2, 0.3}, Index: 0},
			},
			Model: "openai/text-embedding-3-small",
			Usage: &EmbeddingUsage{PromptTokens: 5, TotalTokens: 5},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})
	defer srv.Close()

	resp, err := client.CreateEmbedding(context.Background(), EmbeddingRequest{
		Model: "openai/text-embedding-3-small",
		Input: "Hello",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 embedding, got %d", len(resp.Data))
	}
	if len(resp.Data[0].Embedding) != 3 {
		t.Fatalf("expected 3 dimensions, got %d", len(resp.Data[0].Embedding))
	}
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

func TestListModels(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		resp := ModelListResponse{
			Object: "list",
			Data: []ModelInfo{
				{ID: "openai/gpt-4o", Object: "model", Created: 1700000000, OwnedBy: "openai"},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})
	defer srv.Close()

	resp, err := client.ListModels(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 model, got %d", len(resp.Data))
	}
	if resp.Data[0].ID != "openai/gpt-4o" {
		t.Fatalf("expected model id openai/gpt-4o, got %s", resp.Data[0].ID)
	}
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

func TestAPIError(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(errorEnvelope{
			Error: &Error{
				Type:    "authentication_error",
				Message: "Invalid API key",
				Code:    "invalid_api_key",
			},
		})
	})
	defer srv.Close()

	_, err := client.CreateChatCompletion(context.Background(), ChatCompletionRequest{
		Model:    "openai/gpt-4o",
		Messages: []Message{{Role: "user", Content: "Hi"}},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	ravenErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T", err)
	}
	if ravenErr.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", ravenErr.StatusCode)
	}
	if ravenErr.Code != "invalid_api_key" {
		t.Fatalf("expected code invalid_api_key, got %s", ravenErr.Code)
	}
	if !strings.Contains(ravenErr.Message, "Invalid API key") {
		t.Fatalf("expected message to contain 'Invalid API key', got %s", ravenErr.Message)
	}
}

func TestPlainTextError(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusBadGateway)
		fmt.Fprint(w, "Bad Gateway")
	})
	defer srv.Close()

	_, err := client.ListModels(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	ravenErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T", err)
	}
	if ravenErr.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected status 502, got %d", ravenErr.StatusCode)
	}
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

func TestRetryOnServerError(t *testing.T) {
	var attempts atomic.Int32
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		n := attempts.Add(1)
		if n == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			fmt.Fprint(w, `{"error":{"message":"server error"}}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, chatResponseJSON())
	})
	defer srv.Close()

	resp, err := client.CreateChatCompletion(context.Background(), ChatCompletionRequest{
		Model:    "openai/gpt-4o",
		Messages: []Message{{Role: "user", Content: "Hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ID != "chatcmpl-abc123" {
		t.Fatalf("expected id chatcmpl-abc123, got %s", resp.ID)
	}
	if attempts.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d", attempts.Load())
	}
}

func TestRetryOn429(t *testing.T) {
	var attempts atomic.Int32
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		n := attempts.Add(1)
		if n == 1 {
			w.Header().Set("Retry-After", "0")
			w.WriteHeader(http.StatusTooManyRequests)
			fmt.Fprint(w, `{"error":{"message":"rate limited"}}`)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, chatResponseJSON())
	})
	defer srv.Close()

	resp, err := client.CreateChatCompletion(context.Background(), ChatCompletionRequest{
		Model:    "openai/gpt-4o",
		Messages: []Message{{Role: "user", Content: "Hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.ID != "chatcmpl-abc123" {
		t.Fatalf("expected id chatcmpl-abc123, got %s", resp.ID)
	}
	if attempts.Load() != 2 {
		t.Fatalf("expected 2 attempts, got %d", attempts.Load())
	}
}

func TestStreamError(t *testing.T) {
	srv, client := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorEnvelope{
			Error: &Error{
				Type:    "invalid_request_error",
				Message: "Invalid model",
				Code:    "invalid_request",
			},
		})
	})
	defer srv.Close()

	_, err := client.CreateChatCompletionStream(context.Background(), ChatCompletionRequest{
		Model:    "invalid-model",
		Messages: []Message{{Role: "user", Content: "Hi"}},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}

	ravenErr, ok := err.(*Error)
	if !ok {
		t.Fatalf("expected *Error, got %T", err)
	}
	if ravenErr.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", ravenErr.StatusCode)
	}
}
