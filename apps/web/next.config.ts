import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@raven/types", "@raven/ui"]
};

export default nextConfig;
