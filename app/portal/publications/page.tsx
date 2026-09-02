"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon, Plus, Search } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { getContributionLabel } from "@/components/publication-author-tools";
import {
  canManageWebsiteSection,
  getEnabledWebsiteSectionsFromRows,
} from "@/lib/portal-permissions";
import type { SupabasePublication } from "@/lib/publications";
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

type PublicationRecord = SupabasePublication;

type PublicationForm = {
  title: string;
  authors: string;
  journal: string;
  bibliographicDetails: string;
  publicationYear: string;
  doi: string;
  publicationType: string;
  imageUrl: string;
  highlightedAuthors: string;
  labContribution: string;
  isCoverArticle: boolean;
  coverLabel: string;
  isFeatured: boolean;
  isVisible: boolean;
  displayOrder: string;
};

const emptyPublicationForm: PublicationForm = {
  title: "",
  authors: "",
  journal: "",
  bibliographicDetails: "",
  publicationYear: "",
  doi: "",
  publicationType: "Article",
  imageUrl: "",
  highlightedAuthors: "",
  labContribution: "none",
  isCoverArticle: false,
  coverLabel: "Cover Article",
  isFeatured: false,
  isVisible: true,
  displayOrder: "0",
};

const publicationSelect =
  "id, title, authors, journal, bibliographic_details, publication_year, doi, publication_type, image_url, highlighted_authors, lab_contribution, is_cover_article, cover_label, is_featured, is_visible, display_order, created_by, created_at, updated_at";

const contributionOptions = [
  { value: "none", label: "No badge" },
  { value: "lab_author", label: "Lab author" },
  { value: "first_author", label: "Lab first author" },
  { value: "corresponding_author", label: "Lab corresponding author" },
  {
    value: "first_and_corresponding_author",
    label: "Lab first & corresponding author",
  },
];

const coverLabelOptions = [
  "Cover Article",
  "Inside Front Cover Article",
  "Supplementary Cover Article",
  "Back Cover Article",
  "Other",
];

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function toPublicationForm(publication: PublicationRecord): PublicationForm {
  return {
    title: publication.title ?? "",
    authors: publication.authors ?? "",
    journal: publication.journal ?? "",
    bibliographicDetails: publication.bibliographic_details ?? "",
    publicationYear: String(publication.publication_year ?? ""),
    doi: publication.doi ?? "",
    publicationType: publication.publication_type ?? "Article",
    imageUrl: publication.image_url ?? "",
    highlightedAuthors: (publication.highlighted_authors ?? []).join(", "),
    labContribution: publication.lab_contribution || "none",
    isCoverArticle: publication.is_cover_article === true,
    coverLabel: publication.cover_label || "Cover Article",
    isFeatured: publication.is_featured === true,
    isVisible: publication.is_visible !== false,
    displayOrder: String(publication.display_order ?? 0),
  };
}

function parseDisplayOrder(value: string) {
  return value.trim() ? Number(value) : 0;
}

function parseHighlightedAuthors(value: string) {
  return value
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
}

function getPublicationPayload(
  form: PublicationForm,
  imageUrlOverride?: string | null,
) {
  const nextImageUrl =
    imageUrlOverride !== undefined ? imageUrlOverride : form.imageUrl.trim() || null;

  return {
    title: form.title.trim(),
    authors: form.authors.trim(),
    journal: form.journal.trim(),
    bibliographic_details: form.bibliographicDetails.trim() || null,
    publication_year: Number(form.publicationYear),
    doi: form.doi.trim() || null,
    publication_type: form.publicationType.trim() || "Article",
    image_url: nextImageUrl,
    highlighted_authors: parseHighlightedAuthors(form.highlightedAuthors),
    lab_contribution: form.labContribution || "none",
    is_cover_article: form.isCoverArticle,
    cover_label: form.isCoverArticle ? form.coverLabel.trim() || null : null,
    is_featured: form.isFeatured,
    is_visible: form.isVisible,
    display_order: parseDisplayOrder(form.displayOrder),
  };
}

function resolvePublicationImageUrl({
  form,
  uploadedImageUrl,
  existingImageUrl,
  clearRequested,
}: {
  form: PublicationForm;
  uploadedImageUrl?: string;
  existingImageUrl?: string | null;
  clearRequested?: boolean;
}) {
  if (uploadedImageUrl) {
    return uploadedImageUrl;
  }

  const manualImageUrl = form.imageUrl.trim();

  if (manualImageUrl) {
    return manualImageUrl;
  }

  if (clearRequested) {
    return null;
  }

  return existingImageUrl ?? null;
}

