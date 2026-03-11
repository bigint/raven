// Package cmd provides CLI commands for the Raven gateway.
package cmd

import (
	"fmt"
	"log/slog"

	"github.com/spf13/cobra"

	"github.com/bigint-studio/raven/internal/config"
	"github.com/bigint-studio/raven/internal/server"
)

var configFile string

// ServeCmd starts the Raven gateway HTTP server.
var ServeCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the Raven gateway server",
	Long:  "Start the Raven AI gateway server with the specified configuration.",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load(configFile)
		if err != nil {
			return fmt.Errorf("loading config: %w", err)
		}

		if err := cfg.Validate(); err != nil {
			return fmt.Errorf("validating config: %w", err)
		}

		slog.Info("starting raven gateway",
			"host", cfg.Server.Host,
			"port", cfg.Server.Port)

		srv, err := server.New(cfg)
		if err != nil {
			return fmt.Errorf("creating server: %w", err)
		}

		return srv.Start()
	},
}

func init() {
	ServeCmd.Flags().StringVarP(&configFile, "config", "c", "", "path to config file")
}
