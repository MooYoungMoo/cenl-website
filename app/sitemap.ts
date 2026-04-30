import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase/client";

type NewsSitemapRecord = {
  slug: string | null;
  event_date: string | null;
  updated_at: string | null;
};

function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredUrl) {
    return configuredUrl.startsWith("http")
      ? configuredUrl
      : `https://${configuredUrl}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function route(
  siteUrl: string,
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

async function fetchVisibleNewsRoutes(siteUrl: string) {
  try {
    const { data, error } = await supabase
      .from("news_posts")
      .select("slug, event_date, updated_at")
      .eq("is_visible", true)
      .order("event_date", { ascending: false });

    if (error) {
      return [];
    }

    return ((data ?? []) as NewsSitemapRecord[])
      .filter((post) => post.slug)
      .map((post) => ({
        url: `${siteUrl}/news/${post.slug}`,
        lastModified: post.updated_at || post.event_date || new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const publicRoutes: MetadataRoute.Sitemap = [
    route(siteUrl, "/", "weekly", 1),
    route(siteUrl, "/research", "monthly", 0.8),
    route(siteUrl, "/members", "monthly", 0.7),
    route(siteUrl, "/members/pi", "monthly", 0.7),
    route(siteUrl, "/members/lab-members", "monthly", 0.7),
    route(siteUrl, "/members/alumni", "yearly", 0.5),
    route(siteUrl, "/publications", "monthly", 0.8),
    route(siteUrl, "/publications/papers", "monthly", 0.8),
    route(siteUrl, "/publications/patents", "yearly", 0.5),
    route(siteUrl, "/news", "weekly", 0.7),
    route(siteUrl, "/contact", "monthly", 0.7),
  ];

  const newsRoutes = await fetchVisibleNewsRoutes(siteUrl);

  return [...publicRoutes, ...newsRoutes];
}
