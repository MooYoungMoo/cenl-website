import { supabase } from "@/lib/supabase/client";

export type SupabaseOngoingProject = {
  id: string;
  title: string;
  funding_agency: string | null;
  project_unit: string | null;
  project_number: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const ongoingProjectSelect =
  "id, title, funding_agency, project_unit, project_number, start_date, end_date, description, display_order, is_visible, created_by, created_at, updated_at";

export function formatProjectPeriod(
  startDate: string | null,
  endDate: string | null,
) {
  const formatDate = (value: string | null) => {
    if (!value) {
      return "";
    }

    const [year, month] = value.split("-");

    return year && month ? `${year}.${month}` : value;
  };
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }

  return start || end || "TBD";
}

export async function fetchVisibleOngoingProjects() {
  const { data, error } = await supabase
    .from("ongoing_projects")
    .select(ongoingProjectSelect)
    .eq("is_visible", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SupabaseOngoingProject[];
}