function validatePublicationForm(form: PublicationForm) {
  const payload = getPublicationPayload(form);

  if (!payload.title || !payload.authors || !payload.journal) {
    return "Title, authors, and journal are required.";
  }

  if (!Number.isFinite(payload.publication_year)) {
    return "Publication year must be a number.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Publication images must be JPG, PNG, or WEBP files.";
  }

  if (file.size > maxImageSize) {
    return "Publication images must be 5 MB or smaller.";
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

  return `${baseName || "publication-image"}.${extension}`;
}

function isMatchingSearch(publication: PublicationRecord, search: string) {
  if (!search) {
    return true;
  }

  const haystack = [
    publication.title,
    publication.authors,
    publication.journal,
    publication.bibliographic_details,
    publication.doi,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function thumbnail(publication: PublicationRecord) {
  if (publication.image_url) {
    return (
      <div
        className="aspect-square w-24 rounded-md border border-line bg-cover bg-center"
        style={{ backgroundImage: `url(${publication.image_url})` }}
        role="img"
        aria-label={`${publication.title} thumbnail`}
      />
    );
  }

  return (
    <div className="flex aspect-square w-24 items-center justify-center rounded-md border border-dashed border-line bg-white/70 text-muted">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

async function uploadPublicationImageToStorage(file: File, folderId: string) {
  const path = `publications/${folderId}/${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("publication-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("publication-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalPublicationsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [enabledWebsiteSections, setEnabledWebsiteSections] = useState<string[]>(
    [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [publicationForm, setPublicationForm] =
    useState<PublicationForm>(emptyPublicationForm);
  const [publicationDrafts, setPublicationDrafts] = useState<
    Record<string, PublicationForm>
  >({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageCleared, setNewImageCleared] = useState(false);
  const [editImageFiles, setEditImageFiles] = useState<
    Record<string, File | null>
  >({});
  const [clearedImageIds, setClearedImageIds] = useState<
    Record<string, boolean>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManagePublications = canManageWebsiteSection({
    role,
    enabledSections: enabledWebsiteSections,
    section: "publications",
  });

  const loadPublications = useCallback(async () => {
    const { data, error } = await supabase
      .from("publications")
      .select(publicationSelect)
      .order("publication_year", { ascending: false })
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setPublications([]);
      setPublicationDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextPublications = (data ?? []) as PublicationRecord[];
    setPublications(nextPublications);
    setPublicationDrafts(
      nextPublications.reduce<Record<string, PublicationForm>>(
        (accumulator, publication) => {
          accumulator[publication.id] = toPublicationForm(publication);
          return accumulator;
        },
        {},
      ),
    );
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
      setErrorMessage("Please sign in again before managing publications.");
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
        section: "publications",
      })
    ) {
      await loadPublications();
    }

    setLoading(false);
  }, [loadPublications]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          publications
            .map((publication) => publication.publication_year)
            .filter((year): year is number => Number.isFinite(year)),
        ),
      ).sort((first, second) => second - first),
    [publications],
  );

  const publicationTypes = useMemo(
    () =>
      Array.from(
        new Set(
          publications
            .map((publication) => publication.publication_type || "Article")
            .filter(Boolean),
        ),
      ).sort((first, second) => first.localeCompare(second)),
    [publications],
  );

  const filteredPublications = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return publications
      .filter((publication) => isMatchingSearch(publication, normalizedSearch))
      .filter((publication) =>
        yearFilter === "all"
          ? true
          : String(publication.publication_year) === yearFilter,
      )
      .filter((publication) =>
        typeFilter === "all"
          ? true
          : (publication.publication_type || "Article") === typeFilter,
      )
      .filter((publication) => {
        if (visibilityFilter === "visible") {
          return publication.is_visible !== false;
        }

        if (visibilityFilter === "hidden") {
          return publication.is_visible === false;
        }

        return true;
      })
      .filter((publication) => {
        if (featuredFilter === "featured") {
          return publication.is_featured === true;
        }

        if (featuredFilter === "not-featured") {
          return publication.is_featured !== true;
        }

        return true;
      });
  }, [
    featuredFilter,
    publications,
    searchQuery,
    typeFilter,
    visibilityFilter,
    yearFilter,
  ]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredPublications.length / pageSize));
  const visiblePublications = filteredPublications.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const updatePublicationForm = (
    field: keyof PublicationForm,
    value: string | boolean,
  ) => {
    setPublicationForm((current) => ({ ...current, [field]: value }));

    if (field === "imageUrl" && typeof value === "string" && value.trim()) {
      setNewImageCleared(false);
    }
  };

  const updatePublicationDraft = (
    publicationId: string,
    field: keyof PublicationForm,
    value: string | boolean,
  ) => {
    setPublicationDrafts((current) => ({
      ...current,
      [publicationId]: {
        ...current[publicationId],
        [field]: value,
      },
    }));

    if (field === "imageUrl" && typeof value === "string" && value.trim()) {
      setClearedImageIds((current) => ({ ...current, [publicationId]: false }));
    }
  };

  const handleFileSelection = (
    event: ChangeEvent<HTMLInputElement>,
    onValidFile: (file: File | null) => void,
  ) => {
    setErrorMessage("");
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      onValidFile(null);
      return;
    }

    const validationMessage = validateImageFile(file);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      event.target.value = "";
      onValidFile(null);
      return;
    }

    onValidFile(file);
  };

  const uploadPublicationImage = async (
    file: File,
    folderId: string,
    uploadId: string,
  ) => {
    setUploadingId(uploadId);

    try {
      return await uploadPublicationImageToStorage(file, folderId);
    } finally {
      setUploadingId(null);
    }
  };

  const handleAddPublication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePublications) {
      setErrorMessage("You do not have permission to manage publications.");
      return;
    }

    const validationMessage = validatePublicationForm(publicationForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const folderId = crypto.randomUUID();
      const uploadedImageUrl = newImageFile
        ? await uploadPublicationImage(newImageFile, folderId, "new")
        : undefined;
      const imageUrlToSave = resolvePublicationImageUrl({
        form: publicationForm,
        uploadedImageUrl,
        clearRequested: newImageCleared,
      });
      const formToSave = {
        ...publicationForm,
        imageUrl: imageUrlToSave ?? "",
      };

      if (uploadedImageUrl) {
        setPublicationForm(formToSave);
      }

      const { error } = await supabase.from("publications").insert({
        ...getPublicationPayload(formToSave, imageUrlToSave),
        created_by: currentUserId,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        uploadedImageUrl
          ? "Publication added and image uploaded."
          : "Publication added.",
      );
      setPublicationForm(emptyPublicationForm);
      setNewImageFile(null);
      setNewImageCleared(false);
      setShowAddForm(false);
      await loadPublications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Publication could not be added.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleUpdatePublication = async (publicationId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePublications) {
      setErrorMessage("You do not have permission to manage publications.");
      return;
    }

    const draft = publicationDrafts[publicationId];

    if (!draft) {
      return;
    }

    const validationMessage = validatePublicationForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const imageFile = editImageFiles[publicationId] ?? null;
      const uploadedImageUrl = imageFile
        ? await uploadPublicationImage(imageFile, publicationId, publicationId)
        : undefined;
      const existingPublication = publications.find(
        (publication) => publication.id === publicationId,
      );
      const imageUrlToSave = resolvePublicationImageUrl({
        form: draft,
        uploadedImageUrl,
        existingImageUrl: existingPublication?.image_url,
        clearRequested: clearedImageIds[publicationId],
      });
      const draftToSave = {
        ...draft,
        imageUrl: imageUrlToSave ?? "",
      };

      if (uploadedImageUrl) {
        setPublicationDrafts((current) => ({
          ...current,
          [publicationId]: draftToSave,
        }));
      }

      const { error } = await supabase
        .from("publications")
        .update(getPublicationPayload(draftToSave, imageUrlToSave))
        .eq("id", publicationId);

      if (error) {
        throw error;
      }

      setSuccessMessage(
        uploadedImageUrl
          ? "Publication updated and image uploaded."
          : "Publication updated.",
      );
      setEditingId(null);
      setEditImageFiles((current) => ({ ...current, [publicationId]: null }));
      setClearedImageIds((current) => ({
        ...current,
        [publicationId]: false,
      }));
      await loadPublications();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Publication could not be updated.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleTogglePublicationFlag = async (
    publication: PublicationRecord,
    field: "is_featured" | "is_visible",
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("publications")
      .update({ [field]: !publication[field] })
      .eq("id", publication.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      field === "is_visible"
        ? "Publication visibility updated."
        : "Publication featured status updated.",
    );
    setSaving(false);
    await loadPublications();
  };

  const handleDeletePublication = async (publication: PublicationRecord) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${publication.title}"? This publication record will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("publications")
      .delete()
      .eq("id", publication.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Publication deleted.");
    setSaving(false);
    await loadPublications();
  };

  const renderPublicationForm = (
    form: PublicationForm,
    onChange: (field: keyof PublicationForm, value: string | boolean) => void,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void,
    imageFile: File | null,
    onImageChange: (file: File | null) => void,
    onClearImage: () => void,
    submitLabel: string,
    uploadId: string,
  ) => (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-md border border-line bg-white/55 p-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <input
        value={form.title}
        onChange={(event) => onChange("title", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Title"
        required
      />
      <input
        value={form.authors}
        onChange={(event) => onChange("authors", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Authors"
        required
      />
      <input
        value={form.journal}
        onChange={(event) => onChange("journal", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Journal"
        required
      />
      <label className="grid gap-1 text-sm font-medium text-muted lg:col-span-2">
        <span>Volume / Article / Pages</span>
        <input
          value={form.bibliographicDetails}
          onChange={(event) =>
            onChange("bibliographicDetails", event.target.value)
          }
          className="rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand"
          placeholder="e73406 or 35(3) 191–215"
        />
        <span className="text-xs font-normal">
          Enter volume, issue, pages, or article number only.
        </span>
      </label>
      <input
        type="number"
        value={form.publicationYear}
        onChange={(event) => onChange("publicationYear", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Year"
        required
      />
      <input
        value={form.publicationType}
        onChange={(event) => onChange("publicationType", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Type"
      />
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <input
        value={form.doi}
        onChange={(event) => onChange("doi", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="DOI or DOI URL"
      />
      <input
        value={form.highlightedAuthors}
        onChange={(event) => onChange("highlightedAuthors", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Highlighted authors, comma-separated"
      />
      <select
        value={form.labContribution}
        onChange={(event) => onChange("labContribution", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        aria-label="Lab contribution badge"
      >
        {contributionOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={form.isCoverArticle}
          onChange={(event) => onChange("isCoverArticle", event.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Cover publication
      </label>
      <select
        value={form.coverLabel}
        onChange={(event) => onChange("coverLabel", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        aria-label="Cover label"
      >
        {coverLabelOptions.map((label) => (
          <option key={label} value={label}>
            {label}
          </option>
        ))}
      </select>
      <input
        value={form.imageUrl}
        onChange={(event) => onChange("imageUrl", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Manual image URL, optional"
      />
      <div className="rounded-md border border-line bg-white/70 p-3 text-sm lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Current thumbnail
        </p>
        <div className="mt-2 flex items-center gap-3">
          {form.imageUrl.trim() ? (
            <div
              className="aspect-square w-24 rounded-md border border-line bg-cover bg-center"
              style={{ backgroundImage: `url(${form.imageUrl.trim()})` }}
              role="img"
              aria-label="Publication thumbnail preview"
            />
          ) : (
            <div className="flex aspect-square w-24 items-center justify-center rounded-md border border-dashed border-line text-muted">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">
              {form.imageUrl.trim() || "No image URL saved yet."}
            </p>
            {form.imageUrl.trim() ? (
              <button
                type="button"
                onClick={onClearImage}
                className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
              >
                Clear image
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <label className="grid gap-1 text-sm font-medium text-muted lg:col-span-2">
        <span>Upload thumbnail, optional</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileSelection(event, onImageChange)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
        />
        <span className="text-xs font-normal text-muted">
          JPG, PNG, or WEBP. Max 5 MB.
          {imageFile ? ` Selected: ${imageFile.name}` : ""}
        </span>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={form.isFeatured}
          onChange={(event) => onChange("isFeatured", event.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Featured
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(event) => onChange("isVisible", event.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Visible
      </label>
      <div className="flex items-center justify-end gap-2 md:col-span-2">
        {uploadingId === uploadId ? (
          <span className="text-xs font-medium text-muted">Uploading image...</span>
        ) : null}
        <button
          type="submit"
          disabled={saving || uploadingId !== null}
          className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <PortalShell
      title="Publications"
      description="Manage publication records, visibility, featured status, and thumbnail images."
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Publications
          </p>
          <h2 className="mt-4 text-3xl font-semibold">
            Publication management
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Maintain Supabase-backed paper records used by the homepage carousel
            and the year-grouped Papers page. Static publication data remains as
            a public fallback.
          </p>
        </div>
        {!loading && userCanManagePublications ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add Publication
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading publication tools...
        </div>
      ) : null}

      {!loading && !userCanManagePublications ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage publications.
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

      {!loading && userCanManagePublications ? (
        <div className="mt-8 grid gap-6">
          {showAddForm ? (
            <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Add publication</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {renderPublicationForm(
                publicationForm,
                updatePublicationForm,
                handleAddPublication,
                newImageFile,
                setNewImageFile,
                () => {
                  setPublicationForm((current) => ({
                    ...current,
                    imageUrl: "",
                  }));
                  setNewImageFile(null);
                  setNewImageCleared(true);
                },
                "Add Publication",
                "new",
              )}
            </section>
          ) : null}

          <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand"
                  placeholder="Search title, authors, journal, or DOI"
                />
              </label>
              <select
                value={yearFilter}
                onChange={(event) => {
                  setYearFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All years</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All types</option>
                {publicationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={visibilityFilter}
                onChange={(event) => {
                  setVisibilityFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
              <select
                value={featuredFilter}
                onChange={(event) => {
                  setFeaturedFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All featured</option>
                <option value="featured">Featured only</option>
                <option value="not-featured">Not featured</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {visiblePublications.length} of{" "}
                {filteredPublications.length} filtered publications
              </span>
              <button
                type="button"
                onClick={() => void loadPublications()}
                className="font-semibold text-brand transition hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            {filteredPublications.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No publications match the current filters.
              </div>
            ) : null}

            {filteredPublications.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
                <div className="min-w-[1340px] divide-y divide-line">
                  <div className="grid grid-cols-[112px_64px_minmax(260px,1.5fr)_minmax(160px,0.8fr)_100px_110px_92px_84px_minmax(120px,0.7fr)_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Thumbnail</span>
                    <span>Year</span>
                    <span>Title</span>
                    <span>Journal / Details</span>
                    <span>Type</span>
                    <span>Cover</span>
                    <span>Featured</span>
                    <span>Visible</span>
                    <span>DOI</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {visiblePublications.map((publication) => {
                    const draft =
                      publicationDrafts[publication.id] ??
                      toPublicationForm(publication);
                    const isEditing = editingId === publication.id;

                    return (
                      <div key={publication.id} className="divide-y divide-line">
                        <div className="grid grid-cols-[112px_64px_minmax(260px,1.5fr)_minmax(160px,0.8fr)_100px_110px_92px_84px_minmax(120px,0.7fr)_auto] gap-3 px-3 py-3 text-sm">
                          <div>{thumbnail(publication)}</div>
                          <p className="font-semibold">
                            {publication.publication_year ?? "TBD"}
                          </p>
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-semibold leading-6">
                              {publication.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted">
                              {publication.authors}
                            </p>
                            {getContributionLabel(
                              publication.lab_contribution,
                            ) ? (
                              <p className="mt-1 text-xs font-semibold text-brand">
                                {getContributionLabel(
                                  publication.lab_contribution,
                                )}
                              </p>
                            ) : null}
                          </div>
                          <div className="min-w-0 text-sm text-muted">
                            <p className="line-clamp-1">{publication.journal}</p>
                            {publication.bibliographic_details ? (
                              <p className="mt-1 line-clamp-1 text-xs">
                                {publication.bibliographic_details}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted">
                            {publication.publication_type || "Article"}
                          </p>
                          <p className="text-xs font-semibold text-muted">
                            {publication.is_cover_article
                              ? publication.cover_label || "Cover Article"
                              : "No"}
                          </p>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleTogglePublicationFlag(
                                publication,
                                "is_featured",
                              )
                            }
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {publication.is_featured ? "Featured" : "No"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleTogglePublicationFlag(
                                publication,
                                "is_visible",
                              )
                            }
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {publication.is_visible === false ? "Hidden" : "Visible"}
                          </button>
                          <p className="line-clamp-2 text-xs text-muted">
                            {publication.doi || "TBD"}
                          </p>
                          <div className="flex h-fit flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setEditingId(isEditing ? null : publication.id)
                              }
                              className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void handleDeletePublication(publication)
                              }
                              className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="bg-[#f9fbfc] px-3 py-4">
                            {renderPublicationForm(
                              draft,
                              (field, value) =>
                                updatePublicationDraft(
                                  publication.id,
                                  field,
                                  value,
                                ),
                              (event) => {
                                event.preventDefault();
                                void handleUpdatePublication(publication.id);
                              },
                              editImageFiles[publication.id] ?? null,
                              (file) =>
                                setEditImageFiles((current) => ({
                                  ...current,
                                  [publication.id]: file,
                                })),
                              () => {
                                setPublicationDrafts((current) => ({
                                  ...current,
                                  [publication.id]: {
                                    ...draft,
                                    imageUrl: "",
                                  },
                                }));
                                setEditImageFiles((current) => ({
                                  ...current,
                                  [publication.id]: null,
                                }));
                                setClearedImageIds((current) => ({
                                  ...current,
                                  [publication.id]: true,
                                }));
                              },
                              "Save Publication",
                              publication.id,
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filteredPublications.length > pageSize ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-muted">
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
