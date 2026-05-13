"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon, Plus, Search } from "lucide-react";
import { PortalOngoingProjectsManager } from "@/components/portal-ongoing-projects-manager";
import { PortalShell } from "@/components/portal-shell";
import {
  canManageWebsiteSection,
  getEnabledWebsiteSectionsFromRows,
} from "@/lib/portal-permissions";
import type { SupabaseResearchTopic } from "@/lib/research";
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

type ResearchRecord = SupabaseResearchTopic;

type ResearchForm = {
  title: string;
  subtitle: string;
  description: string;
  keywords: string;
  imageUrl: string;
  displayOrder: string;
  isVisible: boolean;
};

const emptyResearchForm: ResearchForm = {
  title: "",
  subtitle: "",
  description: "",
  keywords: "",
  imageUrl: "",
  displayOrder: "0",
  isVisible: true,
};

const researchSelect =
  "id, title, subtitle, description, keywords, image_url, display_order, is_visible, created_by, created_at, updated_at";

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function keywordsToText(keywords: string[] | null) {
  return (keywords ?? []).join(", ");
}

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function toResearchForm(topic: ResearchRecord): ResearchForm {
  return {
    title: topic.title ?? "",
    subtitle: topic.subtitle ?? "",
    description: topic.description ?? "",
    keywords: keywordsToText(topic.keywords),
    imageUrl: topic.image_url ?? "",
    displayOrder: String(topic.display_order ?? 0),
    isVisible: topic.is_visible !== false,
  };
}

function parseDisplayOrder(value: string) {
  return value.trim() ? Number(value) : 0;
}

function getResearchPayload(form: ResearchForm, imageUrlOverride?: string | null) {
  const nextImageUrl =
    imageUrlOverride !== undefined ? imageUrlOverride : form.imageUrl.trim() || null;

  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim() || null,
    description: form.description.trim(),
    keywords: parseKeywords(form.keywords),
    image_url: nextImageUrl,
    display_order: parseDisplayOrder(form.displayOrder),
    is_visible: form.isVisible,
  };
}

