// Package guardrails provides safety guardrails for the Raven gateway.
package guardrails

import (
	"context"
	"log/slog"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/pkg/types"
)

// PIIDetector defines the interface for PII detection.
type PIIDetector interface {
	// Detect scans text for PII and returns detected entities.
	Detect(ctx context.Context, text string) ([]PIIEntity, error)
	// Redact replaces PII in text with placeholders.
	Redact(ctx context.Context, text string) (string, error)
}

// PIIEntity represents a detected PII entity.
type PIIEntity struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	Start int    `json:"start"`
	End   int    `json:"end"`
}

// ContentPolicyChecker defines the interface for content policy checking.
type ContentPolicyChecker interface {
	// Check evaluates content against the policy.
	Check(ctx context.Context, content string) (*PolicyResult, error)
}

// PolicyResult represents the result of a content policy check.
type PolicyResult struct {
	Allowed    bool     `json:"allowed"`
	Violations []string `json:"violations,omitempty"`
}

// Engine is the guardrails engine that runs PII detection and content policy checks.
type Engine struct {
	cfg           *config.GuardrailsConfig
	piiDetector   PIIDetector
	policyChecker ContentPolicyChecker
}

// NewEngine creates a new guardrails engine.
func NewEngine(cfg *config.GuardrailsConfig) *Engine {
	return &Engine{cfg: cfg}
}

// ProcessRequest runs guardrails on the request.
func (e *Engine) ProcessRequest(ctx context.Context, req *types.ProxyRequest) error {
	if !e.cfg.Enabled {
		return nil
	}

	// PII detection placeholder.
	if e.cfg.PIIDetection && e.piiDetector != nil {
		slog.Debug("PII detection is enabled but no detector configured")
	}

	// Content policy placeholder.
	if e.cfg.ContentPolicy.Enabled && e.policyChecker != nil {
		slog.Debug("content policy is enabled but no checker configured")
	}

	return nil
}

// ProcessResponse runs guardrails on the response.
func (e *Engine) ProcessResponse(ctx context.Context, resp *types.ProxyResponse) error {
	if !e.cfg.Enabled {
		return nil
	}

	// Response guardrails placeholder.
	_ = ctx
	_ = resp

	return nil
}
