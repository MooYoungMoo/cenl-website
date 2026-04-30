import { supabase } from "@/lib/supabase/client";
import type { PatentItem } from "@/lib/site-data";

export type SupabasePatent = {
  id: string;
  title: string;
  inventors: string;
  patent_number: string | null;
  application_number: string | null;
  country: string | null;
  status: string | null;
  filing_date: string | null;
  publication_date: string | null;
  registration_date: string | null;
  assignee: string | null;
  description: string | null;
  is_visible: boolean | null;
  display_order: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const patentSelect =
  "id, title, inventors, patent_number, application_number, country, status, filing_date, publication_date, registration_date, assignee, description, is_visible, display_order, created_by, created_at, updated_at";

export function mapPatentRecord(patent: SupabasePatent): PatentItem {
  return {
    id: patent.id,
    title: patent.title,
    inventors: patent.inventors,
    status: patent.status || "Pending",
    patentNumber: patent.patent_number,
    applicationNumber: patent.application_number,
    country: patent.country,
    filingDate: patent.filing_date,
    publicationDate: patent.publication_date,
    registrationDate: patent.registration_date,
    assignee: patent.assignee,
    description: patent.description,
  };
}

export async function fetchVisiblePatents() {
  const { data, error } = await supabase
    .from("patents")
    .select(patentSelect)
    .eq("is_visible", true)
    .order("display_order", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabasePatent[]).map(mapPatentRecord);
}
