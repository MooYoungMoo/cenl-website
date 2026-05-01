"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import {
  fallbackPiProfileContent,
  mapPiProfileContent,
  piProfileSelect,
  type PiProfileContent,
  type PiTimelineItem,
  type SupabasePiProfileContent,
} from "@/lib/pi-profile";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type PiForm = PiProfileContent & {
  emailPrimary: string;
  emailSecondary: string;
  googleScholarUrl: string;
  orcidUrl: string;
  linkedinUrl: string;
};

type TimelineSectionKey =
  | "educationCareer"
  | "professionalExperiences"
  | "awardsHonors";

const emptyTimelineItem: PiTimelineItem = {
  title: "",
  organization: "",
  location: "",
  startDate: "",
  endDate: "",
  description: "",
  note: "",
};

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function canManage(role: string | null) {
  return role === "professor" || role === "admin" || role === "lab_manager";
}

function toPiForm(content: PiProfileContent): PiForm {
  const googleScholarUrl =
    content.externalLinks.find((link) => link.label === "Google Scholar")
      ?.url ?? "";
  const orcidUrl =
    content.externalLinks.find((link) => link.label === "ORCID")?.url ?? "";
  const linkedinUrl =
    content.externalLinks.find((link) => link.label === "LinkedIn")?.url ?? "";

  return {
    ...content,
    emailPrimary: content.emails[0] ?? "",
    emailSecondary: content.emails[1] ?? "",
    googleScholarUrl,
    orcidUrl,
    linkedinUrl,
  };
}

function timelinePayload(items: PiTimelineItem[]) {
  return items
    .filter((item) => item.title.trim())
    .map((item) => ({
      title: item.title.trim(),
      organization: item.organization.trim(),
      location: item.location.trim(),
      start_date: item.startDate.trim(),
      end_date: item.endDate.trim(),
      description: item.description.trim(),
      note: item.note.trim(),
    }));
}

function getPiPayload(form: PiForm, userId: string | null, photoUrl?: string | null) {
  const nextPhotoUrl =
    photoUrl !== undefined ? photoUrl : form.photoUrl.trim() || null;

  return {
    id: "main",
    name: form.name.trim(),
    position: form.position.trim(),
    affiliation: form.affiliation.trim(),
    email_primary: form.emailPrimary.trim(),
    email_secondary: form.emailSecondary.trim() || null,
    photo_url: nextPhotoUrl,
    google_scholar_url: form.googleScholarUrl.trim() || null,
    orcid_url: form.orcidUrl.trim() || null,
    linkedin_url: form.linkedinUrl.trim() || null,
    education_career: timelinePayload(form.educationCareer),
    professional_experiences: timelinePayload(form.professionalExperiences),
    awards_honors: timelinePayload(form.awardsHonors),
    updated_by: userId,
  };
}

