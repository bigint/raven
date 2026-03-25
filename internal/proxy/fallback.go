package proxy

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/bigint/raven/internal/config"
	"github.com/bigint/raven/internal/crypto"
	"github.com/bigint/raven/internal/logger"
)

type FallbackProvider struct {
	DecryptedAPIKey    string
	ProviderConfigID   string
	ProviderConfigName string
	ProviderName       string
}

// GetFallbackProviders returns other enabled configs for the same provider type.
// Cross-provider fallback is not supported because the model ID would not
// resolve on a different provider.
func GetFallbackProviders(ctx context.Context, pool *pgxpool.Pool, env *config.Env, primaryConfigID, providerName string) ([]FallbackProvider, error) {
	rows, err := pool.Query(ctx,
		"SELECT id, name, provider, api_key FROM provider_configs WHERE provider = $1 AND is_enabled = true AND id != $2 LIMIT 10",
		providerName, primaryConfigID,
	)
	if err != nil {
		return nil, fmt.Errorf("query fallback providers: %w", err)
	}
	defer rows.Close()

	var results []FallbackProvider
	for rows.Next() {
		var id, name, provider, apiKey string
		if err := rows.Scan(&id, &name, &provider, &apiKey); err != nil {
			continue
		}

		decryptedAPIKey, err := crypto.Decrypt(apiKey, env.EncryptionSecret)
		if err != nil {
			logger.Warn("failed to decrypt fallback provider credentials",
				"provider", provider,
				"providerConfigId", id,
			)
			continue
		}

		results = append(results, FallbackProvider{
			DecryptedAPIKey:    decryptedAPIKey,
			ProviderConfigID:   id,
			ProviderConfigName: name,
			ProviderName:       provider,
		})
	}

	return results, nil
}
