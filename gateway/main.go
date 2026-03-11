// Raven is an open-source AI gateway that provides a unified API for multiple AI providers.
package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/bigint-studio/raven/cmd"
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "raven",
	Short: "Raven AI Gateway",
	Long:  "Raven is an open-source AI gateway that provides a unified API for multiple AI providers.",
}

func init() {
	rootCmd.AddCommand(cmd.ServeCmd)
	rootCmd.AddCommand(cmd.VersionCmd)
	rootCmd.AddCommand(cmd.MigrateCmd)
	rootCmd.AddCommand(cmd.ConfigCmd)
}
