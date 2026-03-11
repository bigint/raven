CREATE TABLE IF NOT EXISTS budget_configs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    "limit" REAL NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'monthly',
    alert_threshold REAL NOT NULL DEFAULT 0.8,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(entity_type, entity_id)
);
