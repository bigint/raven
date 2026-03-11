package store

import (
	"context"
	"database/sql"
	"embed"
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
	data, err := migrations.ReadFile("migrations/001_initial.sql")
	if err != nil {
		return fmt.Errorf("reading migration: %w", err)
	}

	if _, err := s.db.ExecContext(ctx, string(data)); err != nil {
		return fmt.Errorf("executing migration: %w", err)
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