function validatePiForm(form: PiForm) {
  if (!form.name.trim()) {
    return "PI name is required.";
  }

  if (!form.position.trim()) {
    return "Position is required.";
  }

  if (!form.affiliation.trim()) {
    return "Affiliation is required.";
  }

  if (!form.emailPrimary.trim()) {
    return "Primary email is required.";
  }

  return "";
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "PI photo must be a JPG, PNG, or WEBP file.";
  }

  if (file.size > maxImageSize) {
    return "PI photo must be 5 MB or smaller.";
  }

  return "";
}

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "image";
  const baseName = name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "pi-photo"}.${extension}`;
}

async function uploadPiPhotoToStorage(file: File) {
  const path = `pi/${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("pi-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("pi-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalPiManagementPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [piForm, setPiForm] = useState<PiForm>(
    toPiForm(fallbackPiProfileContent),
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoCleared, setPhotoCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManagePi = canManage(role);

  const loadPiContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("pi_profile_content")
      .select(piProfileSelect)
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setPiForm(toPiForm(fallbackPiProfileContent));
      return;
    }

    if (data) {
      setPiForm(toPiForm(mapPiProfileContent(data as SupabasePiProfileContent)));
    } else {
      setPiForm(toPiForm(fallbackPiProfileContent));
    }
  }, []);

  const loadAccess = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setCurrentUserId(null);
      setUserIsProjectAdmin(false);
      setErrorMessage("Please sign in again before managing the PI profile.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [profileResult, managersResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("funding_source_managers").select("funding_source_id, user_id"),
    ]);

    if (profileResult.error) {
      setRole(null);
      setErrorMessage(profileResult.error.message);
      setLoading(false);
      return;
    }

    const nextRole =
      ((profileResult.data as Profile | null)?.role ?? null)?.toLowerCase() ??
      null;
    const nextManagers = (managersResult.data ?? []) as FundingSourceManager[];
    const hasProjectAdminAccess = nextManagers.some(
      (manager) => manager.user_id === user.id,
    );

    setRole(nextRole);
    setUserIsProjectAdmin(hasProjectAdminAccess);

    if (canManage(nextRole)) {
      await loadPiContent();
    }

    setLoading(false);
  }, [loadPiContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const updatePiForm = (
    field: keyof PiForm,
    value: string | PiTimelineItem[],
  ) => {
    setPiForm((current) => ({ ...current, [field]: value }));

    if (field === "photoUrl" && typeof value === "string" && value.trim()) {
      setPhotoCleared(false);
    }
  };

  const updateTimelineItem = (
    section: TimelineSectionKey,
    index: number,
    field: keyof PiTimelineItem,
    value: string,
  ) => {
    setPiForm((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addTimelineItem = (section: TimelineSectionKey) => {
    setPiForm((current) => ({
      ...current,
      [section]: [...current[section], { ...emptyTimelineItem }],
    }));
  };

  const removeTimelineItem = (section: TimelineSectionKey, index: number) => {
    setPiForm((current) => ({
      ...current,
      [section]: current[section].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveTimelineItem = (
    section: TimelineSectionKey,
    index: number,
    direction: -1 | 1,
  ) => {
    setPiForm((current) => {
      const nextItems = [...current[section]];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= nextItems.length) {
        return current;
      }

      [nextItems[index], nextItems[targetIndex]] = [
        nextItems[targetIndex],
        nextItems[index],
      ];

      return {
        ...current,
        [section]: nextItems,
      };
    });
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setPhotoFile(null);
      return;
    }

    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      event.target.value = "";
      setPhotoFile(null);
      return;
    }

    setPhotoFile(file);
  };

  const resolvePhotoUrl = (uploadedUrl?: string) => {
    if (uploadedUrl) {
      return uploadedUrl;
    }

    if (piForm.photoUrl.trim()) {
      return piForm.photoUrl.trim();
    }

    if (photoCleared) {
      return null;
    }

    return "";
  };

  const handleSavePiContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePi) {
      setErrorMessage("You do not have permission to manage the PI profile.");
      return;
    }

    const validationMessage = validatePiForm(piForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      let uploadedPhotoUrl: string | undefined;

      if (photoFile) {
        setUploading(true);
        uploadedPhotoUrl = await uploadPiPhotoToStorage(photoFile);
        setUploading(false);
      }

      const photoUrl = resolvePhotoUrl(uploadedPhotoUrl);
      const formToSave = {
        ...piForm,
        photoUrl: photoUrl ?? "",
      };

      const { error } = await supabase
        .from("pi_profile_content")
        .upsert(getPiPayload(formToSave, currentUserId, photoUrl), {
          onConflict: "id",
        });

      if (error) {
        throw error;
      }

      setSuccessMessage("PI profile content saved.");
      setPhotoFile(null);
      setPhotoCleared(false);
      setPiForm(formToSave);
      await loadPiContent();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "PI profile content could not be saved.",
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const renderTimelineEditor = (
    label: string,
    section: TimelineSectionKey,
    items: PiTimelineItem[],
  ) => (
    <section className="rounded-lg border border-line bg-white/60 p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{label}</h3>
          <p className="mt-1 text-xs text-muted">
            Add, edit, remove, or reorder entries. Saved as a JSON array.
          </p>
        </div>
        <button
          type="button"
          onClick={() => addTimelineItem(section)}
          className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:bg-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
            No entries yet.
          </div>
        ) : null}

        {items.map((item, index) => (
          <div
            key={`${section}-${index}`}
            className="grid gap-3 rounded-md border border-line bg-white/70 p-4 md:grid-cols-2"
          >
            <input
              value={item.title}
              onChange={(event) =>
                updateTimelineItem(section, index, "title", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
              placeholder="Title"
            />
            <input
              value={item.organization}
              onChange={(event) =>
                updateTimelineItem(
                  section,
                  index,
                  "organization",
                  event.target.value,
                )
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Organization"
            />
            <input
              value={item.location}
              onChange={(event) =>
                updateTimelineItem(section, index, "location", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Location"
            />
            <input
              value={item.startDate}
              onChange={(event) =>
                updateTimelineItem(section, index, "startDate", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Start date"
            />
            <input
              value={item.endDate}
              onChange={(event) =>
                updateTimelineItem(section, index, "endDate", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="End date"
            />
            <textarea
              value={item.description}
              onChange={(event) =>
                updateTimelineItem(
                  section,
                  index,
                  "description",
                  event.target.value,
                )
              }
              className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
              placeholder="Description"
            />
            <textarea
              value={item.note}
              onChange={(event) =>
                updateTimelineItem(section, index, "note", event.target.value)
              }
              className="min-h-16 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
              placeholder="Note, advisor, or detail. Use line breaks for multiple notes."
            />
            <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
              <button
                type="button"
                onClick={() => moveTimelineItem(section, index, -1)}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                Up
              </button>
              <button
                type="button"
                onClick={() => moveTimelineItem(section, index, 1)}
                disabled={index === items.length - 1}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:text-brand disabled:opacity-40"
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Down
              </button>
              <button
                type="button"
                onClick={() => removeTimelineItem(section, index)}
                className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <PortalShell
      title="PI Profile"
      description="Manage the public principal investigator profile, links, photo, and timeline sections."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        PI Profile
      </p>
      <h2 className="mt-4 text-3xl font-semibold">PI profile management</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Edit the public PI profile. Timeline sections are stored as structured
        JSON arrays for future database-driven editing.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading PI profile tools...
        </div>
      ) : null}

      {!loading && !userCanManagePi ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage the PI profile.
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-6 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {errorMessage}
        </div>
      ) : null}

      {!loading && userCanManagePi ? (
        <form onSubmit={handleSavePiContent} className="mt-8 grid gap-6">
          <section className="grid gap-4 rounded-lg border border-line bg-white/60 p-5 shadow-panel md:grid-cols-2">
            <input
              value={piForm.name}
              onChange={(event) => updatePiForm("name", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Name"
              required
            />
            <input
              value={piForm.position}
              onChange={(event) => updatePiForm("position", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Position"
              required
            />
            <textarea
              value={piForm.affiliation}
              onChange={(event) => updatePiForm("affiliation", event.target.value)}
              className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
              placeholder="Affiliation, one line per unit"
              required
            />
            <input
              value={piForm.emailPrimary}
              onChange={(event) =>
                updatePiForm("emailPrimary", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Primary email"
              required
            />
            <input
              value={piForm.emailSecondary}
              onChange={(event) =>
                updatePiForm("emailSecondary", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Secondary email"
            />
            <input
              value={piForm.googleScholarUrl}
              onChange={(event) =>
                updatePiForm("googleScholarUrl", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Google Scholar URL"
            />
            <input
              value={piForm.orcidUrl}
              onChange={(event) => updatePiForm("orcidUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="ORCID URL"
            />
            <input
              value={piForm.linkedinUrl}
              onChange={(event) => updatePiForm("linkedinUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="LinkedIn URL"
            />
            <input
              value={piForm.photoUrl}
              onChange={(event) => updatePiForm("photoUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              placeholder="Manual photo URL"
            />

            <div className="rounded-md border border-line bg-white/70 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                PI photo
              </p>
              <div className="mt-2 flex items-center gap-3">
                {piForm.photoUrl.trim() ? (
                  <div
                    className="h-16 w-20 rounded-md border border-line bg-cover bg-center"
                    style={{ backgroundImage: `url(${piForm.photoUrl.trim()})` }}
                    role="img"
                    aria-label="PI photo preview"
                  />
                ) : (
                  <div className="flex h-16 w-20 items-center justify-center rounded-md border border-dashed border-line text-muted">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted">
                    {piForm.photoUrl.trim() || "No photo URL saved yet."}
                  </p>
                  {piForm.photoUrl.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPiForm((current) => ({ ...current, photoUrl: "" }));
                        setPhotoFile(null);
                        setPhotoCleared(true);
                      }}
                      className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
                    >
                      Clear photo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="grid gap-1 text-sm font-medium text-muted">
              <span>Upload PI photo, optional</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelection}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
              />
              <span className="text-xs font-normal text-muted">
                JPG, PNG, or WEBP. Max 5 MB.
                {photoFile ? ` Selected: ${photoFile.name}` : ""}
              </span>
            </label>
          </section>

          {renderTimelineEditor(
            "Education & Career",
            "educationCareer",
            piForm.educationCareer,
          )}
          {renderTimelineEditor(
            "Professional Experiences",
            "professionalExperiences",
            piForm.professionalExperiences,
          )}
          {renderTimelineEditor(
            "Awards and Honors",
            "awardsHonors",
            piForm.awardsHonors,
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
            >
              {uploading ? "Uploading..." : saving ? "Saving..." : "Save PI Profile"}
            </button>
          </div>
        </form>
      ) : null}
    </PortalShell>
  );
}
