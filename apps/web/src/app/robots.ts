import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { allow: "/", disallow: ["/api/", "/onboarding/"], userAgent: "*" }
    ],
    sitemap: "https://ravenai.dev/sitemap.xml"
  };
}
