// Package proxy provides the core reverse proxy engine for the Raven gateway.
package proxy

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// Pool manages per-provider HTTP clients.
type Pool struct {
	mu      sync.RWMutex
	clients map[string]*http.Client
}

// NewPool creates a new connection pool.
func NewPool() *Pool {
	return &Pool{
		clients: make(map[string]*http.Client),
	}
}

// GetClient returns an HTTP client for the given provider.
func (p *Pool) GetClient(provider string) *http.Client {
	p.mu.RLock()
	client, exists := p.clients[provider]
	p.mu.RUnlock()

	if exists {
		return client
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	// Double-check after acquiring write lock.
	if client, exists = p.clients[provider]; exists {
		return client
	}

	client = &http.Client{
		Timeout: 300 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  false,
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout:   10 * time.Second,
			ResponseHeaderTimeout: 120 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			ForceAttemptHTTP2:     true,
		},
	}

	p.clients[provider] = client
	return client
}

// GetStreamClient returns an HTTP client configured for streaming.
func (p *Pool) GetStreamClient(provider string) *http.Client {
	key := provider + "_stream"

	p.mu.RLock()
	client, exists := p.clients[key]
	p.mu.RUnlock()

	if exists {
		return client
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	if client, exists = p.clients[key]; exists {
		return client
	}

	client = &http.Client{
		Timeout: 0, // No timeout for streaming.
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
			DisableCompression:  true, // Important for SSE.
			DialContext: (&net.Dialer{
				Timeout:   30 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			TLSHandshakeTimeout: 10 * time.Second,
			ForceAttemptHTTP2:   true,
		},
	}

	p.clients[key] = client
	return client
}
