-- Initial schema migration for Raven gateway.

CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    budget REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    budget REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, slug)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    budget REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    budget REAL NOT NULL DEFAULT 0,
    budget_period TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    cost REAL NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    ttfb_ms INTEGER NOT NULL DEFAULT 0,
    stream BOOLEAN NOT NULL DEFAULT FALSE,
    cache_hit BOOLEAN NOT NULL DEFAULT FALSE,
    request_body TEXT DEFAULT '',
    response_body TEXT DEFAULT '',
    error_message TEXT DEFAULT '',
    request_headers TEXT DEFAULT '',
    response_headers TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    period TEXT NOT NULL,
    spend REAL NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id, period)
);

-- Indexes for performance.
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON teams(org_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_org_id ON virtual_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_virtual_keys_key_hash ON virtual_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_key_id ON request_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_org_id ON request_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_provider ON request_logs(provider);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_entity ON budget_tracking(entity_type, entity_id, period);
