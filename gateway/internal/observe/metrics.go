package observe

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds all Prometheus metrics for the Raven gateway.
type Metrics struct {
	RequestsTotal      *prometheus.CounterVec
	RequestDuration    *prometheus.HistogramVec
	TTFB               *prometheus.HistogramVec
	TokensTotal        *prometheus.CounterVec
	CostTotal          *prometheus.CounterVec
	CacheHitRatio      prometheus.Gauge
	ProviderHealth     *prometheus.GaugeVec
	BudgetUtilization  *prometheus.GaugeVec
	ActiveConnections  prometheus.Gauge
}

// NewMetrics creates and registers all Prometheus metrics.
func NewMetrics() *Metrics {
	return &Metrics{
		RequestsTotal: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "raven_requests_total",
			Help: "Total number of proxy requests processed.",
		}, []string{"provider", "model", "status", "endpoint"}),

		RequestDuration: promauto.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "raven_request_duration_seconds",
			Help:    "Request duration in seconds.",
			Buckets: prometheus.DefBuckets,
		}, []string{"provider", "model", "endpoint"}),

		TTFB: promauto.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "raven_ttfb_seconds",
			Help:    "Time to first byte in seconds.",
			Buckets: []float64{0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		}, []string{"provider", "model"}),

		TokensTotal: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "raven_tokens_total",
			Help: "Total number of tokens processed.",
		}, []string{"provider", "model", "type"}),

		CostTotal: promauto.NewCounterVec(prometheus.CounterOpts{
			Name: "raven_cost_usd_total",
			Help: "Total cost in USD.",
		}, []string{"provider", "model"}),

		CacheHitRatio: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "raven_cache_hit_ratio",
			Help: "Cache hit ratio (0-1).",
		}),

		ProviderHealth: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "raven_provider_health",
			Help: "Provider health status (1=healthy, 0=unhealthy).",
		}, []string{"provider"}),

		BudgetUtilization: promauto.NewGaugeVec(prometheus.GaugeOpts{
			Name: "raven_budget_utilization",
			Help: "Budget utilization percentage.",
		}, []string{"entity_type", "entity_id"}),

		ActiveConnections: promauto.NewGauge(prometheus.GaugeOpts{
			Name: "raven_active_connections",
			Help: "Number of active proxy connections.",
		}),
	}
}

// RecordRequest records metrics for a completed request.
func (m *Metrics) RecordRequest(provider, model, status, endpoint string, durationSec, ttfbSec float64, inputTokens, outputTokens int, cost float64) {
	m.RequestsTotal.WithLabelValues(provider, model, status, endpoint).Inc()
	m.RequestDuration.WithLabelValues(provider, model, endpoint).Observe(durationSec)

	if ttfbSec > 0 {
		m.TTFB.WithLabelValues(provider, model).Observe(ttfbSec)
	}

	if inputTokens > 0 {
		m.TokensTotal.WithLabelValues(provider, model, "input").Add(float64(inputTokens))
	}
	if outputTokens > 0 {
		m.TokensTotal.WithLabelValues(provider, model, "output").Add(float64(outputTokens))
	}
	if cost > 0 {
		m.CostTotal.WithLabelValues(provider, model).Add(cost)
	}
}

// UpdateCacheHitRatio updates the cache hit ratio metric.
func (m *Metrics) UpdateCacheHitRatio(ratio float64) {
	m.CacheHitRatio.Set(ratio)
}

// UpdateProviderHealth updates the provider health metric.
func (m *Metrics) UpdateProviderHealth(provider string, healthy bool) {
	val := 0.0
	if healthy {
		val = 1.0
	}
	m.ProviderHealth.WithLabelValues(provider).Set(val)
}
