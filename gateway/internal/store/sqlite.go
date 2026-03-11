package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"embed"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

//go:embed migrations/*.sql
var migrations embed.FS

// SQLiteStore implements the Store interface using SQLite.
type SQLiteStore struct {
	db *sql.DB
}

// NewSQLiteStore creates a new SQLite store.
func NewSQLiteStore(path string) (*SQLiteStore, error) {
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=on", path)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("opening sqlite: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("pinging sqlite: %w", err)
	}

	return &SQLiteStore{db: db}, nil
}

// Migrate runs all SQL migration files.
func (s *SQLiteStore) Migrate(ctx context.Context) error {
	migrationFiles := []string{
		"migrations/001_initial.sql",
		"migrations/002_provider_configs.sql",
		"migrations/003_budget_configs.sql",
	}

	for _, file := range migrationFiles {
		data, err := migrations.ReadFile(file)
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", file, err)
		}

		if _, err := s.db.ExecContext(ctx, string(data)); err != nil {
			return fmt.Errorf("executing migration %s: %w", file, err)
		}
	}

	return nil
}

// Close closes the database connection.
func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// --- Organizations ---

// CreateOrg creates a new organization.
func (s *SQLiteStore) CreateOrg(ctx context.Context, org *Org) error {
	now := time.Now().UTC()
	org.CreatedAt = now
	org.UpdatedAt = now

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO organizations (id, name, slug, status, budget, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		org.ID, org.Name, org.Slug, org.Status, org.Budget, org.CreatedAt, org.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating org: %w", err)
	}
	return nil
}

// GetOrg retrieves an organization by ID.
func (s *SQLiteStore) GetOrg(ctx context.Context, id string) (*Org, error) {
	org := &Org{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, status, budget, created_at, updated_at FROM organizations WHERE id = ?`, id).
		Scan(&org.ID, &org.Name, &org.Slug, &org.Status, &org.Budget, &org.CreatedAt, &org.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting org: %w", err)
	}
	return org, nil
}

// ListOrgs lists organizations with pagination.
func (s *SQLiteStore) ListOrgs(ctx context.Context, opts ListOpts) ([]*Org, int, error) {
	opts.Normalize()

	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM organizations`).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting orgs: %w", err)
	}

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, slug, status, budget, created_at, updated_at
		 FROM organizations ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

// UpdateOrg updates an existing organization.
func (s *SQLiteStore) UpdateOrg(ctx context.Context, org *Org) error {
	org.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE organizations SET name = ?, slug = ?, status = ?, budget = ?, updated_at = ? WHERE id = ?`,
		org.Name, org.Slug, org.Status, org.Budget, org.UpdatedAt, org.ID)
	if err != nil {
		return fmt.Errorf("updating org: %w", err)
	}
	return nil
}

// DeleteOrg deletes an organization by ID.
func (s *SQLiteStore) DeleteOrg(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM organizations WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting org: %w", err)
	}
	return nil
}

// --- Teams ---

// CreateTeam creates a new team.
func (s *SQLiteStore) CreateTeam(ctx context.Context, team *Team) error {
	now := time.Now().UTC()
	team.CreatedAt = now
	team.UpdatedAt = now

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO teams (id, org_id, name, slug, budget, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		team.ID, team.OrgID, team.Name, team.Slug, team.Budget, team.CreatedAt, team.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating team: %w", err)
	}
	return nil
}

// GetTeam retrieves a team by ID.
func (s *SQLiteStore) GetTeam(ctx context.Context, id string) (*Team, error) {
	team := &Team{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, org_id, name, slug, budget, created_at, updated_at FROM teams WHERE id = ?`, id).
		Scan(&team.ID, &team.OrgID, &team.Name, &team.Slug, &team.Budget, &team.CreatedAt, &team.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting team: %w", err)
	}
	return team, nil
}

