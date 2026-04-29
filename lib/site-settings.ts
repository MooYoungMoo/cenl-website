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
  siteName: siteMeta.fullName,
  shortName: siteMeta.shortName,
  headerLabel: siteMeta.shortName,
  footerText: "ChemoElectronic Nanomaterials Lab · CENL",
  seoTitle: "ChemoElectronic Nanomaterials Lab (CENL)",
  seoDescription:
    "Chemoelectronic nanomaterials, electronic nose systems, and chemical sensing research.",
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

export function buildSiteMetadata(
  settings: SiteSettingsContent = fallbackSiteSettings,
): Metadata {
  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      images: settings.ogImageUrl ? [settings.ogImageUrl] : undefined,
    },
  };
}
