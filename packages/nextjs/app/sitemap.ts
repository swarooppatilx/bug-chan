import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bugchan.xyz";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = ["", "/bounties", "/bounties/create", "/leaderboard", "/reports", "/about"].map(
    path => ({ url: `${siteUrl}${path}`, lastModified: now, changeFrequency: "daily", priority: path ? 0.8 : 1 }),
  );

  return routes;
}
