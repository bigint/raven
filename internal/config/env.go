package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Env struct {
	APIHost                    string
	APIPort                    int
	AppURL                     string
	BetterAuthSecret           string
	BetterAuthURL              string
	DatabaseURL                string
	EncryptionSecret           string
	EncryptionSecretPrevious   string
	NextPublicAPIURL           string
	NodeEnv                    string
	RedisURL                   string
}

func ParseEnv() (*Env, error) {
	env := &Env{
		APIHost: getEnvDefault("API_HOST", "0.0.0.0"),
		APIPort: getEnvInt("API_PORT", 4000),
		AppURL:  os.Getenv("APP_URL"),
		BetterAuthSecret: os.Getenv("BETTER_AUTH_SECRET"),
		BetterAuthURL:    os.Getenv("BETTER_AUTH_URL"),
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		EncryptionSecret: os.Getenv("ENCRYPTION_SECRET"),
		EncryptionSecretPrevious: os.Getenv("ENCRYPTION_SECRET_PREVIOUS"),
		NextPublicAPIURL: os.Getenv("NEXT_PUBLIC_API_URL"),
		NodeEnv:          getEnvDefault("NODE_ENV", "development"),
		RedisURL:         os.Getenv("REDIS_URL"),
	}

	var missing []string
	if env.AppURL == "" {
		missing = append(missing, "APP_URL")
	}
	if env.BetterAuthSecret == "" || len(env.BetterAuthSecret) < 16 {
		missing = append(missing, "BETTER_AUTH_SECRET (min 16 chars)")
	}
	if env.BetterAuthURL == "" {
		missing = append(missing, "BETTER_AUTH_URL")
	}
	if env.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if env.EncryptionSecret == "" || len(env.EncryptionSecret) < 32 {
		missing = append(missing, "ENCRYPTION_SECRET (min 32 chars)")
	}
	if env.NextPublicAPIURL == "" {
		missing = append(missing, "NEXT_PUBLIC_API_URL")
	}
	if env.RedisURL == "" {
		missing = append(missing, "REDIS_URL")
	}

	if len(missing) > 0 {
		return nil, fmt.Errorf("invalid environment variables:\n  %s", strings.Join(missing, "\n  "))
	}

	return env, nil
}

func (e *Env) IsProduction() bool {
	return e.NodeEnv == "production"
}

func getEnvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
