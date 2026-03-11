// Package pipeline provides the plugin execution pipeline for the Raven gateway.
package pipeline

// Phase represents a phase in the request/response pipeline.
type Phase int

const (
	// PreAuth runs before authentication.
	PreAuth Phase = iota
	// PostAuth runs after authentication.
	PostAuth
	// PreRequest runs before the request is sent upstream.
	PreRequest
	// PostRequest runs after the upstream response is received.
	PostRequest
	// PreResponse runs before the response is sent to the client.
	PreResponse
	// PostResponse runs after the response is sent to the client.
	PostResponse
)

// String returns the string representation of a phase.
func (p Phase) String() string {
	switch p {
	case PreAuth:
		return "pre_auth"
	case PostAuth:
		return "post_auth"
	case PreRequest:
		return "pre_request"
	case PostRequest:
		return "post_request"
	case PreResponse:
		return "pre_response"
	case PostResponse:
		return "post_response"
	default:
		return "unknown"
	}
}
