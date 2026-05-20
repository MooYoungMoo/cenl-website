import { supabase } from "@/lib/supabase/client";
import { siteMeta } from "@/lib/site-data";

export type SupabaseHomeContent = {
  id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_description: string | null;
  primary_button_label: string | null;
  primary_button_href: string | null;
  secondary_button_label: string | null;
  secondary_button_href: string | null;
  research_highlight_title: string | null;
  research_highlight_description: string | null;
  latest_publications_title: string | null;
  latest_news_title: string | null;
  hero_image_url: string | null;
  hero_gallery_images: unknown;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type HomeHeroGalleryImage = {
  url: string;
  alt: string;
};

export type HomePageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  secondaryButtonLabel: string;
  secondaryButtonHref: string;
  researchHighlightTitle: string;
  researchHighlightDescription: string;
  latestPublicationsTitle: string;
  latestNewsTitle: string;
  heroImageUrl: string;
  heroGalleryImages: HomeHeroGalleryImage[];
};

export const fallbackHomeContent: HomePageContent = {
  heroTitle: siteMeta.name,
  heroSubtitle: siteMeta.shortName,
  heroDescription: siteMeta.tagline,
  primaryButtonLabel: "Our Research",
  primaryButtonHref: "/research",
  secondaryButtonLabel: "Join Us",
  secondaryButtonHref: "/contact",
  researchHighlightTitle:
    "Chemical sensing from material interface to intelligent system",
  researchHighlightDescription:
    "CENL studies how nanomaterials, electronics, and data analysis can work together to detect and interpret chemical signals.",
  latestPublicationsTitle: "Our Latest Publications",
  latestNewsTitle: "Recent activity from CENL",
  heroImageUrl: "",
  heroGalleryImages: [],
};

const homeSelect =
  "id, hero_title, hero_subtitle, hero_description, primary_button_label, primary_button_href, secondary_button_label, secondary_button_href, research_highlight_title, research_highlight_description, latest_publications_title, latest_news_title, hero_image_url, hero_gallery_images, updated_by, created_at, updated_at";

function normalizeHeroGalleryImages(
  images: SupabaseHomeContent["hero_gallery_images"],
): HomeHeroGalleryImage[] {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image, index) => {
      if (typeof image === "string") {
        return { url: image.trim(), alt: `CENL hero photo ${index + 1}` };
      }

      if (!image || typeof image !== "object") {
        return null;
      }

      const item = image as { url?: unknown; alt?: unknown; caption?: unknown };
      const url = typeof item.url === "string" ? item.url.trim() : "";
      const alt =
        typeof item.alt === "string" && item.alt.trim()
          ? item.alt.trim()
          : typeof item.caption === "string" && item.caption.trim()
            ? item.caption.trim()
            : `CENL hero photo ${index + 1}`;

      return url ? { url, alt } : null;
    })
    .filter((image): image is HomeHeroGalleryImage => Boolean(image?.url))
    .slice(0, 5);
}

export function mapHomeContent(content: SupabaseHomeContent): HomePageContent {
  return {
    heroTitle: content.hero_title || fallbackHomeContent.heroTitle,
    heroSubtitle: content.hero_subtitle || fallbackHomeContent.heroSubtitle,
    heroDescription:
      content.hero_description || fallbackHomeContent.heroDescription,
    primaryButtonLabel:
      content.primary_button_label || fallbackHomeContent.primaryButtonLabel,
    primaryButtonHref:
      content.primary_button_href || fallbackHomeContent.primaryButtonHref,
    secondaryButtonLabel:
      content.secondary_button_label || fallbackHomeContent.secondaryButtonLabel,
    secondaryButtonHref:
      content.secondary_button_href || fallbackHomeContent.secondaryButtonHref,
    researchHighlightTitle:
      content.research_highlight_title ||
      fallbackHomeContent.researchHighlightTitle,
    researchHighlightDescription:
      content.research_highlight_description ||
      fallbackHomeContent.researchHighlightDescription,
    latestPublicationsTitle:
      content.latest_publications_title ||
      fallbackHomeContent.latestPublicationsTitle,
    latestNewsTitle: content.latest_news_title || fallbackHomeContent.latestNewsTitle,
    heroImageUrl: content.hero_image_url ?? "",
    heroGalleryImages: normalizeHeroGalleryImages(content.hero_gallery_images),
  };
}

export async function fetchHomeContent() {
  const { data, error } = await supabase
    .from("home_page_content")
    .select(homeSelect)
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapHomeContent(data as SupabaseHomeContent) : null;
}
