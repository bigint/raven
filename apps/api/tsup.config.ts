import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  entry: ["src/index.ts", "src/cron.ts"],
  format: ["esm"],
  noExternal: [
    "@raven/auth",
    "@raven/config",
    "@raven/db",
    "@raven/email",
    "@raven/types"
  ]
});