function resolveResearchImageUrl({
  form,
  uploadedImageUrl,
  existingImageUrl,
  clearRequested,
}: {
  form: ResearchForm;
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

function validateResearchForm(form: ResearchForm) {
  const payload = getResearchPayload(form);

  if (!payload.title || !payload.description) {
    return "Title and description are required.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Research images must be JPG, PNG, or WEBP files.";
  }

  if (file.size > maxImageSize) {
    return "Research images must be 5 MB or smaller.";
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

  return `${baseName || "research-image"}.${extension}`;
}

function thumbnail(topic: ResearchRecord) {
  if (topic.image_url) {
    return (
      <div
        className="h-16 w-20 rounded-md border border-line bg-cover bg-center"
        style={{ backgroundImage: `url(${topic.image_url})` }}
        role="img"
        aria-label={`${topic.title} image`}
      />
    );
  }

  return (
    <div className="flex h-16 w-20 items-center justify-center rounded-md border border-dashed border-line bg-white/70 text-muted">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

async function uploadResearchImageToStorage(file: File, folderId: string) {
  const path = `research/${folderId}/${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("research-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("research-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalResearchPage() {
  const [role, setRole] = useState<string | null>(null);
  const [enabledWebsiteSections, setEnabledWebsiteSections] = useState<string[]>(
    [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [topics, setTopics] = useState<ResearchRecord[]>([]);
  const [researchForm, setResearchForm] =
    useState<ResearchForm>(emptyResearchForm);
  const [researchDrafts, setResearchDrafts] = useState<
    Record<string, ResearchForm>
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
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageResearch = canManageWebsiteSection({
    role,
    enabledSections: enabledWebsiteSections,
    section: "research",
  });

  const loadResearchTopics = useCallback(async () => {
    const { data, error } = await supabase
      .from("research_topics")
      .select(researchSelect)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setTopics([]);
      setResearchDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextTopics = (data ?? []) as ResearchRecord[];
    setTopics(nextTopics);
    setResearchDrafts(
      nextTopics.reduce<Record<string, ResearchForm>>((accumulator, topic) => {
        accumulator[topic.id] = toResearchForm(topic);
        return accumulator;
      }, {}),
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
      setErrorMessage("Please sign in again before managing research.");
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
        section: "research",
      })
    ) {
      await loadResearchTopics();
    }

    setLoading(false);
  }, [loadResearchTopics]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const filteredTopics = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return topics
      .filter((topic) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          topic.title,
          topic.subtitle,
          topic.description,
          (topic.keywords ?? []).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .filter((topic) => {
        if (visibilityFilter === "visible") {
          return topic.is_visible !== false;
        }

        if (visibilityFilter === "hidden") {
          return topic.is_visible === false;
        }

        return true;
      });
  }, [searchQuery, topics, visibilityFilter]);

  const updateResearchForm = (
    field: keyof ResearchForm,
    value: string | boolean,
  ) => {
    setResearchForm((current) => ({ ...current, [field]: value }));

    if (field === "imageUrl" && typeof value === "string" && value.trim()) {
      setNewImageCleared(false);
    }
  };

  const updateResearchDraft = (
    topicId: string,
    field: keyof ResearchForm,
    value: string | boolean,
  ) => {
    setResearchDrafts((current) => ({
      ...current,
      [topicId]: {
        ...current[topicId],
        [field]: value,
      },
    }));

    if (field === "imageUrl" && typeof value === "string" && value.trim()) {
      setClearedImageIds((current) => ({ ...current, [topicId]: false }));
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

  const uploadResearchImage = async (
    file: File,
    folderId: string,
    uploadId: string,
  ) => {
    setUploadingId(uploadId);

    try {
      return await uploadResearchImageToStorage(file, folderId);
    } finally {
      setUploadingId(null);
    }
  };

  const handleAddResearchTopic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageResearch) {
      setErrorMessage("You do not have permission to manage research topics.");
      return;
    }

    const validationMessage = validateResearchForm(researchForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const folderId = crypto.randomUUID();
      const uploadedImageUrl = newImageFile
        ? await uploadResearchImage(newImageFile, folderId, "new")
        : undefined;
      const imageUrlToSave = resolveResearchImageUrl({
        form: researchForm,
        uploadedImageUrl,
        clearRequested: newImageCleared,
      });
      const formToSave = {
        ...researchForm,
        imageUrl: imageUrlToSave ?? "",
      };
      const { error } = await supabase.from("research_topics").insert({
        ...getResearchPayload(formToSave, imageUrlToSave),
        created_by: currentUserId,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Research topic added.");
      setResearchForm(emptyResearchForm);
      setNewImageFile(null);
      setNewImageCleared(false);
      setShowAddForm(false);
      await loadResearchTopics();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Research topic could not be added.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleUpdateResearchTopic = async (topicId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = researchDrafts[topicId];

    if (!draft) {
      return;
    }

    const validationMessage = validateResearchForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const existingTopic = topics.find((topic) => topic.id === topicId);
      const imageFile = editImageFiles[topicId] ?? null;
      const uploadedImageUrl = imageFile
        ? await uploadResearchImage(imageFile, topicId, topicId)
        : undefined;
      const imageUrlToSave = resolveResearchImageUrl({
        form: draft,
        uploadedImageUrl,
        existingImageUrl: existingTopic?.image_url,
        clearRequested: clearedImageIds[topicId],
      });
      const draftToSave = {
        ...draft,
        imageUrl: imageUrlToSave ?? "",
      };
      const { error } = await supabase
        .from("research_topics")
        .update(getResearchPayload(draftToSave, imageUrlToSave))
        .eq("id", topicId);

      if (error) {
        throw error;
      }

      setSuccessMessage("Research topic updated.");
      setEditingId(null);
      setEditImageFiles((current) => ({ ...current, [topicId]: null }));
      setClearedImageIds((current) => ({ ...current, [topicId]: false }));
      await loadResearchTopics();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Research topic could not be updated.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleToggleTopicVisibility = async (topic: ResearchRecord) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("research_topics")
      .update({ is_visible: topic.is_visible === false })
      .eq("id", topic.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Research topic visibility updated.");
    setSaving(false);
    await loadResearchTopics();
  };

  const handleDeleteResearchTopic = async (topic: ResearchRecord) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${topic.title}"? This research topic will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("research_topics")
      .delete()
      .eq("id", topic.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Research topic deleted.");
    setSaving(false);
    await loadResearchTopics();
  };

  const renderResearchForm = (
    form: ResearchForm,
    onChange: (field: keyof ResearchForm, value: string | boolean) => void,
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
        value={form.subtitle}
        onChange={(event) => onChange("subtitle", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Subtitle"
      />
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <input
        value={form.keywords}
        onChange={(event) => onChange("keywords", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Keywords, comma-separated"
      />
      <input
        value={form.imageUrl}
        onChange={(event) => onChange("imageUrl", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Manual image URL, optional"
      />
      <textarea
        value={form.description}
        onChange={(event) => onChange("description", event.target.value)}
        className="min-h-32 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Description"
        required
      />
      <div className="rounded-md border border-line bg-white/70 p-3 text-sm lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Research image
        </p>
        <div className="mt-2 flex items-center gap-3">
          {form.imageUrl.trim() ? (
            <div
              className="h-16 w-24 rounded-md border border-line bg-cover bg-center"
              style={{ backgroundImage: `url(${form.imageUrl.trim()})` }}
              role="img"
              aria-label="Research image preview"
            />
          ) : (
            <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-line text-muted">
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
        <span>Upload image, optional</span>
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
      title="Research"
      description="Manage ongoing projects, public research topic sections, and images."
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Research
          </p>
          <h2 className="mt-4 text-3xl font-semibold">Research management</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Maintain Supabase-backed ongoing projects and research directions
            for the public Research page. Visible research topics also appear
            as compact highlights on the Home page.
          </p>
        </div>
        {!loading && userCanManageResearch ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add Research Topic
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading research tools...
        </div>
      ) : null}

      {!loading && !userCanManageResearch ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage research topics.
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

      {!loading && userCanManageResearch ? (
        <div className="mt-8 grid gap-6">
          <PortalOngoingProjectsManager currentUserId={currentUserId} />

          {showAddForm ? (
            <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Add research topic</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {renderResearchForm(
                researchForm,
                updateResearchForm,
                handleAddResearchTopic,
                newImageFile,
                setNewImageFile,
                () => {
                  setResearchForm((current) => ({ ...current, imageUrl: "" }));
                  setNewImageFile(null);
                  setNewImageCleared(true);
                },
                "Add Research Topic",
                "new",
              )}
            </section>
          ) : null}

          <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Research Directions
              </p>
              <h3 className="mt-3 text-2xl font-semibold">
                Research topic management
              </h3>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand"
                  placeholder="Search title, subtitle, description, or keywords"
                />
              </label>
              <select
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value)}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All visibility</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {filteredTopics.length} research topic
                {filteredTopics.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => void loadResearchTopics()}
                className="font-semibold text-brand transition hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            {filteredTopics.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No research topics match the current filters.
              </div>
            ) : null}

            {filteredTopics.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
                <div className="min-w-[980px] divide-y divide-line">
                  <div className="grid grid-cols-[96px_70px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_84px_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Image</span>
                    <span>Order</span>
                    <span>Title</span>
                    <span>Subtitle</span>
                    <span>Keywords</span>
                    <span>Visible</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {filteredTopics.map((topic) => {
                    const draft = researchDrafts[topic.id] ?? toResearchForm(topic);
                    const isEditing = editingId === topic.id;

                    return (
                      <div key={topic.id} className="divide-y divide-line">
                        <div className="grid grid-cols-[96px_70px_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_84px_auto] gap-3 px-3 py-3 text-sm">
                          <div>{thumbnail(topic)}</div>
                          <p className="text-sm text-muted">
                            {topic.display_order ?? 0}
                          </p>
                          <p className="line-clamp-2 font-semibold leading-6">
                            {topic.title}
                          </p>
                          <p className="line-clamp-2 text-sm text-muted">
                            {topic.subtitle ?? "TBD"}
                          </p>
                          <p className="line-clamp-2 text-sm text-muted">
                            {(topic.keywords ?? []).join(", ") || "TBD"}
                          </p>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleToggleTopicVisibility(topic)}
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {topic.is_visible === false ? "Hidden" : "Visible"}
                          </button>
                          <div className="flex h-fit flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setEditingId(isEditing ? null : topic.id)
                              }
                              className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleDeleteResearchTopic(topic)}
                              className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="bg-[#f9fbfc] px-3 py-4">
                            {renderResearchForm(
                              draft,
                              (field, value) =>
                                updateResearchDraft(topic.id, field, value),
                              (event) => {
                                event.preventDefault();
                                void handleUpdateResearchTopic(topic.id);
                              },
                              editImageFiles[topic.id] ?? null,
                              (file) =>
                                setEditImageFiles((current) => ({
                                  ...current,
                                  [topic.id]: file,
                                })),
                              () => {
                                setResearchDrafts((current) => ({
                                  ...current,
                                  [topic.id]: {
                                    ...draft,
                                    imageUrl: "",
                                  },
                                }));
                                setEditImageFiles((current) => ({
                                  ...current,
                                  [topic.id]: null,
                                }));
                                setClearedImageIds((current) => ({
                                  ...current,
                                  [topic.id]: true,
                                }));
                              },
                              "Save Research Topic",
                              topic.id,
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
