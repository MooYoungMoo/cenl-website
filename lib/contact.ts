import { supabase } from "@/lib/supabase/client";
import { contactDetails, recruitingInformation } from "@/lib/site-data";

export type SupabaseContactContent = {
  id: string;
  recruiting_title: string | null;
  recruiting_description: string | null;
  recruiting_areas: string[] | null;
  application_emails: string[] | null;
  lab_name: string | null;
  contact_person: string | null;
  contact_role: string | null;
  contact_email: string | null;
  address: string | null;
  map_url: string | null;
  map_embed_url: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ContactPageContent = {
  recruitingTitle: string;
  recruitingDescription: string;
  recruitingAreas: string[];
  applicationEmails: string[];
  labName: string;
  contactPerson: string;
  contactRole: string;
  contactEmail: string;
  address: string;
  mapUrl: string;
  mapEmbedUrl: string;
};

export const fallbackContactContent: ContactPageContent = {
  recruitingTitle: recruitingInformation.title,
  recruitingDescription: recruitingInformation.description,
  recruitingAreas: recruitingInformation.areas,
  applicationEmails: recruitingInformation.applicationContacts,
  labName: contactDetails.lab,
  contactPerson: contactDetails.contactPerson,
  contactRole: contactDetails.role,
  contactEmail: contactDetails.emails[0] ?? "TBD",
  address: contactDetails.address,
  mapUrl: "",
  mapEmbedUrl: "",
};

const contactSelect =
  "id, recruiting_title, recruiting_description, recruiting_areas, application_emails, lab_name, contact_person, contact_role, contact_email, address, map_url, map_embed_url, updated_by, created_at, updated_at";

export function mapContactContent(
  content: SupabaseContactContent,
): ContactPageContent {
  return {
    recruitingTitle:
      content.recruiting_title || fallbackContactContent.recruitingTitle,
    recruitingDescription:
      content.recruiting_description ||
      fallbackContactContent.recruitingDescription,
    recruitingAreas:
      content.recruiting_areas?.length
        ? content.recruiting_areas
        : fallbackContactContent.recruitingAreas,
    applicationEmails:
      content.application_emails?.length
        ? content.application_emails
        : fallbackContactContent.applicationEmails,
    labName: content.lab_name || fallbackContactContent.labName,
    contactPerson:
      content.contact_person || fallbackContactContent.contactPerson,
    contactRole: content.contact_role || fallbackContactContent.contactRole,
    contactEmail: content.contact_email || fallbackContactContent.contactEmail,
    address: content.address || fallbackContactContent.address,
    mapUrl: content.map_url ?? "",
    mapEmbedUrl: content.map_embed_url ?? "",
  };
}

export async function fetchContactContent() {
  const { data, error } = await supabase
    .from("contact_page_content")
    .select(contactSelect)
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapContactContent(data as SupabaseContactContent) : null;
}
