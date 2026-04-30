import { supabase } from "@/lib/supabase/client";
import type { PublicationItem } from "@/lib/site-data";

export type SupabasePublication = {
  id: string;
  title: string;
  authors: string;
  journal: string;
  publication_year: number | null;
  doi: string | null;
  publication_type: string | null;
  image_url: string | null;
  highlighted_authors: string[] | null;
  lab_contribution: string | null;
  is_cover_article: boolean | null;
  cover_label: string | null;
  is_featured: boolean | null;
  is_visible: boolean | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const publicationSelect =
  "id, title, authors, journal, publication_year, doi, publication_type, image_url, highlighted_authors, lab_contribution, is_cover_article, cover_label, is_featured, is_visible, display_order, created_by, created_at, updated_at";

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function mapPublicationRecord(
  publication: SupabasePublication,
): PublicationItem {
  const doi = publication.doi?.trim() || "TBD";

  return {
    id: publication.id,
    title: publication.title,
    authors: publication.authors,
    journal: publication.journal,
    year: String(publication.publication_year ?? "TBD"),
    label: publication.publication_type?.trim() || "Article",
    doi,
    doiUrl: isUrl(doi) ? doi : undefined,
    imageUrl: publication.image_url?.trim() || undefined,
    imageLabel: "Publication image placeholder",
    citationCount: null,
    highlightedAuthors: publication.highlighted_authors ?? [],
    labContribution: publication.lab_contribution || "none",
    isCoverArticle: publication.is_cover_article === true,
    coverLabel: publication.cover_label?.trim() || undefined,
  };
}

function orderedPublicationQuery() {
  return supabase
    .from("publications")
    .select(publicationSelect)
    .eq("is_visible", true)
    .order("publication_year", { ascending: false })
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function fetchFeaturedPublications() {
  const { data, error } = await orderedPublicationQuery()
    .eq("is_featured", true)
    .limit(9);

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabasePublication[]).map(mapPublicationRecord);
}

export async function fetchVisiblePublications() {
  const { data, error } = await orderedPublicationQuery();

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabasePublication[]).map(mapPublicationRecord);
}

export async function fetchCoverPublications() {
  const { data, error } = await orderedPublicationQuery()
    .eq("is_cover_article", true)
    .limit(12);

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabasePublication[]).map(mapPublicationRecord);
}
