package cmd

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/store"
)

// MigrateCmd runs database migrations.
var MigrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Run database migrations",
	Long:  "Apply pending database migrations to the configured store.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfgPath, _ := cmd.Flags().GetString("config")
		cfg, err := config.Load(cfgPath)
		if err != nil {
			return fmt.Errorf("loading config: %w", err)
		}

		var st store.Store
		switch cfg.Store.Driver {
		case "sqlite":
			st, err = store.NewSQLiteStore(cfg.Store.SQLite.Path)
		case "postgres":
			st, err = store.NewPostgresStore(cfg.Store.Postgres.URL)
		default:
			return fmt.Errorf("unsupported store driver: %s", cfg.Store.Driver)
		}
		if err != nil {
			return fmt.Errorf("connecting to store: %w", err)
		}
		defer st.Close()

		slog.Info("running migrations", "driver", cfg.Store.Driver)

		if err := st.Migrate(context.Background()); err != nil {
			return fmt.Errorf("running migrations: %w", err)
		}

		slog.Info("migrations completed successfully")
		return nil
	},
}

func init() {
	MigrateCmd.Flags().StringP("config", "c", "", "path to config file")
}
