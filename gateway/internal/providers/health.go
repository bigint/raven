package providers

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/bigint-studio/raven/pkg/types"
)

// CircuitState represents the state of a circuit breaker.
type CircuitState int

const (
	// CircuitClosed means the provider is healthy and requests flow normally.
	CircuitClosed CircuitState = iota
	// CircuitOpen means the provider has failed too many times and requests are blocked.
	CircuitOpen
	// CircuitHalfOpen means the circuit is testing whether the provider has recovered.
	CircuitHalfOpen
)

// String returns the string representation of a circuit state.
func (s CircuitState) String() string {
	switch s {
	case CircuitClosed:
		return "closed"
	case CircuitOpen:
		return "open"
	case CircuitHalfOpen:
		return "half_open"
	default:
		return "unknown"
	}
}

// providerState tracks the health of a single provider.
type providerState struct {
	mu           sync.RWMutex
	healthy      bool
	failureCount int
	lastFailure  time.Time
	lastCheck    time.Time
	latency      time.Duration
	circuit      CircuitState
}

// HealthChecker performs periodic health checks on providers.
type HealthChecker struct {
	registry        *Registry
	states          map[string]*providerState
	mu              sync.RWMutex
	interval        time.Duration
	failureThresh   int
	resetTimeout    time.Duration
	client          *http.Client
	cancel          context.CancelFunc
}

// NewHealthChecker creates a new provider health checker.
func NewHealthChecker(registry *Registry, interval time.Duration, failureThresh int, resetTimeout time.Duration) *HealthChecker {
	return &HealthChecker{
		registry:      registry,
		states:        make(map[string]*providerState),
		interval:      interval,
		failureThresh: failureThresh,
		resetTimeout:  resetTimeout,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Start begins periodic health checking.
func (h *HealthChecker) Start(ctx context.Context) {
	ctx, h.cancel = context.WithCancel(ctx)

	// Initialize all providers as healthy.
	for _, name := range h.registry.ListProviders() {
		h.states[name] = &providerState{healthy: true, circuit: CircuitClosed}
	}

	go func() {
		ticker := time.NewTicker(h.interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				h.checkAll(ctx)
			}
		}
	}()
}

// Stop stops the health checker.
func (h *HealthChecker) Stop() {
	if h.cancel != nil {
		h.cancel()
	}
}

// checkAll checks the health of all providers.
func (h *HealthChecker) checkAll(ctx context.Context) {
	for _, name := range h.registry.ListProviders() {
		h.checkProvider(ctx, name)
	}
}

// checkProvider checks the health of a single provider.
func (h *HealthChecker) checkProvider(ctx context.Context, name string) {
	h.mu.Lock()
	state, exists := h.states[name]
	if !exists {
		state = &providerState{healthy: true, circuit: CircuitClosed}
		h.states[name] = state
	}
	h.mu.Unlock()

	spec, ok := h.registry.GetSpec(name)
	if !ok {
		return
	}

	start := time.Now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, spec.BaseURL+"/models", nil)
	if err != nil {
		h.recordFailure(state, name)
		return
	}

	resp, err := h.client.Do(req)
	if err != nil {
		h.recordFailure(state, name)
		return
	}
	resp.Body.Close()

	latency := time.Since(start)

	state.mu.Lock()
	defer state.mu.Unlock()

	state.lastCheck = time.Now()
	state.latency = latency

	if resp.StatusCode < 500 {
		state.healthy = true
		state.failureCount = 0
		state.circuit = CircuitClosed
	} else {
		h.recordFailureLocked(state, name)
	}
}

// recordFailure records a provider failure.
func (h *HealthChecker) recordFailure(state *providerState, name string) {
	state.mu.Lock()
	defer state.mu.Unlock()
	h.recordFailureLocked(state, name)
}

// recordFailureLocked records a failure (caller must hold state.mu).
func (h *HealthChecker) recordFailureLocked(state *providerState, name string) {
	state.failureCount++
	state.lastFailure = time.Now()

	if state.failureCount >= h.failureThresh {
		state.healthy = false
		state.circuit = CircuitOpen
		slog.Warn("circuit breaker opened", "provider", name, "failures", state.failureCount)
	}
}

// RecordSuccess records a successful request to a provider.
func (h *HealthChecker) RecordSuccess(name string) {
	h.mu.RLock()
	state, exists := h.states[name]
	h.mu.RUnlock()
	if !exists {
		return
	}

	state.mu.Lock()
	defer state.mu.Unlock()

	state.healthy = true
	state.failureCount = 0
	state.circuit = CircuitClosed
}

// RecordError records a failed request to a provider.
func (h *HealthChecker) RecordError(name string) {
	h.mu.RLock()
	state, exists := h.states[name]
	h.mu.RUnlock()
	if !exists {
		return
	}

	h.recordFailure(state, name)
}

// IsHealthy returns whether a provider is healthy.
func (h *HealthChecker) IsHealthy(name string) bool {
	h.mu.RLock()
	state, exists := h.states[name]
	h.mu.RUnlock()
	if !exists {
		return true
	}

	state.mu.RLock()
	defer state.mu.RUnlock()

	if state.circuit == CircuitOpen {
		// Check if reset timeout has elapsed.
		if time.Since(state.lastFailure) > h.resetTimeout {
			return true // Allow a test request (half-open).
		}
		return false
	}

	return state.healthy
}

// GetHealth returns the health status of a provider.
func (h *HealthChecker) GetHealth(name string) types.ProviderHealth {
	h.mu.RLock()
	state, exists := h.states[name]
	h.mu.RUnlock()

	if !exists {
		return types.ProviderHealth{
			Name:         name,
			Healthy:      true,
			CircuitState: CircuitClosed.String(),
		}
	}

	state.mu.RLock()
	defer state.mu.RUnlock()

	return types.ProviderHealth{
		Name:          name,
		Healthy:       state.healthy,
		Latency:       float64(state.latency.Milliseconds()),
		FailureCount:  state.failureCount,
		CircuitState:  state.circuit.String(),
		LastCheckUnix: state.lastCheck.Unix(),
	}
}

// GetAllHealth returns health for all providers.
func (h *HealthChecker) GetAllHealth() []types.ProviderHealth {
	names := h.registry.ListProviders()
	result := make([]types.ProviderHealth, len(names))
	for i, name := range names {
		result[i] = h.GetHealth(name)
	}
	return result
}
