"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import {
  fallbackSiteSettings,
  mapSiteSettings,
  siteSettingsSelect,
  type SiteSettingsContent,
  type SupabaseSiteSettings,
} from "@/lib/site-settings";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type SiteSettingsForm = SiteSettingsContent;

type ImageField = "logoUrl" | "ogImageUrl";

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function canManage(role: string | null) {
  return role === "professor" || role === "admin";
}

function getSiteSettingsPayload(
  form: SiteSettingsForm,
  userId: string | null,
  imageOverrides: Partial<Record<ImageField, string | null>> = {},
) {
  const nextLogoUrl =
    imageOverrides.logoUrl !== undefined
      ? imageOverrides.logoUrl
      : form.logoUrl.trim() || null;
  const nextOgImageUrl =
    imageOverrides.ogImageUrl !== undefined
      ? imageOverrides.ogImageUrl
      : form.ogImageUrl.trim() || null;

  return {
    id: "main",
    site_name: form.siteName.trim(),
    short_name: form.shortName.trim(),
    header_label: form.headerLabel.trim(),
    footer_text: form.footerText.trim(),
    seo_title: form.seoTitle.trim(),
    seo_description: form.seoDescription.trim(),
    logo_url: nextLogoUrl,
    og_image_url: nextOgImageUrl,
    updated_by: userId,
  };
}

function validateSiteSettingsForm(form: SiteSettingsForm) {
  if (!form.siteName.trim()) {
    return "Site name is required.";
  }

  if (!form.shortName.trim()) {
    return "Short name is required.";
  }

  if (!form.headerLabel.trim()) {
    return "Header label is required.";
  }

  if (!form.footerText.trim()) {
    return "Footer text is required.";
  }

  if (!form.seoTitle.trim() || !form.seoDescription.trim()) {
    return "SEO title and SEO description are required.";
  }

  return "";
}

