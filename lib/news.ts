import { supabase } from "@/lib/supabase/client";
import type { NewsGalleryImage, NewsItem } from "@/lib/site-data";

export type SupabaseNewsGalleryImage = {
  url: string;
  caption?: string;
};

export type SupabaseNewsPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string | string[] | null;
  event_date: string | null;
  main_image_url: string | null;
  gallery_images: SupabaseNewsGalleryImage[] | null;
  is_featured: boolean | null;
  is_visible: boolean | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const newsSelect =
  "id, slug, title, category, summary, body, event_date, main_image_url, gallery_images, is_featured, is_visible, display_order, created_by, created_at, updated_at";

function formatNewsDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(value));
}

function bodyToParagraphs(body: SupabaseNewsPost["body"]) {
  if (Array.isArray(body)) {
    return body.filter(Boolean);
  }

  if (!body) {
    return [];
  }

  return body
    .split(/\n{2,}|\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function galleryToImages(
  galleryImages: SupabaseNewsPost["gallery_images"],
): NewsGalleryImage[] {
  return (galleryImages ?? [])
    .filter((image) => image.url)
    .map((image, index) => ({
      label: `News gallery image ${index + 1}`,
      url: image.url,
      caption: image.caption,
    }));
}

export function mapNewsPost(post: SupabaseNewsPost): NewsItem {
  return {
    slug: post.slug,
    title: post.title,
    date: formatNewsDate(post.event_date),
    category: post.category as NewsItem["category"],
    summary: post.summary,
    body: bodyToParagraphs(post.body),
    representativeImage: "News image placeholder",
    imageUrl: post.main_image_url?.trim() || undefined,
    galleryImages: galleryToImages(post.gallery_images),
  };
}

function orderedVisibleNewsQuery() {
  return supabase
    .from("news_posts")
    .select(newsSelect)
    .eq("is_visible", true)
    .order("event_date", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });
}

export async function fetchVisibleNewsPosts() {
  const { data, error } = await orderedVisibleNewsQuery();

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseNewsPost[]).map(mapNewsPost);
}

export async function fetchFeaturedNewsPosts(limit = 3) {
  const featured = await orderedVisibleNewsQuery()
    .eq("is_featured", true)
    .limit(limit);

  if (featured.error) {
    throw featured.error;
  }

  if ((featured.data ?? []).length > 0) {
    return ((featured.data ?? []) as SupabaseNewsPost[]).map(mapNewsPost);
  }

  const latest = await orderedVisibleNewsQuery().limit(limit);

  if (latest.error) {
    throw latest.error;
  }

  return ((latest.data ?? []) as SupabaseNewsPost[]).map(mapNewsPost);
}

export async function fetchVisibleNewsPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("news_posts")
    .select(newsSelect)
    .eq("is_visible", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapNewsPost(data as SupabaseNewsPost) : null;
}
