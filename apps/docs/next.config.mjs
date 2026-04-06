import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/docs/context7.json",
        destination: "/context7.json"
      }
    ];
  }
};

export default withMDX(config);
