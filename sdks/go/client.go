package raven

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"time"
)

// Client is a Raven AI Gateway client. It provides methods for chat
// completions (including streaming), embeddings, model listing, and admin
// operations. Requests that fail with 5xx or 429 status codes are
// automatically retried with exponential backoff.
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
	maxRetries int
}

// Option configures a [Client].
type Option func(*Client)

// WithTimeout sets the HTTP request timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *Client) {
		c.httpClient.Timeout = d
	}
}

// WithMaxRetries sets the maximum number of retry attempts for transient
// errors. The default is 3.
func WithMaxRetries(n int) Option {
	return func(c *Client) {
		c.maxRetries = n
	}
}

// WithHTTPClient replaces the underlying [http.Client].
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) {
		c.httpClient = hc
	}
}

// NewClient creates a new Raven gateway client.
//
// baseURL is the gateway address (e.g. "http://localhost:8080") and apiKey
// is the API key or virtual key used for authentication.
func NewClient(baseURL, apiKey string, opts ...Option) *Client {
	c := &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
		maxRetries: 3,
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// CreateChatCompletion sends a non-streaming chat completion request.
func (c *Client) CreateChatCompletion(ctx context.Context, req ChatCompletionRequest) (*ChatCompletionResponse, error) {
	req.Stream = false
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	resp, err := c.doWithRetry(ctx, http.MethodPost, "/v1/chat/completions", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result ChatCompletionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	return &result, nil
}

// CreateChatCompletionStream sends a streaming chat completion request and
// returns a [Stream] that yields [ChatCompletionChunk] values.
//
// The caller must call [Stream.Close] when done reading.
func (c *Client) CreateChatCompletionStream(ctx context.Context, req ChatCompletionRequest) (*Stream, error) {
	req.Stream = true
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	httpReq, err := c.newRequest(ctx, http.MethodPost, "/v1/chat/completions", body)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("sending stream request: %w", err)
	}

	if resp.StatusCode >= 400 {
		defer resp.Body.Close()
		return nil, c.parseError(resp)
	}

	return newStream(resp), nil
}

// CreateEmbedding creates embeddings for the given input.
func (c *Client) CreateEmbedding(ctx context.Context, req EmbeddingRequest) (*EmbeddingResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshalling request: %w", err)
	}

	resp, err := c.doWithRetry(ctx, http.MethodPost, "/v1/embeddings", body)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result EmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	return &result, nil
}

// ListModels returns the list of models available through the gateway.
func (c *Client) ListModels(ctx context.Context) (*ModelListResponse, error) {
	resp, err := c.doWithRetry(ctx, http.MethodGet, "/v1/models", nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result ModelListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	return &result, nil
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// newRequest builds an authenticated HTTP request.
func (c *Client) newRequest(ctx context.Context, method, path string, body []byte) (*http.Request, error) {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}

// doWithRetry sends a request with automatic retry and exponential backoff
// for 5xx and 429 responses.
func (c *Client) doWithRetry(ctx context.Context, method, path string, body []byte) (*http.Response, error) {
	var lastResp *http.Response

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		req, err := c.newRequest(ctx, method, path, body)
		if err != nil {
			return nil, err
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			if attempt < c.maxRetries {
				backoff(ctx, attempt, nil)
				continue
			}
			return nil, fmt.Errorf("sending request after %d attempts: %w", c.maxRetries+1, err)
		}

		if resp.StatusCode < 500 && resp.StatusCode != http.StatusTooManyRequests {
			if resp.StatusCode >= 400 {
				defer resp.Body.Close()
				return nil, c.parseError(resp)
			}
			return resp, nil
		}

		// Retryable status; read and discard body before retry.
		lastResp = resp
		if attempt < c.maxRetries {
			io.Copy(io.Discard, resp.Body) //nolint:errcheck
			resp.Body.Close()
			backoff(ctx, attempt, resp)
			continue
		}
	}

	// All retries exhausted; parse the last error response.
	if lastResp != nil {
		defer lastResp.Body.Close()
		return nil, c.parseError(lastResp)
	}

	return nil, &Error{
		StatusCode: 0,
		Type:       "connection_error",
		Message:    fmt.Sprintf("request failed after %d attempts", c.maxRetries+1),
	}
}

// parseError reads an error response body and returns a structured *Error.
func (c *Client) parseError(resp *http.Response) error {
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return &Error{
			StatusCode: resp.StatusCode,
			Message:    "failed to read error response body",
		}
	}

	var envelope errorEnvelope
	if err := json.Unmarshal(data, &envelope); err == nil && envelope.Error != nil {
		envelope.Error.StatusCode = resp.StatusCode
		return envelope.Error
	}

	return &Error{
		StatusCode: resp.StatusCode,
		Message:    string(data),
	}
}

// backoff sleeps with exponential backoff, optionally respecting Retry-After.
func backoff(ctx context.Context, attempt int, resp *http.Response) {
	shift := uint(1) << uint(attempt)
	delay := time.Duration(math.Min(float64(shift)*500, 8000)) * time.Millisecond

	if resp != nil {
		if ra := resp.Header.Get("Retry-After"); ra != "" {
			if secs, err := strconv.ParseFloat(ra, 64); err == nil && secs > 0 {
				delay = time.Duration(secs * float64(time.Second))
			}
		}
	}

	select {
	case <-ctx.Done():
	case <-time.After(delay):
	}
}
