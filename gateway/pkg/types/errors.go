// Package types provides shared type definitions for the Raven gateway.
package types

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// APIError represents a structured error returned by the gateway.
type APIError struct {
	StatusCode int    `json:"-"`
	Type       string `json:"type"`
	Message    string `json:"message"`
	Code       string `json:"code,omitempty"`
	Param      string `json:"param,omitempty"`
	Provider   string `json:"provider,omitempty"`
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf("%s: %s", e.Type, e.Message)
}

// APIErrorEnvelope wraps an APIError for JSON responses.
type APIErrorEnvelope struct {
	Error *APIError `json:"error"`
}

// WriteJSON writes the error as a JSON response.
func (e *APIError) WriteJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(e.StatusCode)
	json.NewEncoder(w).Encode(APIErrorEnvelope{Error: e}) //nolint:errcheck
}

// ProviderError represents an error from an upstream provider.
type ProviderError struct {
	Provider   string `json:"provider"`
	StatusCode int    `json:"status_code"`
	Body       string `json:"body"`
	Err        error  `json:"-"`
}

// Error implements the error interface.
func (e *ProviderError) Error() string {
	return fmt.Sprintf("provider %s returned %d: %s", e.Provider, e.StatusCode, e.Body)
}

// Unwrap returns the underlying error.
func (e *ProviderError) Unwrap() error {
	return e.Err
}

// Common API errors.
var (
	ErrUnauthorized = &APIError{
		StatusCode: http.StatusUnauthorized,
		Type:       "authentication_error",
		Message:    "Invalid or missing API key",
		Code:       "invalid_api_key",
	}

	ErrForbidden = &APIError{
		StatusCode: http.StatusForbidden,
		Type:       "permission_error",
		Message:    "You do not have permission to perform this action",
		Code:       "permission_denied",
	}

	ErrNotFound = &APIError{
		StatusCode: http.StatusNotFound,
		Type:       "not_found_error",
		Message:    "The requested resource was not found",
		Code:       "not_found",
	}

	ErrRateLimited = &APIError{
		StatusCode: http.StatusTooManyRequests,
		Type:       "rate_limit_error",
		Message:    "Rate limit exceeded",
		Code:       "rate_limit_exceeded",
	}

	ErrBudgetExceeded = &APIError{
		StatusCode: http.StatusPaymentRequired,
		Type:       "budget_error",
		Message:    "Budget limit exceeded",
		Code:       "budget_exceeded",
	}

	ErrProviderUnavailable = &APIError{
		StatusCode: http.StatusBadGateway,
		Type:       "provider_error",
		Message:    "All configured providers are unavailable",
		Code:       "provider_unavailable",
	}

	ErrBadRequest = &APIError{
		StatusCode: http.StatusBadRequest,
		Type:       "invalid_request_error",
		Message:    "The request body is invalid",
		Code:       "invalid_request",
	}

	ErrInternal = &APIError{
		StatusCode: http.StatusInternalServerError,
		Type:       "internal_error",
		Message:    "An internal error occurred",
		Code:       "internal_error",
	}
)

// NewAPIError creates a new APIError with the given parameters.
func NewAPIError(statusCode int, errType, message, code string) *APIError {
	return &APIError{
		StatusCode: statusCode,
		Type:       errType,
		Message:    message,
		Code:       code,
	}
}

// NewProviderError creates a new ProviderError.
func NewProviderError(provider string, statusCode int, body string, err error) *ProviderError {
	return &ProviderError{
		Provider:   provider,
		StatusCode: statusCode,
		Body:       body,
		Err:        err,
	}
}
