import type { MetadataRoute } from "next";
import { getSharedUniversities } from "@/lib/data/universities";
import { siteUrl } from "@/lib/site-url";

// The public pages search engines may list: the landing page, log in /
// sign up, and every featured university's page (those are public; see
// lib/route-access.ts). Members-only pages aren't listed.
// Rebuilt at most once an hour, so new featured schools show up.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const universities = await getSharedUniversities().catch(() => []);
  const featured = universities.filter((u) => u.created_by === null && u.is_featured === true);
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
    ...featured.map((u) => ({
      url: `${base}/universities/${u.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      ...(u.fetched_at ? { lastModified: new Date(u.fetched_at) } : {}),
    })),
  ];
}
