package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// PostgresStore implements the Store interface using PostgreSQL.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore creates a new PostgreSQL store.
func NewPostgresStore(url string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", url)
	if err != nil {
		return nil, fmt.Errorf("opening postgres: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("pinging postgres: %w", err)
	}

	return &PostgresStore{db: db}, nil
}

// Migrate runs database migrations.
func (s *PostgresStore) Migrate(ctx context.Context) error {
	schema := `
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, slug)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS virtual_keys (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    team_id TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    providers TEXT DEFAULT '[]',
    models TEXT DEFAULT '[]',
    rpm INTEGER NOT NULL DEFAULT 0,
    tpm INTEGER NOT NULL DEFAULT 0,
    budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    budget_period TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY,
    key_id TEXT DEFAULT '',
    org_id TEXT DEFAULT '',
    team_id TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'POST',
    status_code INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    cost DOUBLE PRECISION NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    ttfb_ms INTEGER NOT NULL DEFAULT 0,
    stream BOOLEAN NOT NULL DEFAULT FALSE,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    request_body TEXT DEFAULT '',
    response_body TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    request_headers TEXT DEFAULT '',
    response_headers TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_tracking (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    period TEXT NOT NULL,
    spend DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, period)
);

CREATE TABLE IF NOT EXISTS provider_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    api_key TEXT NOT NULL,
    base_url TEXT NOT NULL DEFAULT '',
    org_id TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`

	indexes := `
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_org_id ON virtual_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_key_hash ON virtual_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_key_id ON request_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_org_id ON request_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_provider ON request_logs(provider);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_entity ON budget_tracking(entity_type, entity_id, period);
CREATE INDEX IF NOT EXISTS idx_provider_configs_name ON provider_configs(name);
CREATE INDEX IF NOT EXISTS idx_provider_configs_enabled ON provider_configs(enabled);
`

	if _, err := s.db.ExecContext(ctx, schema); err != nil {
		return fmt.Errorf("creating tables: %w", err)
	}
	if _, err := s.db.ExecContext(ctx, indexes); err != nil {
		return fmt.Errorf("creating indexes: %w", err)
	}
	return nil
}

// Close closes the database connection.
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// --- Organizations ---

func (s *PostgresStore) CreateOrg(ctx context.Context, org *Org) error {
	now := time.Now().UTC()
	org.CreatedAt = now
	org.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO organizations (id, name, slug, status, budget, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		org.ID, org.Name, org.Slug, org.Status, org.Budget, org.CreatedAt, org.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating org: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetOrg(ctx context.Context, id string) (*Org, error) {
	org := &Org{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, status, budget, created_at, updated_at FROM organizations WHERE id = $1`, id).
		Scan(&org.ID, &org.Name, &org.Slug, &org.Status, &org.Budget, &org.CreatedAt, &org.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting org: %w", err)
	}
	return org, nil
}

func (s *PostgresStore) ListOrgs(ctx context.Context, opts ListOpts) ([]*Org, int, error) {
	opts.Normalize()
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting orgs: %w", err)
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, slug, status, budget, created_at, updated_at
		 FROM organizations ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		opts.PerPage, opts.Offset())
	if err != nil {
		return nil, 0, fmt.Errorf("listing orgs: %w", err)
	}
	defer rows.Close()
	var orgs []*Org
	for rows.Next() {
		o := &Org{}
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.Status, &o.Budget, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning org: %w", err)
		}
		orgs = append(orgs, o)
	}
	return orgs, total, rows.Err()
}

func (s *PostgresStore) UpdateOrg(ctx context.Context, org *Org) error {
	org.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE organizations SET name = $1, slug = $2, status = $3, budget = $4, updated_at = $5 WHERE id = $6`,
		org.Name, org.Slug, org.Status, org.Budget, org.UpdatedAt, org.ID)
	if err != nil {
		return fmt.Errorf("updating org: %w", err)
	}
	return nil
}

func (s *PostgresStore) DeleteOrg(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM organizations WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting org: %w", err)
	}
	return nil
}

// --- Teams ---

func (s *PostgresStore) CreateTeam(ctx context.Context, team *Team) error {
	now := time.Now().UTC()
	team.CreatedAt = now
	team.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO teams (id, org_id, name, slug, budget, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		team.ID, team.OrgID, team.Name, team.Slug, team.Budget, team.CreatedAt, team.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating team: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetTeam(ctx context.Context, id string) (*Team, error) {
	team := &Team{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, org_id, name, slug, budget, created_at, updated_at FROM teams WHERE id = $1`, id).
		Scan(&team.ID, &team.OrgID, &team.Name, &team.Slug, &team.Budget, &team.CreatedAt, &team.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting team: %w", err)
	}
	return team, nil
}

func (s *PostgresStore) ListTeams(ctx context.Context, orgID string, opts ListOpts) ([]*Team, int, error) {
	opts.Normalize()
	var total int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM teams WHERE org_id = $1`, orgID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting teams: %w", err)
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, org_id, name, slug, budget, created_at, updated_at
		 FROM teams WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
		orgID, opts.PerPage, opts.Offset())
	if err != nil {
		return nil, 0, fmt.Errorf("listing teams: %w", err)
	}
	defer rows.Close()
	var teams []*Team
	for rows.Next() {
		t := &Team{}
		if err := rows.Scan(&t.ID, &t.OrgID, &t.Name, &t.Slug, &t.Budget, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning team: %w", err)
		}
		teams = append(teams, t)
	}
	return teams, total, rows.Err()
}

func (s *PostgresStore) UpdateTeam(ctx context.Context, team *Team) error {
	team.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE teams SET name = $1, slug = $2, budget = $3, updated_at = $4 WHERE id = $5`,
		team.Name, team.Slug, team.Budget, team.UpdatedAt, team.ID)
	if err != nil {
		return fmt.Errorf("updating team: %w", err)
	}
	return nil
}

func (s *PostgresStore) DeleteTeam(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM teams WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting team: %w", err)
	}
	return nil
}

// --- Users ---

func (s *PostgresStore) CreateUser(ctx context.Context, user *User) error {
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO users (id, org_id, email, name, role, status, budget, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		user.ID, user.OrgID, user.Email, user.Name, user.Role, user.Status, user.Budget,
		user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating user: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetUser(ctx context.Context, id string) (*User, error) {
	user := &User{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, org_id, email, name, role, status, budget, created_at, updated_at FROM users WHERE id = $1`, id).
		Scan(&user.ID, &user.OrgID, &user.Email, &user.Name, &user.Role, &user.Status, &user.Budget,
			&user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting user: %w", err)
	}
	return user, nil
}

func (s *PostgresStore) ListUsers(ctx context.Context, opts ListOpts) ([]*User, int, error) {
	opts.Normalize()
	var total int
	countQuery := `SELECT COUNT(*) FROM users WHERE 1=1`
	args := []any{}
	argIdx := 1
	if opts.OrgID != "" {
		countQuery += fmt.Sprintf(` AND org_id = $%d`, argIdx)
		args = append(args, opts.OrgID)
		argIdx++
	}
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting users: %w", err)
	}

	selectQuery := `SELECT id, org_id, email, name, role, status, budget, created_at, updated_at FROM users WHERE 1=1`
	selectArgs := []any{}
	selectIdx := 1
	if opts.OrgID != "" {
		selectQuery += fmt.Sprintf(` AND org_id = $%d`, selectIdx)
		selectArgs = append(selectArgs, opts.OrgID)
		selectIdx++
	}
	selectQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, selectIdx, selectIdx+1)
	selectArgs = append(selectArgs, opts.PerPage, opts.Offset())

	rows, err := s.db.QueryContext(ctx, selectQuery, selectArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()
	var users []*User
	for rows.Next() {
		u := &User{}
		if err := rows.Scan(&u.ID, &u.OrgID, &u.Email, &u.Name, &u.Role, &u.Status, &u.Budget,
			&u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning user: %w", err)
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (s *PostgresStore) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET email = $1, name = $2, role = $3, status = $4, budget = $5, updated_at = $6 WHERE id = $7`,
		user.Email, user.Name, user.Role, user.Status, user.Budget, user.UpdatedAt, user.ID)
	if err != nil {
		return fmt.Errorf("updating user: %w", err)
	}
	return nil
}

func (s *PostgresStore) DeleteUser(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting user: %w", err)
	}
	return nil
}

// --- Virtual Keys ---

func (s *PostgresStore) CreateKey(ctx context.Context, key *VirtualKey) error {
	now := time.Now().UTC()
	key.CreatedAt = now
	key.UpdatedAt = now
	providersJSON, _ := json.Marshal(key.Providers)
	modelsJSON, _ := json.Marshal(key.Models)
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO virtual_keys (id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
		key.ID, key.Name, key.KeyHash, key.KeyPrefix, key.OrgID, key.TeamID, key.UserID,
		string(providersJSON), string(modelsJSON), key.RPM, key.TPM, key.Budget, key.BudgetPeriod,
		key.Status, key.ExpiresAt, key.CreatedAt, key.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating key: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetKey(ctx context.Context, id string) (*VirtualKey, error) {
	return s.scanKey(s.db.QueryRowContext(ctx,
		`SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE id = $1`, id))
}

func (s *PostgresStore) GetKeyByHash(ctx context.Context, hash string) (*VirtualKey, error) {
	return s.scanKey(s.db.QueryRowContext(ctx,
		`SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE key_hash = $1`, hash))
}

func (s *PostgresStore) scanKey(row *sql.Row) (*VirtualKey, error) {
	key := &VirtualKey{}
	var providersJSON, modelsJSON string
	var expiresAt sql.NullTime
	err := row.Scan(&key.ID, &key.Name, &key.KeyHash, &key.KeyPrefix, &key.OrgID, &key.TeamID,
		&key.UserID, &providersJSON, &modelsJSON, &key.RPM, &key.TPM, &key.Budget,
		&key.BudgetPeriod, &key.Status, &expiresAt, &key.CreatedAt, &key.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scanning key: %w", err)
	}
	json.Unmarshal([]byte(providersJSON), &key.Providers) //nolint:errcheck
	json.Unmarshal([]byte(modelsJSON), &key.Models)       //nolint:errcheck
	if expiresAt.Valid {
		key.ExpiresAt = &expiresAt.Time
	}
	return key, nil
}

func (s *PostgresStore) ListKeys(ctx context.Context, opts ListOpts) ([]*VirtualKey, int, error) {
	opts.Normalize()
	var total int
	countQuery := `SELECT COUNT(*) FROM virtual_keys WHERE 1=1`
	args := []any{}
	argIdx := 1
	if opts.OrgID != "" {
		countQuery += fmt.Sprintf(` AND org_id = $%d`, argIdx)
		args = append(args, opts.OrgID)
		argIdx++
	}
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting keys: %w", err)
	}

	selectQuery := `SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE 1=1`
	selectArgs := []any{}
	selectIdx := 1
	if opts.OrgID != "" {
		selectQuery += fmt.Sprintf(` AND org_id = $%d`, selectIdx)
		selectArgs = append(selectArgs, opts.OrgID)
		selectIdx++
	}
	selectQuery += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, selectIdx, selectIdx+1)
	selectArgs = append(selectArgs, opts.PerPage, opts.Offset())

	rows, err := s.db.QueryContext(ctx, selectQuery, selectArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("listing keys: %w", err)
	}
	defer rows.Close()
	var keys []*VirtualKey
	for rows.Next() {
		key := &VirtualKey{}
		var providersJSON, modelsJSON string
		var expiresAt sql.NullTime
		if err := rows.Scan(&key.ID, &key.Name, &key.KeyHash, &key.KeyPrefix, &key.OrgID,
			&key.TeamID, &key.UserID, &providersJSON, &modelsJSON, &key.RPM, &key.TPM,
			&key.Budget, &key.BudgetPeriod, &key.Status, &expiresAt, &key.CreatedAt, &key.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scanning key: %w", err)
		}
		json.Unmarshal([]byte(providersJSON), &key.Providers) //nolint:errcheck
		json.Unmarshal([]byte(modelsJSON), &key.Models)       //nolint:errcheck
		if expiresAt.Valid {
			key.ExpiresAt = &expiresAt.Time
		}
		keys = append(keys, key)
	}
	return keys, total, rows.Err()
}

func (s *PostgresStore) UpdateKey(ctx context.Context, key *VirtualKey) error {
	key.UpdatedAt = time.Now().UTC()
	providersJSON, _ := json.Marshal(key.Providers)
	modelsJSON, _ := json.Marshal(key.Models)
	_, err := s.db.ExecContext(ctx,
		`UPDATE virtual_keys SET name = $1, providers = $2, models = $3, rpm = $4, tpm = $5,
		 budget = $6, budget_period = $7, status = $8, expires_at = $9, updated_at = $10 WHERE id = $11`,
		key.Name, string(providersJSON), string(modelsJSON), key.RPM, key.TPM,
		key.Budget, key.BudgetPeriod, key.Status, key.ExpiresAt, key.UpdatedAt, key.ID)
	if err != nil {
		return fmt.Errorf("updating key: %w", err)
	}
	return nil
}

func (s *PostgresStore) DeleteKey(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM virtual_keys WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting key: %w", err)
	}
	return nil
}

// --- Request Logs ---

func (s *PostgresStore) CreateLog(ctx context.Context, log *RequestLog) error {
	log.CreatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO request_logs (id, key_id, org_id, team_id, user_id, provider, model, endpoint,
		 method, status_code, input_tokens, output_tokens, cached_tokens, cost, latency_ms, ttfb_ms,
		 stream, cache_hit, request_body, response_body, error_message, request_headers,
		 response_headers, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
		log.ID, log.KeyID, log.OrgID, log.TeamID, log.UserID, log.Provider, log.Model,
		log.Endpoint, log.Method, log.StatusCode, log.InputTokens, log.OutputTokens,
		log.CachedTokens, log.Cost, log.LatencyMs, log.TTFBMs, log.Stream, log.CacheHit,
		log.RequestBody, log.ResponseBody, log.ErrorMessage, log.RequestHeaders,
		log.ResponseHeaders, log.CreatedAt)
	if err != nil {
		return fmt.Errorf("creating log: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetLog(ctx context.Context, id string) (*RequestLog, error) {
	log := &RequestLog{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, key_id, org_id, team_id, user_id, provider, model, endpoint, method,
		 status_code, input_tokens, output_tokens, cached_tokens, cost, latency_ms, ttfb_ms,
		 stream, cache_hit, request_body, response_body, error_message, request_headers,
		 response_headers, created_at
		 FROM request_logs WHERE id = $1`, id).
		Scan(&log.ID, &log.KeyID, &log.OrgID, &log.TeamID, &log.UserID, &log.Provider,
			&log.Model, &log.Endpoint, &log.Method, &log.StatusCode, &log.InputTokens,
			&log.OutputTokens, &log.CachedTokens, &log.Cost, &log.LatencyMs, &log.TTFBMs,
			&log.Stream, &log.CacheHit, &log.RequestBody, &log.ResponseBody, &log.ErrorMessage,
			&log.RequestHeaders, &log.ResponseHeaders, &log.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting log: %w", err)
	}
	return log, nil
}

func (s *PostgresStore) ListLogs(ctx context.Context, opts LogQueryOpts) ([]*RequestLog, string, error) {
	if opts.Limit < 1 {
		opts.Limit = 50
	}
	if opts.Limit > 100 {
		opts.Limit = 100
	}

	query := `SELECT id, key_id, org_id, team_id, user_id, provider, model, endpoint, method,
		 status_code, input_tokens, output_tokens, cached_tokens, cost, latency_ms, ttfb_ms,
		 stream, cache_hit, request_body, response_body, error_message, request_headers,
		 response_headers, created_at FROM request_logs WHERE 1=1`
	args := []any{}
	argIdx := 1

	if opts.Cursor != "" {
		query += fmt.Sprintf(` AND id < $%d`, argIdx)
		args = append(args, opts.Cursor)
		argIdx++
	}
	if opts.KeyID != "" {
		query += fmt.Sprintf(` AND key_id = $%d`, argIdx)
		args = append(args, opts.KeyID)
		argIdx++
	}
	if opts.OrgID != "" {
		query += fmt.Sprintf(` AND org_id = $%d`, argIdx)
		args = append(args, opts.OrgID)
		argIdx++
	}
	if opts.Provider != "" {
		query += fmt.Sprintf(` AND provider = $%d`, argIdx)
		args = append(args, opts.Provider)
		argIdx++
	}
	if opts.Model != "" {
		query += fmt.Sprintf(` AND model = $%d`, argIdx)
		args = append(args, opts.Model)
		argIdx++
	}

	query += fmt.Sprintf(` ORDER BY created_at DESC LIMIT $%d`, argIdx)
	args = append(args, opts.Limit+1)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, "", fmt.Errorf("listing logs: %w", err)
	}
	defer rows.Close()

	var logs []*RequestLog
	for rows.Next() {
		log := &RequestLog{}
		if err := rows.Scan(&log.ID, &log.KeyID, &log.OrgID, &log.TeamID, &log.UserID,
			&log.Provider, &log.Model, &log.Endpoint, &log.Method, &log.StatusCode,
			&log.InputTokens, &log.OutputTokens, &log.CachedTokens, &log.Cost, &log.LatencyMs,
			&log.TTFBMs, &log.Stream, &log.CacheHit, &log.RequestBody, &log.ResponseBody,
			&log.ErrorMessage, &log.RequestHeaders, &log.ResponseHeaders, &log.CreatedAt); err != nil {
			return nil, "", fmt.Errorf("scanning log: %w", err)
		}
		logs = append(logs, log)
	}

	var nextCursor string
	if len(logs) > opts.Limit {
		nextCursor = logs[opts.Limit-1].ID
		logs = logs[:opts.Limit]
	}
	return logs, nextCursor, rows.Err()
}

// --- Budget Tracking ---

func (s *PostgresStore) GetSpend(ctx context.Context, entityType string, entityID string, period string) (float64, error) {
	var spend float64
	err := s.db.QueryRowContext(ctx,
		`SELECT spend FROM budget_tracking WHERE entity_type = $1 AND entity_id = $2 AND period = $3`,
		entityType, entityID, period).Scan(&spend)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("getting spend: %w", err)
	}
	return spend, nil
}

func (s *PostgresStore) IncrementSpend(ctx context.Context, entityType string, entityID string, amount float64) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO budget_tracking (entity_type, entity_id, period, spend, updated_at)
		 VALUES ($1, $2, to_char(NOW(), 'YYYY-MM'), $3, NOW())
		 ON CONFLICT(entity_type, entity_id, period)
		 DO UPDATE SET spend = budget_tracking.spend + $4, updated_at = NOW()`,
		entityType, entityID, amount, amount)
	if err != nil {
		return fmt.Errorf("incrementing spend: %w", err)
	}
	return nil
}

// --- Provider Configs ---

func generatePgProviderID() string {
	b := make([]byte, 12)
	rand.Read(b) //nolint:errcheck
	return "prov_" + hex.EncodeToString(b)
}

func (s *PostgresStore) CreateProviderConfig(ctx context.Context, cfg *ProviderConfig) error {
	now := time.Now().UTC()
	cfg.CreatedAt = now
	cfg.UpdatedAt = now
	if cfg.ID == "" {
		cfg.ID = generatePgProviderID()
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO provider_configs (id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		cfg.ID, cfg.Name, cfg.DisplayName, cfg.APIKey, cfg.BaseURL, cfg.OrgID, cfg.Enabled,
		cfg.CreatedAt, cfg.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating provider config: %w", err)
	}
	return nil
}

func (s *PostgresStore) GetProviderConfig(ctx context.Context, id string) (*ProviderConfig, error) {
	cfg := &ProviderConfig{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at
		 FROM provider_configs WHERE id = $1`, id).
		Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL, &cfg.OrgID,
			&cfg.Enabled, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting provider config: %w", err)
	}
	return cfg, nil
}

