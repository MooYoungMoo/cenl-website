import { supabase } from "@/lib/supabase/client";
import type { AlumniProfile, LabMember } from "@/lib/site-data";

export type SupabaseLabMember = {
  id: string;
  name: string;
  member_type: "current" | "alumni" | string;
  role: string | null;
  degree_program: string | null;
  email: string | null;
  biography: string | null;
  current_affiliation: string | null;
  is_lab_manager: boolean | null;
  education: string | null;
  research: string | null;
  selected_publications: string | null;
  current_position: string | null;
  alumni_category: string | null;
  photo_url: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const memberSelect =
  "id, name, member_type, role, degree_program, email, biography, current_affiliation, is_lab_manager, education, research, selected_publications, current_position, alumni_category, photo_url, display_order, is_visible, created_by, created_at, updated_at";

export function mapCurrentMember(member: SupabaseLabMember): LabMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role ?? undefined,
    degree: member.degree_program || "Lab Member",
    education: member.education?.trim() || member.degree_program || "",
    research: member.research?.trim() || member.biography || "",
    selectedPublications: member.selected_publications?.trim() || "",
    isLabManager: member.is_lab_manager === true,
    biography: member.biography ?? "",
    email: member.email ?? "TBD",
    photoUrl: member.photo_url ?? undefined,
  };
}

export function mapAlumniMember(member: SupabaseLabMember): AlumniProfile {
  return {
    id: member.id,
    name: member.name,
    role: member.role || member.degree_program || "Alumni",
    affiliation: member.current_affiliation || "TBD",
    currentPosition:
      member.current_position?.trim() || member.current_affiliation || "",
    alumniCategory: member.alumni_category?.trim() || "",
    contact: member.email ?? "Optional contact placeholder",
    biography: member.biography ?? undefined,
    photoUrl: member.photo_url ?? undefined,
  };
}

function visibleMembersQuery(memberType: "current" | "alumni") {
  return supabase
    .from("lab_members")
    .select(memberSelect)
    .eq("member_type", memberType)
    .eq("is_visible", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
}

export async function fetchCurrentLabMembers() {
  const { data, error } = await visibleMembersQuery("current");

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseLabMember[]).map(mapCurrentMember);
}

export async function fetchAlumniMembers() {
  const { data, error } = await visibleMembersQuery("alumni");

  if (error) {
    throw error;
  }

  return ((data ?? []) as SupabaseLabMember[]).map(mapAlumniMember);
}
