// Package store provides database access for the Raven gateway.
package store

import (
	"context"
	"time"
)

// Store defines the data persistence interface for the Raven gateway.
type Store interface {
	// CreateOrg creates a new organization.
	CreateOrg(ctx context.Context, org *Org) error
	// GetOrg retrieves an organization by ID.
	GetOrg(ctx context.Context, id string) (*Org, error)
	// ListOrgs lists organizations with pagination.
	ListOrgs(ctx context.Context, opts ListOpts) ([]*Org, int, error)
	// UpdateOrg updates an existing organization.
	UpdateOrg(ctx context.Context, org *Org) error
	// DeleteOrg deletes an organization by ID.
	DeleteOrg(ctx context.Context, id string) error

	// CreateTeam creates a new team.
	CreateTeam(ctx context.Context, team *Team) error
	// GetTeam retrieves a team by ID.
	GetTeam(ctx context.Context, id string) (*Team, error)
	// ListTeams lists teams for an organization with pagination.
	ListTeams(ctx context.Context, orgID string, opts ListOpts) ([]*Team, int, error)
	// UpdateTeam updates an existing team.
	UpdateTeam(ctx context.Context, team *Team) error
	// DeleteTeam deletes a team by ID.
	DeleteTeam(ctx context.Context, id string) error

	// CreateUser creates a new user.
	CreateUser(ctx context.Context, user *User) error
	// GetUser retrieves a user by ID.
	GetUser(ctx context.Context, id string) (*User, error)
	// ListUsers lists users with pagination.
	ListUsers(ctx context.Context, opts ListOpts) ([]*User, int, error)
	// UpdateUser updates an existing user.
	UpdateUser(ctx context.Context, user *User) error
	// DeleteUser deletes a user by ID.
	DeleteUser(ctx context.Context, id string) error

	// CreateKey creates a new virtual key.
	CreateKey(ctx context.Context, key *VirtualKey) error
	// GetKey retrieves a virtual key by ID.
	GetKey(ctx context.Context, id string) (*VirtualKey, error)
	// GetKeyByHash retrieves a virtual key by its hash.
	GetKeyByHash(ctx context.Context, hash string) (*VirtualKey, error)
	// ListKeys lists virtual keys with pagination.
	ListKeys(ctx context.Context, opts ListOpts) ([]*VirtualKey, int, error)
	// UpdateKey updates an existing virtual key.
	UpdateKey(ctx context.Context, key *VirtualKey) error
	// DeleteKey deletes a virtual key by ID.
	DeleteKey(ctx context.Context, id string) error

	// CreateLog records a request log entry.
	CreateLog(ctx context.Context, log *RequestLog) error
	// GetLog retrieves a request log by ID.
	GetLog(ctx context.Context, id string) (*RequestLog, error)
	// ListLogs lists request logs with filtering and cursor pagination.
	ListLogs(ctx context.Context, opts LogQueryOpts) ([]*RequestLog, string, error)

	// GetSpend returns the current spend for an entity in a period.
	GetSpend(ctx context.Context, entityType string, entityID string, period string) (float64, error)
	// IncrementSpend atomically increments the spend for an entity.
	IncrementSpend(ctx context.Context, entityType string, entityID string, amount float64) error

	// Migrate runs database migrations.
	Migrate(ctx context.Context) error
	// Close closes the database connection.
	Close() error
}

// Org represents an organization.
type Org struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Status    string    `json:"status"`
	Budget    float64   `json:"budget"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Team represents a team within an organization.
type Team struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Budget    float64   `json:"budget"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// User represents a user.
type User struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	Budget    float64   `json:"budget"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// VirtualKey represents a virtual API key.
type VirtualKey struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	KeyHash      string     `json:"-"`
	KeyPrefix    string     `json:"key_prefix"`
	OrgID        string     `json:"org_id"`
	TeamID       string     `json:"team_id,omitempty"`
	UserID       string     `json:"user_id,omitempty"`
	Providers    []string   `json:"providers,omitempty"`
	Models       []string   `json:"models,omitempty"`
	RPM          int        `json:"rpm,omitempty"`
	TPM          int        `json:"tpm,omitempty"`
	Budget       float64    `json:"budget,omitempty"`
	BudgetPeriod string     `json:"budget_period,omitempty"`
	Status       string     `json:"status"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// RequestLog represents a log entry for a proxied request.
type RequestLog struct {
	ID               string    `json:"id"`
	KeyID            string    `json:"key_id,omitempty"`
	OrgID            string    `json:"org_id,omitempty"`
	TeamID           string    `json:"team_id,omitempty"`
	UserID           string    `json:"user_id,omitempty"`
	Provider         string    `json:"provider"`
	Model            string    `json:"model"`
	Endpoint         string    `json:"endpoint"`
	Method           string    `json:"method"`
	StatusCode       int       `json:"status_code"`
	InputTokens      int       `json:"input_tokens"`
	OutputTokens     int       `json:"output_tokens"`
	CachedTokens     int       `json:"cached_tokens"`
	Cost             float64   `json:"cost"`
	LatencyMs        int64     `json:"latency_ms"`
	TTFBMs           int64     `json:"ttfb_ms"`
	Stream           bool      `json:"stream"`
	CacheHit         bool      `json:"cache_hit"`
	RequestBody      string    `json:"request_body,omitempty"`
	ResponseBody     string    `json:"response_body,omitempty"`
	ErrorMessage     string    `json:"error_message,omitempty"`
	RequestHeaders   string    `json:"request_headers,omitempty"`
	ResponseHeaders  string    `json:"response_headers,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

// ListOpts provides pagination options.
type ListOpts struct {
	Page    int    `json:"page"`
	PerPage int    `json:"per_page"`
	Search  string `json:"search,omitempty"`
	Status  string `json:"status,omitempty"`
	OrgID   string `json:"org_id,omitempty"`
	TeamID  string `json:"team_id,omitempty"`
	UserID  string `json:"user_id,omitempty"`
}

// LogQueryOpts provides filtering options for log queries.
type LogQueryOpts struct {
	Cursor   string `json:"cursor,omitempty"`
	Limit    int    `json:"limit"`
	KeyID    string `json:"key_id,omitempty"`
	OrgID    string `json:"org_id,omitempty"`
	TeamID   string `json:"team_id,omitempty"`
	Provider string `json:"provider,omitempty"`
	Model    string `json:"model,omitempty"`
	Status   string `json:"status,omitempty"`
}

// Normalize sets sane defaults for ListOpts.
func (o *ListOpts) Normalize() {
	if o.Page < 1 {
		o.Page = 1
	}
	if o.PerPage < 1 {
		o.PerPage = 20
	}
	if o.PerPage > 100 {
		o.PerPage = 100
	}
}

// Offset returns the SQL offset for pagination.
func (o *ListOpts) Offset() int {
	return (o.Page - 1) * o.PerPage
}
