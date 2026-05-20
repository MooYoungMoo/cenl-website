"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import {
  fallbackHomeContent,
  mapHomeContent,
  type HomeHeroGalleryImage,
  type HomePageContent,
  type SupabaseHomeContent,
} from "@/lib/home";
import {
  canManageWebsiteSection,
  getEnabledWebsiteSectionsFromRows,
} from "@/lib/portal-permissions";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type WebsitePermission = {
  section: string | null;
  is_enabled: boolean | null;
};

type HomeForm = HomePageContent;
type HomeTextField = Exclude<keyof HomeForm, "heroGalleryImages">;

const homeSelect =
  "id, hero_title, hero_subtitle, hero_description, primary_button_label, primary_button_href, secondary_button_label, secondary_button_href, research_highlight_title, research_highlight_description, latest_publications_title, latest_news_title, hero_image_url, hero_gallery_images, updated_by, created_at, updated_at";

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxHeroGalleryImages = 5;

function getHomePayload(form: HomeForm, userId: string | null, heroImageUrl?: string | null) {
  const nextHeroImageUrl =
    heroImageUrl !== undefined ? heroImageUrl : form.heroImageUrl.trim() || null;
  const heroGalleryImages = form.heroGalleryImages
    .filter((image) => image.url.trim())
    .slice(0, maxHeroGalleryImages)
    .map((image, index) => ({
      url: image.url.trim(),
      alt: image.alt.trim() || `CENL hero photo ${index + 1}`,
    }));

  return {
    id: "main",
    hero_title: form.heroTitle.trim(),
    hero_subtitle: form.heroSubtitle.trim(),
    hero_description: form.heroDescription.trim(),
    primary_button_label: form.primaryButtonLabel.trim(),
    primary_button_href: form.primaryButtonHref.trim(),
    secondary_button_label: form.secondaryButtonLabel.trim(),
    secondary_button_href: form.secondaryButtonHref.trim(),
    research_highlight_title: form.researchHighlightTitle.trim(),
    research_highlight_description: form.researchHighlightDescription.trim(),
    latest_publications_title: form.latestPublicationsTitle.trim(),
    latest_news_title: form.latestNewsTitle.trim(),
    hero_image_url: nextHeroImageUrl,
    hero_gallery_images: heroGalleryImages,
    updated_by: userId,
  };
}

function validateHomeForm(form: HomeForm) {
  if (!form.heroTitle.trim()) {
    return "Hero title is required.";
  }

  if (!form.heroDescription.trim()) {
    return "Hero description is required.";
  }

  if (!form.primaryButtonLabel.trim() || !form.primaryButtonHref.trim()) {
    return "Primary button label and link are required.";
  }

  if (!form.secondaryButtonLabel.trim() || !form.secondaryButtonHref.trim()) {
    return "Secondary button label and link are required.";
  }

  return "";
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Hero image must be a JPG, PNG, or WEBP file.";
  }

  if (file.size > maxImageSize) {
    return "Hero image must be 5 MB or smaller.";
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

  return `${baseName || "home-hero"}.${extension}`;
}

