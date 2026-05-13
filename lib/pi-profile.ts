import { supabase } from "@/lib/supabase/client";
import { piProfile } from "@/lib/site-data";

export type PiTimelineItem = {
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
  note: string;
};

export type SupabasePiProfileContent = {
  id: string;
  name: string | null;
  position: string | null;
  affiliation: string | null;
  email_primary: string | null;
  email_secondary: string | null;
  office: string | null;
  phone: string | null;
  photo_url: string | null;
  google_scholar_url: string | null;
  orcid_url: string | null;
  linkedin_url: string | null;
  education_career: unknown;
  professional_experiences: unknown;
  awards_honors: unknown;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PiProfileContent = {
  name: string;
  position: string;
  affiliation: string;
  emails: string[];
  office: string;
  phone: string;
  photoUrl: string;
  externalLinks: {
    label: string;
    url: string;
  }[];
  summary: string;
  educationCareer: PiTimelineItem[];
  professionalExperiences: PiTimelineItem[];
  awardsHonors: PiTimelineItem[];
};

export const piProfileSelect =
  "id, name, position, affiliation, email_primary, email_secondary, office, phone, photo_url, google_scholar_url, orcid_url, linkedin_url, education_career, professional_experiences, awards_honors, updated_by, created_at, updated_at";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitStaticPeriod(period: string) {
  const normalizedPeriod = period
    .replace(/\?\?/g, "–")
    .replace(/\s+–\s+/g, " – ");
  const [startDate, endDate] = normalizedPeriod.split(" – ");

  return {
    startDate: startDate?.trim() ?? "",
    endDate: endDate?.trim() ?? "",
  };
}

function timelineFallback(
  items: typeof piProfile.educationCareer,
): PiTimelineItem[] {
  return items.map((item) => {
    const { startDate, endDate } = splitStaticPeriod(item.period);
    const noteParts = [
      ...(item.advisors ?? []).map((advisor) => `Advisor: ${advisor}`),
      ...(item.details ?? []),
    ];

    return {
      title: item.title,
      organization: "",
      location: item.location ?? "",
      startDate,
      endDate,
      description: item.description ?? "",
      note: noteParts.join("\n"),
    };
  });
}

export const fallbackPiProfileContent: PiProfileContent = {
  name: piProfile.name,
  position: piProfile.position,
  affiliation: piProfile.affiliation.join("\n"),
  emails: piProfile.emails,
  office: "",
  phone: "",
  photoUrl: "",
  externalLinks: piProfile.externalProfiles.map((label) => ({
    label,
    url: "",
  })),
  summary: piProfile.summary,
  educationCareer: timelineFallback(piProfile.educationCareer),
  professionalExperiences: timelineFallback(piProfile.professionalExperiences),
  awardsHonors: timelineFallback(piProfile.awardsHonors),
};

function parseTimelineItems(value: unknown, fallback: PiTimelineItem[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = normalizeText(record.title);

      if (!title) {
        return null;
      }

      return {
        title,
        organization: normalizeText(record.organization),
        location: normalizeText(record.location),
        startDate: normalizeText(record.start_date ?? record.startDate),
        endDate: normalizeText(record.end_date ?? record.endDate),
        description: normalizeText(record.description),
        note: normalizeText(record.note),
      };
    })
    .filter((item): item is PiTimelineItem => Boolean(item));

  return items.length ? items : fallback;
}

function buildSummary(position: string, affiliation: string) {
  const affiliationLine = affiliation
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");

  return [position, affiliationLine].filter(Boolean).join(", ");
}

export function mapPiProfileContent(
  content: SupabasePiProfileContent,
): PiProfileContent {
  const name = content.name || fallbackPiProfileContent.name;
  const position = content.position || fallbackPiProfileContent.position;
  const affiliation =
    content.affiliation || fallbackPiProfileContent.affiliation;
  const emails = [content.email_primary, content.email_secondary]
    .map((email) => email?.trim())
    .filter((email): email is string => Boolean(email));

  return {
    name,
    position,
    affiliation,
    emails: emails.length ? emails : fallbackPiProfileContent.emails,
    office: content.office?.trim() ?? "",
    phone: content.phone?.trim() ?? "",
    photoUrl: content.photo_url ?? "",
    externalLinks: [
      { label: "Google Scholar", url: content.google_scholar_url ?? "" },
      { label: "ORCID", url: content.orcid_url ?? "" },
      { label: "LinkedIn", url: content.linkedin_url ?? "" },
    ],
    summary: buildSummary(position, affiliation),
    educationCareer: parseTimelineItems(
      content.education_career,
      fallbackPiProfileContent.educationCareer,
    ),
    professionalExperiences: parseTimelineItems(
      content.professional_experiences,
      fallbackPiProfileContent.professionalExperiences,
    ),
    awardsHonors: parseTimelineItems(
      content.awards_honors,
      fallbackPiProfileContent.awardsHonors,
    ),
  };
}

export async function fetchPiProfileContent() {
  const { data, error } = await supabase
    .from("pi_profile_content")
    .select(piProfileSelect)
    .eq("id", "main")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPiProfileContent(data as SupabasePiProfileContent) : null;
}
