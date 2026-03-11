package store

// TimeseriesPoint represents a single data point in a time series.
type TimeseriesPoint struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"value"`
}

// AnalyticsUsage contains request and token usage analytics.
type AnalyticsUsage struct {
	TotalRequests      int64             `json:"total_requests"`
	TotalTokens        int64             `json:"total_tokens"`
	TotalInputTokens   int64             `json:"total_input_tokens"`
	TotalOutputTokens  int64             `json:"total_output_tokens"`
	RequestsByModel    map[string]int64  `json:"requests_by_model"`
	RequestsByProvider map[string]int64  `json:"requests_by_provider"`
	Timeseries         []TimeseriesPoint `json:"timeseries"`
}

// AnalyticsCost contains cost analytics.
type AnalyticsCost struct {
	TotalCost        float64            `json:"total_cost"`
	CostByProvider   map[string]float64 `json:"cost_by_provider"`
	CostByModel      map[string]float64 `json:"cost_by_model"`
	CostByTeam       map[string]float64 `json:"cost_by_team"`
	ProjectedMonthly float64            `json:"projected_monthly"`
	CacheSavings     float64            `json:"cache_savings"`
	Timeseries       []TimeseriesPoint  `json:"timeseries"`
}

// AnalyticsLatency contains latency analytics with percentiles.
type AnalyticsLatency struct {
	AvgLatencyMs float64           `json:"avg_latency_ms"`
	P50LatencyMs float64           `json:"p50_latency_ms"`
	P95LatencyMs float64           `json:"p95_latency_ms"`
	P99LatencyMs float64           `json:"p99_latency_ms"`
	Timeseries   []TimeseriesPoint `json:"timeseries"`
}

// AnalyticsCache contains cache hit/miss analytics.
type AnalyticsCache struct {
	HitRate      float64           `json:"hit_rate"`
	MissRate     float64           `json:"miss_rate"`
	TotalHits    int64             `json:"total_hits"`
	TotalMisses  int64             `json:"total_misses"`
	StorageBytes int64             `json:"storage_bytes"`
	Savings      float64           `json:"savings"`
	Timeseries   []TimeseriesPoint `json:"timeseries"`
}

// AnalyticsOpts provides filtering options for analytics queries.
type AnalyticsOpts struct {
	Start       string
	End         string
	Granularity string // minute, hour, day, week, month
}