async function uploadHomeImageToStorage(file: File) {
  const path = `home/${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("home-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("home-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalHomeManagementPage() {
  const [role, setRole] = useState<string | null>(null);
  const [enabledWebsiteSections, setEnabledWebsiteSections] = useState<string[]>(
    [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [homeForm, setHomeForm] = useState<HomeForm>(fallbackHomeContent);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroGalleryFiles, setHeroGalleryFiles] = useState<File[]>([]);
  const [heroImageCleared, setHeroImageCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageHome = canManageWebsiteSection({
    role,
    enabledSections: enabledWebsiteSections,
    section: "home",
  });

  const loadHomeContent = useCallback(async () => {
    const { data, error } = await supabase
      .from("home_page_content")
      .select(homeSelect)
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setHomeForm(fallbackHomeContent);
      return;
    }

    if (data) {
      setHomeForm(mapHomeContent(data as SupabaseHomeContent));
    } else {
      setHomeForm(fallbackHomeContent);
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
      setEnabledWebsiteSections([]);
      setCurrentUserId(null);
      setUserIsProjectAdmin(false);
      setErrorMessage("Please sign in again before managing homepage content.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const [profileResult, managersResult, permissionsResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("funding_source_managers").select("funding_source_id, user_id"),
      supabase
        .from("website_management_permissions")
        .select("section, is_enabled")
        .eq("user_id", user.id),
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
    const nextEnabledWebsiteSections = getEnabledWebsiteSectionsFromRows(
      (permissionsResult.data ?? []) as WebsitePermission[],
    );
    const hasProjectAdminAccess = nextManagers.some(
      (manager) => manager.user_id === user.id,
    );

    setRole(nextRole);
    setEnabledWebsiteSections(nextEnabledWebsiteSections);
    setUserIsProjectAdmin(hasProjectAdminAccess);

    if (
      canManageWebsiteSection({
        role: nextRole,
        enabledSections: nextEnabledWebsiteSections,
        section: "home",
      })
    ) {
      await loadHomeContent();
    }

    setLoading(false);
  }, [loadHomeContent]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const updateHomeForm = (field: HomeTextField, value: string) => {
    setHomeForm((current) => ({ ...current, [field]: value }));

    if (field === "heroImageUrl" && value.trim()) {
      setHeroImageCleared(false);
    }
  };

  const removeHeroGalleryImage = (indexToRemove: number) => {
    setHomeForm((current) => ({
      ...current,
      heroGalleryImages: current.heroGalleryImages.filter(
        (_, index) => index !== indexToRemove,
      ),
    }));
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setHeroImageFile(null);
      return;
    }

    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      event.target.value = "";
      setHeroImageFile(null);
      return;
    }

    setHeroImageFile(file);
  };

  const handleGalleryFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("");
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      setHeroGalleryFiles([]);
      return;
    }

    const availableSlots =
      maxHeroGalleryImages -
      homeForm.heroGalleryImages.length -
      heroGalleryFiles.length;

    if (availableSlots <= 0 || selectedFiles.length > availableSlots) {
      setErrorMessage(
        `Home hero gallery supports up to ${maxHeroGalleryImages} photos. Remove a photo before adding more.`,
      );
      event.target.value = "";
      return;
    }

    const invalidFile = selectedFiles.find((file) => validateImageFile(file));

    if (invalidFile) {
      setErrorMessage(validateImageFile(invalidFile));
      event.target.value = "";
      return;
    }

    setHeroGalleryFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

  const removeSelectedGalleryFile = (indexToRemove: number) => {
    setHeroGalleryFiles((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  };

  const resolveHeroImageUrl = (uploadedUrl?: string) => {
    if (uploadedUrl) {
      return uploadedUrl;
    }

    if (homeForm.heroImageUrl.trim()) {
      return homeForm.heroImageUrl.trim();
    }

    if (heroImageCleared) {
      return null;
    }

    return "";
  };

  const handleSaveHomeContent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageHome) {
      setErrorMessage("You do not have permission to manage homepage content.");
      return;
    }

    const validationMessage = validateHomeForm(homeForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      let uploadedHeroImageUrl: string | undefined;

      if (heroImageFile) {
        setUploading(true);
        uploadedHeroImageUrl = await uploadHomeImageToStorage(heroImageFile);
        setUploading(false);
      }

      let uploadedGalleryImages: HomeHeroGalleryImage[] = [];

      if (heroGalleryFiles.length > 0) {
        setUploading(true);
        uploadedGalleryImages = await Promise.all(
          heroGalleryFiles.map(async (file, index) => ({
            url: await uploadHomeImageToStorage(file),
            alt: `CENL hero photo ${
              homeForm.heroGalleryImages.length + index + 1
            }`,
          })),
        );
        setUploading(false);
      }

      const heroImageUrl = resolveHeroImageUrl(uploadedHeroImageUrl);
      const formToSave = {
        ...homeForm,
        heroImageUrl: heroImageUrl ?? "",
        heroGalleryImages: [
          ...homeForm.heroGalleryImages,
          ...uploadedGalleryImages,
        ].slice(0, maxHeroGalleryImages),
      };

      const { error } = await supabase
        .from("home_page_content")
        .upsert(getHomePayload(formToSave, currentUserId, heroImageUrl), {
          onConflict: "id",
        });

      if (error) {
        throw error;
      }

      setSuccessMessage("Homepage content saved.");
      setHeroImageFile(null);
      setHeroGalleryFiles([]);
      setHeroImageCleared(false);
      setHomeForm(formToSave);
      await loadHomeContent();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Homepage content could not be saved.",
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <PortalShell
      title="Home"
      description="Manage homepage hero copy, section headings, buttons, and hero image."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Home
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Home management</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Edit the homepage hero and section headings. Latest publications and
        latest news continue to come from their own Supabase-managed records.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading home tools...
        </div>
      ) : null}

      {!loading && !userCanManageHome ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage homepage content.
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

      {!loading && userCanManageHome ? (
        <form
          onSubmit={handleSaveHomeContent}
          className="mt-8 grid gap-4 rounded-lg border border-line bg-white/60 p-5 shadow-panel md:grid-cols-2"
        >
          <input
            value={homeForm.heroSubtitle}
            onChange={(event) =>
              updateHomeForm("heroSubtitle", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Hero subtitle"
          />
          <input
            value={homeForm.heroTitle}
            onChange={(event) => updateHomeForm("heroTitle", event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Hero title"
            required
          />
          <textarea
            value={homeForm.heroDescription}
            onChange={(event) =>
              updateHomeForm("heroDescription", event.target.value)
            }
            className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
            placeholder="Hero description"
            required
          />
          <input
            value={homeForm.primaryButtonLabel}
            onChange={(event) =>
              updateHomeForm("primaryButtonLabel", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Primary button label"
            required
          />
          <input
            value={homeForm.primaryButtonHref}
            onChange={(event) =>
              updateHomeForm("primaryButtonHref", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Primary button href"
            required
          />
          <input
            value={homeForm.secondaryButtonLabel}
            onChange={(event) =>
              updateHomeForm("secondaryButtonLabel", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Secondary button label"
            required
          />
          <input
            value={homeForm.secondaryButtonHref}
            onChange={(event) =>
              updateHomeForm("secondaryButtonHref", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Secondary button href"
            required
          />
          <input
            value={homeForm.latestPublicationsTitle}
            onChange={(event) =>
              updateHomeForm("latestPublicationsTitle", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Latest publications title"
          />
          <input
            value={homeForm.latestNewsTitle}
            onChange={(event) =>
              updateHomeForm("latestNewsTitle", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Latest news title"
          />
          <p className="rounded-md border border-line bg-white/60 px-3 py-2 text-xs leading-6 text-muted md:col-span-2">
            Research Highlights fields are preserved in the database for
            backward compatibility, but the public homepage now directs research
            content to the dedicated Research page.
          </p>
          <input
            value={homeForm.heroImageUrl}
            onChange={(event) =>
              updateHomeForm("heroImageUrl", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
            placeholder="Manual hero image URL"
          />

          <div className="rounded-md border border-line bg-white/70 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Hero image
            </p>
            <div className="mt-2 flex items-center gap-3">
              {homeForm.heroImageUrl.trim() ? (
                <div
                  className="h-16 w-24 rounded-md border border-line bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${homeForm.heroImageUrl.trim()})`,
                  }}
                  role="img"
                  aria-label="Homepage hero preview"
                />
              ) : (
                <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-line text-muted">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs text-muted">
                  {homeForm.heroImageUrl.trim() || "No hero image URL saved yet."}
                </p>
                {homeForm.heroImageUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHomeForm((current) => ({
                        ...current,
                        heroImageUrl: "",
                      }));
                      setHeroImageFile(null);
                      setHeroImageCleared(true);
                    }}
                    className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
                  >
                    Clear image
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <label className="grid gap-1 text-sm font-medium text-muted">
            <span>Upload hero image, optional</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelection}
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
            />
            <span className="text-xs font-normal text-muted">
              JPG, PNG, or WEBP. Max 5 MB.
              {heroImageFile ? ` Selected: ${heroImageFile.name}` : ""}
            </span>
          </label>

          <section className="rounded-md border border-line bg-white/70 p-4 md:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Home Hero Gallery
                </p>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
                  Upload up to 5 photos for the Home hero carousel. One photo
                  stays static; multiple photos rotate automatically.
                </p>
              </div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                {homeForm.heroGalleryImages.length + heroGalleryFiles.length}/
                {maxHeroGalleryImages}
              </span>
            </div>

            {homeForm.heroGalleryImages.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {homeForm.heroGalleryImages.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="rounded-md border border-line bg-white p-2"
                  >
                    <div
                      className="h-24 rounded-md bg-cover bg-center"
                      style={{ backgroundImage: `url(${image.url})` }}
                      role="img"
                      aria-label={image.alt || `CENL hero photo ${index + 1}`}
                    />
                    <p className="mt-2 truncate text-xs text-muted">
                      Photo {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeHeroGalleryImage(index)}
                      className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-line bg-white/60 px-3 py-4 text-sm text-muted">
                No gallery photos uploaded yet.
              </div>
            )}

            {heroGalleryFiles.length > 0 ? (
              <div className="mt-4 rounded-md border border-line bg-[#f9fbfc] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Selected for upload
                </p>
                <div className="mt-2 grid gap-2">
                  {heroGalleryFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs text-muted"
                    >
                      <span className="min-w-0 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedGalleryFile(index)}
                        className="shrink-0 font-semibold text-accent transition hover:text-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="mt-4 grid gap-1 text-sm font-medium text-muted">
              <span>Add hero photos</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleGalleryFileSelection}
                disabled={
                  homeForm.heroGalleryImages.length + heroGalleryFiles.length >=
                  maxHeroGalleryImages
                }
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand disabled:opacity-60"
              />
              <span className="text-xs font-normal text-muted">
                JPG, PNG, or WEBP. Max 5 MB each. Upload order is preserved.
              </span>
            </label>
          </section>

          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
            >
              {uploading ? "Uploading..." : saving ? "Saving..." : "Save Home Content"}
            </button>
          </div>
        </form>
      ) : null}
    </PortalShell>
  );
}