function validateImageFile(file: File, label: string) {
  if (!allowedImageTypes.includes(file.type)) {
    return `${label} must be a JPG, PNG, or WEBP file.`;
  }

  if (file.size > maxImageSize) {
    return `${label} must be 5 MB or smaller.`;
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

  return `${baseName || "site-image"}.${extension}`;
}

async function uploadSiteImageToStorage(file: File, prefix: "logo" | "og") {
  const path = `site/${prefix}-${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("site-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("site-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalSiteSettingsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userIsProjectAdmin, setUserIsProjectAdmin] = useState(false);
  const [settingsForm, setSettingsForm] =
    useState<SiteSettingsForm>(fallbackSiteSettings);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [ogImageCleared, setOgImageCleared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageSiteSettings = canManage(role) || userIsProjectAdmin;

  const loadSiteSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(siteSettingsSelect)
      .eq("id", "main")
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setSettingsForm(fallbackSiteSettings);
      return;
    }

    if (data) {
      setSettingsForm(mapSiteSettings(data as SupabaseSiteSettings));
    } else {
      setSettingsForm(fallbackSiteSettings);
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
      setErrorMessage("Please sign in again before managing site settings.");
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

    if (canManage(nextRole) || hasProjectAdminAccess) {
      await loadSiteSettings();
    }

    setLoading(false);
  }, [loadSiteSettings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const updateSettingsForm = (field: keyof SiteSettingsForm, value: string) => {
    setSettingsForm((current) => ({ ...current, [field]: value }));

    if (field === "logoUrl" && value.trim()) {
      setLogoCleared(false);
    }

    if (field === "ogImageUrl" && value.trim()) {
      setOgImageCleared(false);
    }
  };

  const handleImageSelection = (
    event: ChangeEvent<HTMLInputElement>,
    field: ImageField,
    label: string,
  ) => {
    setErrorMessage("");
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      if (field === "logoUrl") {
        setLogoFile(null);
      } else {
        setOgImageFile(null);
      }
      return;
    }

    const validationMessage = validateImageFile(file, label);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      event.target.value = "";
      if (field === "logoUrl") {
        setLogoFile(null);
      } else {
        setOgImageFile(null);
      }
      return;
    }

    if (field === "logoUrl") {
      setLogoFile(file);
    } else {
      setOgImageFile(file);
    }
  };

  const resolveImageUrl = (
    field: ImageField,
    uploadedUrl: string | undefined,
  ) => {
    if (uploadedUrl) {
      return uploadedUrl;
    }

    const manualUrl = settingsForm[field].trim();

    if (manualUrl) {
      return manualUrl;
    }

    if (field === "logoUrl" && logoCleared) {
      return null;
    }

    if (field === "ogImageUrl" && ogImageCleared) {
      return null;
    }

    return "";
  };

  const handleSaveSiteSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageSiteSettings) {
      setErrorMessage("You do not have permission to manage site settings.");
      return;
    }

    const validationMessage = validateSiteSettingsForm(settingsForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      let uploadedLogoUrl: string | undefined;
      let uploadedOgImageUrl: string | undefined;

      if (logoFile || ogImageFile) {
        setUploading(true);
      }

      if (logoFile) {
        uploadedLogoUrl = await uploadSiteImageToStorage(logoFile, "logo");
      }

      if (ogImageFile) {
        uploadedOgImageUrl = await uploadSiteImageToStorage(ogImageFile, "og");
      }

      setUploading(false);

      const logoUrl = resolveImageUrl("logoUrl", uploadedLogoUrl);
      const ogImageUrl = resolveImageUrl("ogImageUrl", uploadedOgImageUrl);
      const formToSave = {
        ...settingsForm,
        logoUrl: logoUrl ?? "",
        ogImageUrl: ogImageUrl ?? "",
      };

      const { error } = await supabase
        .from("site_settings")
        .upsert(
          getSiteSettingsPayload(formToSave, currentUserId, {
            logoUrl,
            ogImageUrl,
          }),
          { onConflict: "id" },
        );

      if (error) {
        throw error;
      }

      setSuccessMessage("Site settings saved.");
      setLogoFile(null);
      setOgImageFile(null);
      setLogoCleared(false);
      setOgImageCleared(false);
      setSettingsForm(formToSave);
      await loadSiteSettings();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Site settings could not be saved.",
      );
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const renderImageField = ({
    label,
    field,
    file,
    onClear,
  }: {
    label: string;
    field: ImageField;
    file: File | null;
    onClear: () => void;
  }) => (
    <div className="rounded-md border border-line bg-white/70 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3">
        {settingsForm[field].trim() ? (
          <div
            className="h-16 w-24 rounded-md border border-line bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${settingsForm[field].trim()})` }}
            role="img"
            aria-label={`${label} preview`}
          />
        ) : (
          <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-line text-muted">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">
            {settingsForm[field].trim() || `No ${label.toLowerCase()} saved yet.`}
          </p>
          {settingsForm[field].trim() ? (
            <button
              type="button"
              onClick={onClear}
              className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
            >
              Clear image
            </button>
          ) : null}
          {file ? (
            <p className="mt-2 truncate text-xs font-medium text-brand">
              Selected: {file.name}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <PortalShell
      title="Site Settings"
      description="Manage global public website labels, footer text, logo, and SEO defaults."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Site Settings
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Site settings management</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Edit global labels used by the public header, footer, and static SEO
        fallback. Logo and Open Graph images can be uploaded to Supabase Storage.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading site settings...
        </div>
      ) : null}

      {!loading && !userCanManageSiteSettings ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage site settings.
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

      {!loading && userCanManageSiteSettings ? (
        <form
          onSubmit={handleSaveSiteSettings}
          className="mt-8 grid gap-4 rounded-lg border border-line bg-white/60 p-5 shadow-panel md:grid-cols-2"
        >
          <input
            value={settingsForm.siteName}
            onChange={(event) =>
              updateSettingsForm("siteName", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Site name"
            required
          />
          <input
            value={settingsForm.shortName}
            onChange={(event) =>
              updateSettingsForm("shortName", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Short name"
            required
          />
          <input
            value={settingsForm.headerLabel}
            onChange={(event) =>
              updateSettingsForm("headerLabel", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Header label"
            required
          />
          <input
            value={settingsForm.footerText}
            onChange={(event) =>
              updateSettingsForm("footerText", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Footer text"
            required
          />
          <input
            value={settingsForm.seoTitle}
            onChange={(event) =>
              updateSettingsForm("seoTitle", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
            placeholder="SEO title"
            required
          />
          <textarea
            value={settingsForm.seoDescription}
            onChange={(event) =>
              updateSettingsForm("seoDescription", event.target.value)
            }
            className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand md:col-span-2"
            placeholder="SEO description"
            required
          />
          <input
            value={settingsForm.logoUrl}
            onChange={(event) => updateSettingsForm("logoUrl", event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Manual logo URL"
          />
          <input
            value={settingsForm.ogImageUrl}
            onChange={(event) =>
              updateSettingsForm("ogImageUrl", event.target.value)
            }
            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
            placeholder="Manual Open Graph image URL"
          />

          {renderImageField({
            label: "Logo",
            field: "logoUrl",
            file: logoFile,
            onClear: () => {
              setSettingsForm((current) => ({ ...current, logoUrl: "" }));
              setLogoFile(null);
              setLogoCleared(true);
            },
          })}

          {renderImageField({
            label: "Open Graph image",
            field: "ogImageUrl",
            file: ogImageFile,
            onClear: () => {
              setSettingsForm((current) => ({ ...current, ogImageUrl: "" }));
              setOgImageFile(null);
              setOgImageCleared(true);
            },
          })}

          <label className="grid gap-1 text-sm font-medium text-muted">
            <span>Upload logo, optional</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleImageSelection(event, "logoUrl", "Logo")
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
            />
            <span className="text-xs font-normal text-muted">
              JPG, PNG, or WEBP. Max 5 MB.
            </span>
          </label>

          <label className="grid gap-1 text-sm font-medium text-muted">
            <span>Upload Open Graph image, optional</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                handleImageSelection(event, "ogImageUrl", "Open Graph image")
              }
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
            />
            <span className="text-xs font-normal text-muted">
              JPG, PNG, or WEBP. Max 5 MB.
            </span>
          </label>

          <div className="rounded-md border border-line bg-surface-strong p-4 text-xs leading-6 text-muted md:col-span-2">
            SEO metadata currently uses the typed site settings fallback at
            build time. The helper in <span className="font-semibold">lib/site-settings.ts</span>{" "}
            is ready for future server-side dynamic metadata if needed.
          </div>

          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
            >
              {uploading
                ? "Uploading..."
                : saving
                  ? "Saving..."
                  : "Save Site Settings"}
            </button>
          </div>
        </form>
      ) : null}
    </PortalShell>
  );
}