// ListTeams lists teams for an organization with pagination.
func (s *SQLiteStore) ListTeams(ctx context.Context, orgID string, opts ListOpts) ([]*Team, int, error) {
	opts.Normalize()

	var total int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM teams WHERE org_id = ?`, orgID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting teams: %w", err)
	}

	rows, err := s.db.QueryContext(ctx,
		`SELECT id, org_id, name, slug, budget, created_at, updated_at
		 FROM teams WHERE org_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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

// UpdateTeam updates an existing team.
func (s *SQLiteStore) UpdateTeam(ctx context.Context, team *Team) error {
	team.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE teams SET name = ?, slug = ?, budget = ?, updated_at = ? WHERE id = ?`,
		team.Name, team.Slug, team.Budget, team.UpdatedAt, team.ID)
	if err != nil {
		return fmt.Errorf("updating team: %w", err)
	}
	return nil
}

// DeleteTeam deletes a team by ID.
func (s *SQLiteStore) DeleteTeam(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM teams WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting team: %w", err)
	}
	return nil
}

// --- Users ---

// CreateUser creates a new user.
func (s *SQLiteStore) CreateUser(ctx context.Context, user *User) error {
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO users (id, org_id, email, name, role, status, budget, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.OrgID, user.Email, user.Name, user.Role, user.Status, user.Budget,
		user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating user: %w", err)
	}
	return nil
}

// GetUser retrieves a user by ID.
func (s *SQLiteStore) GetUser(ctx context.Context, id string) (*User, error) {
	user := &User{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, org_id, email, name, role, status, budget, created_at, updated_at FROM users WHERE id = ?`, id).
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

// ListUsers lists users with pagination.
func (s *SQLiteStore) ListUsers(ctx context.Context, opts ListOpts) ([]*User, int, error) {
	opts.Normalize()

	query := `SELECT COUNT(*) FROM users WHERE 1=1`
	args := []any{}
	if opts.OrgID != "" {
		query += ` AND org_id = ?`
		args = append(args, opts.OrgID)
	}

	var total int
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting users: %w", err)
	}

	selectQuery := `SELECT id, org_id, email, name, role, status, budget, created_at, updated_at FROM users WHERE 1=1`
	selectArgs := []any{}
	if opts.OrgID != "" {
		selectQuery += ` AND org_id = ?`
		selectArgs = append(selectArgs, opts.OrgID)
	}
	selectQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
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

// UpdateUser updates an existing user.
func (s *SQLiteStore) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET email = ?, name = ?, role = ?, status = ?, budget = ?, updated_at = ? WHERE id = ?`,
		user.Email, user.Name, user.Role, user.Status, user.Budget, user.UpdatedAt, user.ID)
	if err != nil {
		return fmt.Errorf("updating user: %w", err)
	}
	return nil
}

// DeleteUser deletes a user by ID.
func (s *SQLiteStore) DeleteUser(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting user: %w", err)
	}
	return nil
}

// --- Virtual Keys ---

// CreateKey creates a new virtual key.
func (s *SQLiteStore) CreateKey(ctx context.Context, key *VirtualKey) error {
	now := time.Now().UTC()
	key.CreatedAt = now
	key.UpdatedAt = now

	providersJSON, _ := json.Marshal(key.Providers)
	modelsJSON, _ := json.Marshal(key.Models)

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO virtual_keys (id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		key.ID, key.Name, key.KeyHash, key.KeyPrefix, key.OrgID, key.TeamID, key.UserID,
		string(providersJSON), string(modelsJSON), key.RPM, key.TPM, key.Budget, key.BudgetPeriod,
		key.Status, key.ExpiresAt, key.CreatedAt, key.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating key: %w", err)
	}
	return nil
}

// GetKey retrieves a virtual key by ID.
func (s *SQLiteStore) GetKey(ctx context.Context, id string) (*VirtualKey, error) {
	return s.scanKey(s.db.QueryRowContext(ctx,
		`SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE id = ?`, id))
}

// GetKeyByHash retrieves a virtual key by its hash.
func (s *SQLiteStore) GetKeyByHash(ctx context.Context, hash string) (*VirtualKey, error) {
	return s.scanKey(s.db.QueryRowContext(ctx,
		`SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE key_hash = ?`, hash))
}

func (s *SQLiteStore) scanKey(row *sql.Row) (*VirtualKey, error) {
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

// ListKeys lists virtual keys with pagination.
func (s *SQLiteStore) ListKeys(ctx context.Context, opts ListOpts) ([]*VirtualKey, int, error) {
	opts.Normalize()

	query := `SELECT COUNT(*) FROM virtual_keys WHERE 1=1`
	args := []any{}
	if opts.OrgID != "" {
		query += ` AND org_id = ?`
		args = append(args, opts.OrgID)
	}

	var total int
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("counting keys: %w", err)
	}

	selectQuery := `SELECT id, name, key_hash, key_prefix, org_id, team_id, user_id,
		 providers, models, rpm, tpm, budget, budget_period, status, expires_at, created_at, updated_at
		 FROM virtual_keys WHERE 1=1`
	selectArgs := []any{}
	if opts.OrgID != "" {
		selectQuery += ` AND org_id = ?`
		selectArgs = append(selectArgs, opts.OrgID)
	}
	selectQuery += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
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

// UpdateKey updates an existing virtual key.
func (s *SQLiteStore) UpdateKey(ctx context.Context, key *VirtualKey) error {
	key.UpdatedAt = time.Now().UTC()
	providersJSON, _ := json.Marshal(key.Providers)
	modelsJSON, _ := json.Marshal(key.Models)

	_, err := s.db.ExecContext(ctx,
		`UPDATE virtual_keys SET name = ?, providers = ?, models = ?, rpm = ?, tpm = ?,
		 budget = ?, budget_period = ?, status = ?, expires_at = ?, updated_at = ? WHERE id = ?`,
		key.Name, string(providersJSON), string(modelsJSON), key.RPM, key.TPM,
		key.Budget, key.BudgetPeriod, key.Status, key.ExpiresAt, key.UpdatedAt, key.ID)
	if err != nil {
		return fmt.Errorf("updating key: %w", err)
	}
	return nil
}

// DeleteKey deletes a virtual key by ID.
func (s *SQLiteStore) DeleteKey(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM virtual_keys WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting key: %w", err)
	}
	return nil
}

// --- Request Logs ---

// CreateLog records a request log entry.
func (s *SQLiteStore) CreateLog(ctx context.Context, log *RequestLog) error {
	log.CreatedAt = time.Now().UTC()

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO request_logs (id, key_id, org_id, team_id, user_id, provider, model, endpoint,
		 method, status_code, input_tokens, output_tokens, cached_tokens, cost, latency_ms, ttfb_ms,
		 stream, cache_hit, request_body, response_body, error_message, request_headers,
		 response_headers, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

// GetLog retrieves a request log by ID.
func (s *SQLiteStore) GetLog(ctx context.Context, id string) (*RequestLog, error) {
	log := &RequestLog{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, key_id, org_id, team_id, user_id, provider, model, endpoint, method,
		 status_code, input_tokens, output_tokens, cached_tokens, cost, latency_ms, ttfb_ms,
		 stream, cache_hit, request_body, response_body, error_message, request_headers,
		 response_headers, created_at
		 FROM request_logs WHERE id = ?`, id).
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

