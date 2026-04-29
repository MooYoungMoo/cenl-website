import { Microscope } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ResearchTopic } from "@/lib/site-data";

export type SupabaseResearchTopic = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  keywords: string[] | null;
  image_url: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const researchSelect =
  "id, title, subtitle, description, keywords, image_url, display_order, is_visible, created_by, created_at, updated_at";

export function mapResearchTopic(topic: SupabaseResearchTopic): ResearchTopic {
  return {
    slug: topic.id,
    title: topic.title,
    summary: topic.subtitle || topic.description,
    subtitle: topic.subtitle ?? undefined,
    description: topic.description,
    points: topic.keywords ?? [],
    imageUrl: topic.image_url ?? undefined,
    imageLabel: "Research topic image placeholder",
    icon: Microscope,
  };
}

export async function fetchVisibleResearchTopics() {
  const { data, error } = await supabase
    .from("research_topics")
    .select(researchSelect)
    .eq("is_visible", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseResearchTopic[]).map(mapResearchTopic);
}
