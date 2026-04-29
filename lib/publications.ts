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
  is_featured: boolean | null;
  is_visible: boolean | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const publicationSelect =
  "id, title, authors, journal, publication_year, doi, publication_type, image_url, is_featured, is_visible, display_order, created_by, created_at, updated_at";

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
  };
}

function orderedPublicationQuery() {
  return supabase
    .from("publications")
    .select(publicationSelect)
    .eq("is_visible", true)
    .order("publication_year", { ascending: false })
    .order("display_order", { ascending: true })
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
