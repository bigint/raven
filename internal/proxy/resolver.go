package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/errors"
)

// ProviderResolution holds the resolved provider details.
type ProviderResolution struct {
	DecryptedAPIKey    string
	ProviderConfigID   string
	ProviderConfigName string
	ProviderName       string
	UpstreamPath       string
}

// ParsedProviderPath holds the parsed components of a provider path.
type ParsedProviderPath struct {
	ProviderName string
	ConfigID     string
	UpstreamPath string
}

type providerConfigRow struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Provider  string `json:"provider"`
	APIKey    string `json:"apiKey"`
	IsEnabled bool   `json:"isEnabled"`
}

// ParseProviderFromPath extracts provider name, config ID, and upstream path from
// a URL path like "/v1/proxy/anthropic~configId/messages".
func ParseProviderFromPath(reqPath string) ParsedProviderPath {
	// Strip "/v1/proxy/" prefix
	trimmed := strings.TrimPrefix(reqPath, "/v1/proxy/")
	trimmed = strings.TrimPrefix(trimmed, "/")

	segments := strings.SplitN(trimmed, "/", 2)
	providerSegment := segments[0]

	upstreamPath := "/"
	if len(segments) > 1 {
		upstreamPath = "/" + segments[1]
	}

	tildeIdx := strings.Index(providerSegment, "~")
	if tildeIdx == -1 {
		return ParsedProviderPath{
			ProviderName: providerSegment,
			ConfigID:     "",
			UpstreamPath: upstreamPath,
		}
	}

	return ParsedProviderPath{
		ProviderName: providerSegment[:tildeIdx],
		ConfigID:     providerSegment[tildeIdx+1:],
		UpstreamPath: upstreamPath,
	}
}

// ResolveProvider resolves a provider config, decrypts the API key, and returns the resolution.
func ResolveProvider(ctx context.Context, pool *pgxpool.Pool, env *config.Env, reqPath string, rdb *redis.Client, strategy RoutingStrategy) (*ProviderResolution, error) {
	parsed := ParseProviderFromPath(reqPath)

	if parsed.ProviderName == "" {
		return nil, errors.Validation("Provider not specified in path")
	}

	var pc *providerConfigRow

	if parsed.ConfigID != "" {
		// Direct config ID lookup
		resolved, err := loadProviderConfigByID(ctx, pool, rdb, parsed.ConfigID, parsed.ProviderName)
		if err != nil {
			return nil, err
		}
		pc = resolved
	} else if rdb != nil {
		// Use routing strategy
		resolvedID, err := ResolveWithStrategy(ctx, pool, rdb, parsed.ProviderName, strategy)
		if err != nil {
			return nil, err
		}
		resolved, err := loadProviderConfigByID(ctx, pool, rdb, resolvedID, "")
		if err != nil {
			return nil, err
		}
		pc = resolved
	} else {
		// Fallback: random from DB
		resolved, err := loadRandomProviderConfig(ctx, pool, parsed.ProviderName)
		if err != nil {
			return nil, err
		}
		pc = resolved
	}

	if pc == nil {
		msg := fmt.Sprintf("No provider config found for '%s'", parsed.ProviderName)
		if parsed.ConfigID != "" {
			msg = fmt.Sprintf("No provider config found for '%s' with ID '%s'", parsed.ProviderName, parsed.ConfigID)
		}
		return nil, errors.NotFound(msg)
	}

	if !pc.IsEnabled {
		return nil, errors.Forbidden(fmt.Sprintf("Provider '%s' is disabled", parsed.ProviderName))
	}

	decryptedAPIKey, err := crypto.Decrypt(pc.APIKey, env.EncryptionSecret)
	if err != nil {
		return nil, errors.Unauthorized("Failed to decrypt provider credentials")
	}

	return &ProviderResolution{
		DecryptedAPIKey:    decryptedAPIKey,
		ProviderConfigID:   pc.ID,
		ProviderConfigName: pc.Name,
		ProviderName:       parsed.ProviderName,
		UpstreamPath:       parsed.UpstreamPath,
	}, nil
}

func loadProviderConfigByID(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, configID, providerName string) (*providerConfigRow, error) {
	cacheKey := "pc:id:" + configID

	if rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var pc providerConfigRow
			if jsonErr := json.Unmarshal([]byte(cached), &pc); jsonErr == nil {
				return &pc, nil
			}
		}
	}

	var pc providerConfigRow
	var err error

	if providerName != "" {
		err = pool.QueryRow(ctx,
			"SELECT id, name, provider, api_key, is_enabled FROM provider_configs WHERE id = $1 AND provider = $2 LIMIT 1",
			configID, providerName,
		).Scan(&pc.ID, &pc.Name, &pc.Provider, &pc.APIKey, &pc.IsEnabled)
	} else {
		err = pool.QueryRow(ctx,
			"SELECT id, name, provider, api_key, is_enabled FROM provider_configs WHERE id = $1 LIMIT 1",
			configID,
		).Scan(&pc.ID, &pc.Name, &pc.Provider, &pc.APIKey, &pc.IsEnabled)
	}

	if err != nil {
		return nil, nil
	}

	if rdb != nil {
		data, jsonErr := json.Marshal(&pc)
		if jsonErr == nil {
			rdb.Set(ctx, cacheKey, data, 60*time.Second)
		}
	}

	return &pc, nil
}

func loadRandomProviderConfig(ctx context.Context, pool *pgxpool.Pool, providerName string) (*providerConfigRow, error) {
	var pc providerConfigRow
	err := pool.QueryRow(ctx,
		"SELECT id, name, provider, api_key, is_enabled FROM provider_configs WHERE provider = $1 AND is_enabled = true ORDER BY random() LIMIT 1",
		providerName,
	).Scan(&pc.ID, &pc.Name, &pc.Provider, &pc.APIKey, &pc.IsEnabled)

	if err != nil {
		return nil, nil
	}

	return &pc, nil
}
