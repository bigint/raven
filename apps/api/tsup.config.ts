import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  noExternal: [
    "@raven/auth",
    "@raven/config",
    "@raven/db",
    "@raven/email",
    "@raven/types"
  ]
});
