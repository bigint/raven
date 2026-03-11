package raven

import "fmt"

// Error represents a structured error returned by the Raven AI Gateway.
type Error struct {
	// StatusCode is the HTTP status code of the error response.
	StatusCode int `json:"-"`
	// Type categorises the error (e.g. "authentication_error").
	Type string `json:"type"`
	// Code is a machine-readable error code (e.g. "invalid_api_key").
	Code string `json:"code,omitempty"`
	// Message is a human-readable description of the error.
	Message string `json:"message"`
	// Param is the request parameter that caused the error, if applicable.
	Param string `json:"param,omitempty"`
	// Provider is the upstream provider that caused the error, if applicable.
	Provider string `json:"provider,omitempty"`
}

// Error implements the error interface.
func (e *Error) Error() string {
	if e.Type != "" {
		return fmt.Sprintf("raven: %s: %s (status %d)", e.Type, e.Message, e.StatusCode)
	}
	return fmt.Sprintf("raven: %s (status %d)", e.Message, e.StatusCode)
}

// errorEnvelope wraps an Error for JSON deserialisation.
type errorEnvelope struct {
	Error *Error `json:"error"`
}
