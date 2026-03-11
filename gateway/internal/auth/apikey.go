package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/bigint-studio/raven/internal/store"
)

// KeyContext holds the auth context for a validated virtual key.
type KeyContext struct {
	KeyID  string
	OrgID  string
	TeamID string
	UserID string
}

// KeyValidator validates virtual API keys.
type KeyValidator struct {
	store store.Store
}

// NewKeyValidator creates a new key validator.
func NewKeyValidator(st store.Store) *KeyValidator {
	return &KeyValidator{store: st}
}

// Validate validates an API key and returns the associated context.
func (v *KeyValidator) Validate(ctx context.Context, apiKey string) (*KeyContext, error) {
	// Validate key format.
	if !isValidKeyFormat(apiKey) {
		return nil, fmt.Errorf("invalid key format")
	}

	// Hash the key for lookup.
	hash := hashKey(apiKey)

	key, err := v.store.GetKeyByHash(ctx, hash)
	if err != nil {
		return nil, fmt.Errorf("looking up key: %w", err)
	}
	if key == nil {
		return nil, fmt.Errorf("key not found")
	}

	// Check if key is active.
	if key.Status != "active" {
		return nil, fmt.Errorf("key is %s", key.Status)
	}

	// Check expiry.
	if key.ExpiresAt != nil && key.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("key has expired")
	}

	return &KeyContext{
		KeyID:  key.ID,
		OrgID:  key.OrgID,
		TeamID: key.TeamID,
		UserID: key.UserID,
	}, nil
}

// isValidKeyFormat checks if the key follows the rk_live_* or rk_test_* format.
func isValidKeyFormat(key string) bool {
	return strings.HasPrefix(key, "rk_live_") || strings.HasPrefix(key, "rk_test_")
}

// hashKey returns the SHA-256 hash of an API key.
func hashKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

// HashKey is a public version of hashKey for use by other packages.
func HashKey(key string) string {
	return hashKey(key)
}