// ListLogs lists request logs with filtering and cursor pagination.
func (s *SQLiteStore) ListLogs(ctx context.Context, opts LogQueryOpts) ([]*RequestLog, string, error) {
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

	if opts.Cursor != "" {
		query += ` AND id < ?`
		args = append(args, opts.Cursor)
	}
	if opts.KeyID != "" {
		query += ` AND key_id = ?`
		args = append(args, opts.KeyID)
	}
	if opts.OrgID != "" {
		query += ` AND org_id = ?`
		args = append(args, opts.OrgID)
	}
	if opts.Provider != "" {
		query += ` AND provider = ?`
		args = append(args, opts.Provider)
	}
	if opts.Model != "" {
		query += ` AND model = ?`
		args = append(args, opts.Model)
	}

	query += ` ORDER BY created_at DESC LIMIT ?`
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

// GetSpend returns the current spend for an entity in a period.
func (s *SQLiteStore) GetSpend(ctx context.Context, entityType string, entityID string, period string) (float64, error) {
	var spend float64
	err := s.db.QueryRowContext(ctx,
		`SELECT spend FROM budget_tracking WHERE entity_type = ? AND entity_id = ? AND period = ?`,
		entityType, entityID, period).Scan(&spend)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("getting spend: %w", err)
	}
	return spend, nil
}

