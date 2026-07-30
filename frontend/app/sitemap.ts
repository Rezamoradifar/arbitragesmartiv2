import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://arbhub.site";

const routes = ["", "/dashboard", "/portfolio", "/security", "/partners", "/activity"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "hourly",
    priority: route === "" ? 1 : route === "/security" ? 0.8 : 0.6,
  }));
}
