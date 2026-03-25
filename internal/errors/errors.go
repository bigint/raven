package errors

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// ProblemDetails implements RFC 9457
type ProblemDetails struct {
	Type     string         `json:"type"`
	Title    string         `json:"title"`
	Status   int            `json:"status"`
	Detail   string         `json:"detail"`
	Instance string         `json:"instance,omitempty"`
	Extra    map[string]any `json:"-"`
}

func (p ProblemDetails) MarshalJSON() ([]byte, error) {
	type Alias ProblemDetails
	m := make(map[string]any)
	data, _ := json.Marshal(Alias(p))
	_ = json.Unmarshal(data, &m)
	for k, v := range p.Extra {
		m[k] = v
	}
	return json.Marshal(m)
}

// AppError is the base error type for all application errors
type AppError struct {
	Message    string
	StatusCode int
	Code       string
	Details    map[string]any
}

func (e *AppError) Error() string {
	return e.Message
}

func (e *AppError) ToProblemDetails(instance string) ProblemDetails {
	return ProblemDetails{
		Type:     "about:blank",
		Title:    e.Message,
		Status:   e.StatusCode,
		Detail:   e.Message,
		Instance: instance,
		Extra:    e.Details,
	}
}

func (e *AppError) WriteJSON(w http.ResponseWriter, instance string) {
	pd := e.ToProblemDetails(instance)
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(e.StatusCode)
	_ = json.NewEncoder(w).Encode(pd)
}

func NewAppError(statusCode int, code, message string, details ...map[string]any) *AppError {
	var d map[string]any
	if len(details) > 0 {
		d = details[0]
	}
	return &AppError{
		Message:    message,
		StatusCode: statusCode,
		Code:       code,
		Details:    d,
	}
}

// Predefined error constructors
func NotFound(msg ...string) *AppError {
	m := "Not found"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusNotFound, "NOT_FOUND", m)
}

func Unauthorized(msg ...string) *AppError {
	m := "Unauthorized"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusUnauthorized, "UNAUTHORIZED", m)
}

func Forbidden(msg ...string) *AppError {
	m := "Forbidden"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusForbidden, "FORBIDDEN", m)
}

func Validation(msg ...string) *AppError {
	m := "Validation failed"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusBadRequest, "VALIDATION_ERROR", m)
}

func Conflict(msg ...string) *AppError {
	m := "Conflict"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusConflict, "CONFLICT", m)
}

func RateLimit(msg ...string) *AppError {
	m := "Too many requests"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusTooManyRequests, "RATE_LIMITED", m)
}

func GuardrailBlocked(msg string, details ...map[string]any) *AppError {
	return NewAppError(http.StatusForbidden, "GUARDRAIL_BLOCKED", msg, details...)
}

func BudgetExceeded(msg string, details ...map[string]any) *AppError {
	return NewAppError(http.StatusTooManyRequests, "BUDGET_EXCEEDED", msg, details...)
}

func PreconditionFailed(msg ...string) *AppError {
	m := "Precondition failed"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusPreconditionFailed, "PRECONDITION_FAILED", m)
}

func Internal(msg ...string) *AppError {
	m := "Internal server error"
	if len(msg) > 0 {
		m = msg[0]
	}
	return NewAppError(http.StatusInternalServerError, "INTERNAL_ERROR", m)
}

// WriteProblemJSON writes a generic problem details response
func WriteProblemJSON(w http.ResponseWriter, status int, detail, instance string) {
	pd := ProblemDetails{
		Type:     "about:blank",
		Title:    http.StatusText(status),
		Status:   status,
		Detail:   detail,
		Instance: instance,
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(pd)
}

// IsAppError checks if an error is an AppError and returns it
func IsAppError(err error) (*AppError, bool) {
	if appErr, ok := err.(*AppError); ok {
		return appErr, true
	}
	return nil, false
}

// Errorf creates a formatted AppError
func Errorf(statusCode int, code, format string, args ...any) *AppError {
	return NewAppError(statusCode, code, fmt.Sprintf(format, args...))
}