func (s *PostgresStore) GetProviderConfigByName(ctx context.Context, name string) (*ProviderConfig, error) {
	cfg := &ProviderConfig{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at
		 FROM provider_configs WHERE name = $1`, name).
		Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL, &cfg.OrgID,
			&cfg.Enabled, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting provider config by name: %w", err)
	}
	return cfg, nil
}

func (s *PostgresStore) ListProviderConfigs(ctx context.Context) ([]*ProviderConfig, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at
		 FROM provider_configs ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("listing provider configs: %w", err)
	}
	defer rows.Close()
	var configs []*ProviderConfig
	for rows.Next() {
		cfg := &ProviderConfig{}
		if err := rows.Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL,
			&cfg.OrgID, &cfg.Enabled, &cfg.CreatedAt, &cfg.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning provider config: %w", err)
		}
		configs = append(configs, cfg)
	}
	return configs, rows.Err()
}

func (s *PostgresStore) UpdateProviderConfig(ctx context.Context, cfg *ProviderConfig) error {
	cfg.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE provider_configs SET name = $1, display_name = $2, api_key = $3, base_url = $4,
		 org_id = $5, enabled = $6, updated_at = $7 WHERE id = $8`,
		cfg.Name, cfg.DisplayName, cfg.APIKey, cfg.BaseURL, cfg.OrgID, cfg.Enabled,
		cfg.UpdatedAt, cfg.ID)
	if err != nil {
		return fmt.Errorf("updating provider config: %w", err)
	}
	return nil
}

func (s *PostgresStore) DeleteProviderConfig(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM provider_configs WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("deleting provider config: %w", err)
	}
	return nil
}