// IncrementSpend atomically increments the spend for an entity.
func (s *SQLiteStore) IncrementSpend(ctx context.Context, entityType string, entityID string, amount float64) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO budget_tracking (entity_type, entity_id, period, spend, updated_at)
		 VALUES (?, ?, strftime('%Y-%m', 'now'), ?, CURRENT_TIMESTAMP)
		 ON CONFLICT(entity_type, entity_id, period)
		 DO UPDATE SET spend = spend + ?, updated_at = CURRENT_TIMESTAMP`,
		entityType, entityID, amount, amount)
	if err != nil {
		return fmt.Errorf("incrementing spend: %w", err)
	}
	return nil
}

// --- Provider Configs ---

// generateProviderID generates a unique ID with a "prov_" prefix.
func generateProviderID() string {
	b := make([]byte, 12)
	rand.Read(b) //nolint:errcheck
	return "prov_" + hex.EncodeToString(b)
}

// CreateProviderConfig creates a new provider configuration.
// TODO: API key should be encrypted at rest in a production system.
func (s *SQLiteStore) CreateProviderConfig(ctx context.Context, cfg *ProviderConfig) error {
	now := time.Now().UTC()
	cfg.CreatedAt = now
	cfg.UpdatedAt = now

	if cfg.ID == "" {
		cfg.ID = generateProviderID()
	}

	enabled := 0
	if cfg.Enabled {
		enabled = 1
	}

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO provider_configs (id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		cfg.ID, cfg.Name, cfg.DisplayName, cfg.APIKey, cfg.BaseURL, cfg.OrgID, enabled,
		cfg.CreatedAt, cfg.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating provider config: %w", err)
	}
	return nil
}

// GetProviderConfig retrieves a provider configuration by ID.
func (s *SQLiteStore) GetProviderConfig(ctx context.Context, id string) (*ProviderConfig, error) {
	cfg := &ProviderConfig{}
	var enabled int
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at
		 FROM provider_configs WHERE id = ?`, id).
		Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL, &cfg.OrgID,
			&enabled, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting provider config: %w", err)
	}
	cfg.Enabled = enabled == 1
	return cfg, nil
}

