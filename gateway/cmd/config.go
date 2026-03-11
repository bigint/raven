package cmd

import (
	"fmt"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/bigint-studio/raven/internal/config"
)

// ConfigCmd is the parent command for config operations.
var ConfigCmd = &cobra.Command{
	Use:   "config",
	Short: "Configuration management commands",
}

// configValidateCmd validates a config file.
var configValidateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validate the configuration file",
	Long:  "Parse and validate the Raven configuration file for errors.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfgPath, _ := cmd.Flags().GetString("config")
		cfg, err := config.Load(cfgPath)
		if err != nil {
			return fmt.Errorf("loading config: %w", err)
		}

		if err := cfg.Validate(); err != nil {
			return fmt.Errorf("validation failed: %w", err)
		}

		slog.Info("configuration is valid",
			"host", cfg.Server.Host,
			"port", cfg.Server.Port,
			"store", cfg.Store.Driver,
			"providers", len(cfg.Providers))

		fmt.Println("Configuration is valid.")
		return nil
	},
}

func init() {
	configValidateCmd.Flags().StringP("config", "c", "", "path to config file")
	ConfigCmd.AddCommand(configValidateCmd)
}
