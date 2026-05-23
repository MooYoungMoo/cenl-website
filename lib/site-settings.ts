import type { Metadata } from "next";
import { supabase } from "@/lib/supabase/client";
import { siteMeta } from "@/lib/site-data";

export type SupabaseSiteSettings = {
  id: string;
  site_name: string | null;
  short_name: string | null;
  header_label: string | null;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
  logo_url: string | null;
  og_image_url: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SiteSettingsContent = {
  siteName: string;
  shortName: string;
  headerLabel: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
  logoUrl: string;
  ogImageUrl: string;
};

export const fallbackSiteSettings: SiteSettingsContent = {
  siteName: siteMeta.name,
  shortName: siteMeta.shortName,
  headerLabel: siteMeta.shortName,
  footerText: "ChemoElectronic Nanomaterials Lab · CENL",
  seoTitle: "ChemoElectronic Nanomaterials Lab",
  seoDescription:
    "Chemoelectronic nanomaterials for gas sensing, electronic nose systems, and materials-based sensing platforms.",
  logoUrl: "",
  ogImageUrl: "",
};

export const siteSettingsSelect =
  "id, site_name, short_name, header_label, footer_text, seo_title, seo_description, logo_url, og_image_url, updated_by, created_at, updated_at";

export function mapSiteSettings(
  settings: SupabaseSiteSettings,
): SiteSettingsContent {
  return {
    siteName: settings.site_name || fallbackSiteSettings.siteName,
    shortName: settings.short_name || fallbackSiteSettings.shortName,
    headerLabel: settings.header_label || fallbackSiteSettings.headerLabel,
    footerText: settings.footer_text || fallbackSiteSettings.footerText,
    seoTitle: settings.seo_title || fallbackSiteSettings.seoTitle,
    seoDescription:
      settings.seo_description || fallbackSiteSettings.seoDescription,
    logoUrl: settings.logo_url ?? "",
    ogImageUrl: settings.og_image_url ?? "",
  };
}

export async function fetchSiteSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select(siteSettingsSelect)
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapSiteSettings(data as SupabaseSiteSettings) : null;
}

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

export function buildSiteMetadata(
  settings: SiteSettingsContent = fallbackSiteSettings,
): Metadata {
  const images = settings.ogImageUrl ? [settings.ogImageUrl] : undefined;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: settings.seoTitle,
      template: `%s | ${settings.shortName}`,
    },
    description: settings.seoDescription,
    applicationName: settings.siteName,
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
    },
    keywords: [
      "CENL",
      "ChemoElectronic Nanomaterials Lab",
      "chemoelectronic nanomaterials",
      "gas sensors",
      "electronic nose systems",
      "materials-based sensing",
    ],
    authors: [{ name: settings.siteName }],
    creator: settings.siteName,
    publisher: settings.siteName,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      siteName: settings.siteName,
      type: "website",
      locale: "en_US",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: settings.seoTitle,
      description: settings.seoDescription,
      images,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