// GetProviderConfigByName retrieves a provider configuration by name.
func (s *SQLiteStore) GetProviderConfigByName(ctx context.Context, name string) (*ProviderConfig, error) {
	cfg := &ProviderConfig{}
	var enabled int
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, api_key, base_url, org_id, enabled, created_at, updated_at
		 FROM provider_configs WHERE name = ?`, name).
		Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL, &cfg.OrgID,
			&enabled, &cfg.CreatedAt, &cfg.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("getting provider config by name: %w", err)
	}
	cfg.Enabled = enabled == 1
	return cfg, nil
}

// ListProviderConfigs lists all provider configurations.
func (s *SQLiteStore) ListProviderConfigs(ctx context.Context) ([]*ProviderConfig, error) {
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
		var enabled int
		if err := rows.Scan(&cfg.ID, &cfg.Name, &cfg.DisplayName, &cfg.APIKey, &cfg.BaseURL,
			&cfg.OrgID, &enabled, &cfg.CreatedAt, &cfg.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning provider config: %w", err)
		}
		cfg.Enabled = enabled == 1
		configs = append(configs, cfg)
	}
	return configs, rows.Err()
}

// UpdateProviderConfig updates an existing provider configuration.
// TODO: API key should be encrypted at rest in a production system.
func (s *SQLiteStore) UpdateProviderConfig(ctx context.Context, cfg *ProviderConfig) error {
	cfg.UpdatedAt = time.Now().UTC()

	enabled := 0
	if cfg.Enabled {
		enabled = 1
	}

	_, err := s.db.ExecContext(ctx,
		`UPDATE provider_configs SET name = ?, display_name = ?, api_key = ?, base_url = ?,
		 org_id = ?, enabled = ?, updated_at = ? WHERE id = ?`,
		cfg.Name, cfg.DisplayName, cfg.APIKey, cfg.BaseURL, cfg.OrgID, enabled,
		cfg.UpdatedAt, cfg.ID)
	if err != nil {
		return fmt.Errorf("updating provider config: %w", err)
	}
	return nil
}

// DeleteProviderConfig deletes a provider configuration by ID.
func (s *SQLiteStore) DeleteProviderConfig(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM provider_configs WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting provider config: %w", err)
	}
	return nil
}

// --- Analytics ---

func sqliteTrunc(granularity string) string {
	switch granularity {
	case "minute":
		return `strftime('%Y-%m-%dT%H:%M:00Z', created_at)`
	case "hour":
		return `strftime('%Y-%m-%dT%H:00:00Z', created_at)`
	case "day":
		return `strftime('%Y-%m-%dT00:00:00Z', created_at)`
	case "week":
		return `strftime('%Y-%m-%dT00:00:00Z', created_at, 'weekday 0', '-6 days')`
	case "month":
		return `strftime('%Y-%m-01T00:00:00Z', created_at)`
	default:
		return `strftime('%Y-%m-%dT%H:00:00Z', created_at)`
	}
}

func (s *SQLiteStore) GetAnalyticsUsage(ctx context.Context, opts AnalyticsOpts) (*AnalyticsUsage, error) {
	usage := &AnalyticsUsage{
		RequestsByModel:    make(map[string]int64),
		RequestsByProvider: make(map[string]int64),
		Timeseries:         []TimeseriesPoint{},
	}

	// Totals.
	err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(COUNT(*), 0),
		        COALESCE(SUM(input_tokens + output_tokens), 0),
		        COALESCE(SUM(input_tokens), 0),
		        COALESCE(SUM(output_tokens), 0)
		 FROM request_logs WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).
		Scan(&usage.TotalRequests, &usage.TotalTokens, &usage.TotalInputTokens, &usage.TotalOutputTokens)
	if err != nil {
		return nil, fmt.Errorf("getting usage totals: %w", err)
	}

	// By model.
	rows, err := s.db.QueryContext(ctx,
		`SELECT model, COUNT(*) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?
		 GROUP BY model ORDER BY COUNT(*) DESC`,
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting usage by model: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var model string
		var count int64
		if err := rows.Scan(&model, &count); err != nil {
			return nil, fmt.Errorf("scanning usage by model: %w", err)
		}
		usage.RequestsByModel[model] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating usage by model: %w", err)
	}

	// By provider.
	rows2, err := s.db.QueryContext(ctx,
		`SELECT provider, COUNT(*) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?
		 GROUP BY provider ORDER BY COUNT(*) DESC`,
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting usage by provider: %w", err)
	}
	defer rows2.Close()
	for rows2.Next() {
		var provider string
		var count int64
		if err := rows2.Scan(&provider, &count); err != nil {
			return nil, fmt.Errorf("scanning usage by provider: %w", err)
		}
		usage.RequestsByProvider[provider] = count
	}
	if err := rows2.Err(); err != nil {
		return nil, fmt.Errorf("iterating usage by provider: %w", err)
	}

	// Timeseries.
	trunc := sqliteTrunc(opts.Granularity)
	tsRows, err := s.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT %s AS bucket, COUNT(*)
		 FROM request_logs WHERE created_at >= ? AND created_at < ?
		 GROUP BY bucket ORDER BY bucket`, trunc),
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting usage timeseries: %w", err)
	}
	defer tsRows.Close()
	for tsRows.Next() {
		var ts string
		var val float64
		if err := tsRows.Scan(&ts, &val); err != nil {
			return nil, fmt.Errorf("scanning usage timeseries: %w", err)
		}
		usage.Timeseries = append(usage.Timeseries, TimeseriesPoint{
			Timestamp: ts,
			Value:     val,
		})
	}
	if err := tsRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating usage timeseries: %w", err)
	}

	return usage, nil
}

