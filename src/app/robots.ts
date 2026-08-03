import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/upload",
        "/analytics",
        "/generate-paper",
        "/saved-reports",
        "/settings",
        "/admin",
        "/support/",
        "/evaluation/",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ],
    },
    sitemap: "https://getahead.ai/sitemap.xml",
  };
}