func (s *SQLiteStore) GetAnalyticsCost(ctx context.Context, opts AnalyticsOpts) (*AnalyticsCost, error) {
	cost := &AnalyticsCost{
		CostByProvider: make(map[string]float64),
		CostByModel:    make(map[string]float64),
		CostByTeam:     make(map[string]float64),
		Timeseries:     []TimeseriesPoint{},
	}

	// Total cost.
	err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).Scan(&cost.TotalCost)
	if err != nil {
		return nil, fmt.Errorf("getting total cost: %w", err)
	}

	// Projected monthly.
	var minTS, maxTS string
	err = s.db.QueryRowContext(ctx,
		`SELECT COALESCE(MIN(created_at), datetime('now')), COALESCE(MAX(created_at), datetime('now'))
		 FROM request_logs WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).Scan(&minTS, &maxTS)
	if err == nil {
		tMin, e1 := time.Parse(time.RFC3339, minTS)
		tMax, e2 := time.Parse(time.RFC3339, maxTS)
		if e1 != nil {
			tMin, e1 = time.Parse("2006-01-02 15:04:05", minTS)
		}
		if e2 != nil {
			tMax, e2 = time.Parse("2006-01-02 15:04:05", maxTS)
		}
		if e1 == nil && e2 == nil {
			days := tMax.Sub(tMin).Hours() / 24
			if days > 0 {
				cost.ProjectedMonthly = cost.TotalCost / days * 30
			}
		}
	}

	// Cache savings.
	err = s.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ? AND cache_hit = 1`,
		opts.Start, opts.End).Scan(&cost.CacheSavings)
	if err != nil {
		return nil, fmt.Errorf("getting cache savings: %w", err)
	}

	// By provider.
	rows, err := s.db.QueryContext(ctx,
		`SELECT provider, COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?
		 GROUP BY provider ORDER BY SUM(cost) DESC`,
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting cost by provider: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var provider string
		var c float64
		if err := rows.Scan(&provider, &c); err != nil {
			return nil, fmt.Errorf("scanning cost by provider: %w", err)
		}
		cost.CostByProvider[provider] = c
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating cost by provider: %w", err)
	}

	// By model.
	rows2, err := s.db.QueryContext(ctx,
		`SELECT model, COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?
		 GROUP BY model ORDER BY SUM(cost) DESC`,
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting cost by model: %w", err)
	}
	defer rows2.Close()
	for rows2.Next() {
		var model string
		var c float64
		if err := rows2.Scan(&model, &c); err != nil {
			return nil, fmt.Errorf("scanning cost by model: %w", err)
		}
		cost.CostByModel[model] = c
	}
	if err := rows2.Err(); err != nil {
		return nil, fmt.Errorf("iterating cost by model: %w", err)
	}

	// By team.
	rows3, err := s.db.QueryContext(ctx,
		`SELECT team_id, COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ? AND team_id != ''
		 GROUP BY team_id ORDER BY SUM(cost) DESC`,
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting cost by team: %w", err)
	}
	defer rows3.Close()
	for rows3.Next() {
		var team string
		var c float64
		if err := rows3.Scan(&team, &c); err != nil {
			return nil, fmt.Errorf("scanning cost by team: %w", err)
		}
		cost.CostByTeam[team] = c
	}
	if err := rows3.Err(); err != nil {
		return nil, fmt.Errorf("iterating cost by team: %w", err)
	}

	// Timeseries.
	trunc := sqliteTrunc(opts.Granularity)
	tsRows, err := s.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT %s AS bucket, COALESCE(SUM(cost), 0)
		 FROM request_logs WHERE created_at >= ? AND created_at < ?
		 GROUP BY bucket ORDER BY bucket`, trunc),
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting cost timeseries: %w", err)
	}
	defer tsRows.Close()
	for tsRows.Next() {
		var ts string
		var val float64
		if err := tsRows.Scan(&ts, &val); err != nil {
			return nil, fmt.Errorf("scanning cost timeseries: %w", err)
		}
		cost.Timeseries = append(cost.Timeseries, TimeseriesPoint{
			Timestamp: ts,
			Value:     val,
		})
	}
	if err := tsRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating cost timeseries: %w", err)
	}

	return cost, nil
}

func (s *SQLiteStore) GetAnalyticsLatency(ctx context.Context, opts AnalyticsOpts) (*AnalyticsLatency, error) {
	latency := &AnalyticsLatency{
		Timeseries: []TimeseriesPoint{},
	}

	// Average.
	err := s.db.QueryRowContext(ctx,
		`SELECT COALESCE(AVG(latency_ms), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).Scan(&latency.AvgLatencyMs)
	if err != nil {
		return nil, fmt.Errorf("getting avg latency: %w", err)
	}

	// Count for percentiles.
	var count int64
	err = s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM request_logs WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).Scan(&count)
	if err != nil {
		return nil, fmt.Errorf("getting latency count: %w", err)
	}

	if count > 0 {
		// P50
		offset50 := int64(float64(count) * 0.5)
		err = s.db.QueryRowContext(ctx,
			`SELECT latency_ms FROM request_logs
			 WHERE created_at >= ? AND created_at < ?
			 ORDER BY latency_ms LIMIT 1 OFFSET ?`,
			opts.Start, opts.End, offset50).Scan(&latency.P50LatencyMs)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("getting p50 latency: %w", err)
		}

		// P95
		offset95 := int64(float64(count) * 0.95)
		if offset95 >= count {
			offset95 = count - 1
		}
		err = s.db.QueryRowContext(ctx,
			`SELECT latency_ms FROM request_logs
			 WHERE created_at >= ? AND created_at < ?
			 ORDER BY latency_ms LIMIT 1 OFFSET ?`,
			opts.Start, opts.End, offset95).Scan(&latency.P95LatencyMs)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("getting p95 latency: %w", err)
		}

		// P99
		offset99 := int64(float64(count) * 0.99)
		if offset99 >= count {
			offset99 = count - 1
		}
		err = s.db.QueryRowContext(ctx,
			`SELECT latency_ms FROM request_logs
			 WHERE created_at >= ? AND created_at < ?
			 ORDER BY latency_ms LIMIT 1 OFFSET ?`,
			opts.Start, opts.End, offset99).Scan(&latency.P99LatencyMs)
		if err != nil && err != sql.ErrNoRows {
			return nil, fmt.Errorf("getting p99 latency: %w", err)
		}
	}

	// Timeseries.
	trunc := sqliteTrunc(opts.Granularity)
	tsRows, err := s.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT %s AS bucket, COALESCE(AVG(latency_ms), 0)
		 FROM request_logs WHERE created_at >= ? AND created_at < ?
		 GROUP BY bucket ORDER BY bucket`, trunc),
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting latency timeseries: %w", err)
	}
	defer tsRows.Close()
	for tsRows.Next() {
		var ts string
		var val float64
		if err := tsRows.Scan(&ts, &val); err != nil {
			return nil, fmt.Errorf("scanning latency timeseries: %w", err)
		}
		latency.Timeseries = append(latency.Timeseries, TimeseriesPoint{
			Timestamp: ts,
			Value:     val,
		})
	}
	if err := tsRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating latency timeseries: %w", err)
	}

	return latency, nil
}

func (s *SQLiteStore) GetAnalyticsCache(ctx context.Context, opts AnalyticsOpts) (*AnalyticsCache, error) {
	cache := &AnalyticsCache{
		Timeseries: []TimeseriesPoint{},
	}

	var totalHits, totalMisses int64
	err := s.db.QueryRowContext(ctx,
		`SELECT
		    COALESCE(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END), 0),
		    COALESCE(SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END), 0)
		 FROM request_logs WHERE created_at >= ? AND created_at < ?`,
		opts.Start, opts.End).Scan(&totalHits, &totalMisses)
	if err != nil {
		return nil, fmt.Errorf("getting cache stats: %w", err)
	}
	cache.TotalHits = totalHits
	cache.TotalMisses = totalMisses
	total := totalHits + totalMisses
	if total > 0 {
		cache.HitRate = float64(totalHits) / float64(total)
		cache.MissRate = float64(totalMisses) / float64(total)
	}

	// Savings.
	err = s.db.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(cost), 0) FROM request_logs
		 WHERE created_at >= ? AND created_at < ? AND cache_hit = 1`,
		opts.Start, opts.End).Scan(&cache.Savings)
	if err != nil {
		return nil, fmt.Errorf("getting cache savings: %w", err)
	}

	// Timeseries (hit rate per bucket).
	trunc := sqliteTrunc(opts.Granularity)
	tsRows, err := s.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT %s AS bucket,
		    CASE WHEN COUNT(*) > 0 THEN
		        CAST(SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*)
		    ELSE 0 END
		 FROM request_logs WHERE created_at >= ? AND created_at < ?
		 GROUP BY bucket ORDER BY bucket`, trunc),
		opts.Start, opts.End)
	if err != nil {
		return nil, fmt.Errorf("getting cache timeseries: %w", err)
	}
	defer tsRows.Close()
	for tsRows.Next() {
		var ts string
		var val float64
		if err := tsRows.Scan(&ts, &val); err != nil {
			return nil, fmt.Errorf("scanning cache timeseries: %w", err)
		}
		cache.Timeseries = append(cache.Timeseries, TimeseriesPoint{
			Timestamp: ts,
			Value:     val,
		})
	}
	if err := tsRows.Err(); err != nil {
		return nil, fmt.Errorf("iterating cache timeseries: %w", err)
	}

	return cache, nil
}

// --- Budget Configs ---

func generateBudgetID() string {
	b := make([]byte, 12)
	rand.Read(b) //nolint:errcheck
	return "bgt_" + hex.EncodeToString(b)
}

func (s *SQLiteStore) ListBudgetConfigs(ctx context.Context) ([]*BudgetConfig, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT bc.id, bc.entity_type, bc.entity_id, bc."limit", bc.period,
		        bc.alert_threshold, bc.created_at, bc.updated_at,
		        COALESCE(bt.spend, 0)
		 FROM budget_configs bc
		 LEFT JOIN budget_tracking bt ON bt.entity_type = bc.entity_type AND bt.entity_id = bc.entity_id
		     AND bt.period = strftime('%Y-%m', 'now')
		 ORDER BY bc.created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("listing budget configs: %w", err)
	}
	defer rows.Close()

	var configs []*BudgetConfig
	for rows.Next() {
		cfg := &BudgetConfig{}
		if err := rows.Scan(&cfg.ID, &cfg.EntityType, &cfg.EntityID, &cfg.Limit, &cfg.Period,
			&cfg.AlertThreshold, &cfg.CreatedAt, &cfg.UpdatedAt, &cfg.CurrentUsage); err != nil {
			return nil, fmt.Errorf("scanning budget config: %w", err)
		}
		configs = append(configs, cfg)
	}
	return configs, rows.Err()
}

func (s *SQLiteStore) CreateBudgetConfig(ctx context.Context, cfg *BudgetConfig) error {
	now := time.Now().UTC()
	cfg.CreatedAt = now
	cfg.UpdatedAt = now
	if cfg.ID == "" {
		cfg.ID = generateBudgetID()
	}
	if cfg.Period == "" {
		cfg.Period = "monthly"
	}
	if cfg.AlertThreshold == 0 {
		cfg.AlertThreshold = 0.8
	}

	_, err := s.db.ExecContext(ctx,
		`INSERT INTO budget_configs (id, entity_type, entity_id, "limit", period, alert_threshold, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		cfg.ID, cfg.EntityType, cfg.EntityID, cfg.Limit, cfg.Period,
		cfg.AlertThreshold, cfg.CreatedAt, cfg.UpdatedAt)
	if err != nil {
		return fmt.Errorf("creating budget config: %w", err)
	}
	return nil
}

func (s *SQLiteStore) UpdateBudgetConfig(ctx context.Context, cfg *BudgetConfig) error {
	cfg.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE budget_configs SET "limit" = ?, period = ?, alert_threshold = ?, updated_at = ?
		 WHERE id = ?`,
		cfg.Limit, cfg.Period, cfg.AlertThreshold, cfg.UpdatedAt, cfg.ID)
	if err != nil {
		return fmt.Errorf("updating budget config: %w", err)
	}
	return nil
}
