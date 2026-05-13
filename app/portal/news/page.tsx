"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon, Plus, Search } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import type { SupabaseNewsPost } from "@/lib/news";
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

type NewsPostRecord = SupabaseNewsPost;

type GalleryImageForm = {
  url: string;
  caption: string;
};

type NewsPostForm = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  body: string;
  eventDate: string;
  mainImageUrl: string;
  galleryImages: GalleryImageForm[];
  isFeatured: boolean;
  isVisible: boolean;
  displayOrder: string;
};

const categoryOptions = [
  "Student Awards",
  "PI Awards",
  "Group Events",
  "Research Updates",
  "General Lab News",
];

const emptyNewsForm: NewsPostForm = {
  title: "",
  slug: "",
  category: "General Lab News",
  summary: "",
  body: "",
  eventDate: "",
  mainImageUrl: "",
  galleryImages: [],
  isFeatured: false,
  isVisible: true,
  displayOrder: "0",
};

const newsSelect =
  "id, slug, title, category, summary, body, event_date, main_image_url, gallery_images, is_featured, is_visible, display_order, created_by, created_at, updated_at";

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "image";
  const baseName = name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "news-image"}.${extension}`;
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function bodyToString(body: NewsPostRecord["body"]) {
  if (Array.isArray(body)) {
    return body.join("\n\n");
  }

  return body ?? "";
}

function toGalleryForm(value: NewsPostRecord["gallery_images"]) {
  return (value ?? []).map((image) => ({
    url: image.url,
    caption: image.caption ?? "",
  }));
}

function toNewsForm(post: NewsPostRecord): NewsPostForm {
  return {
    title: post.title ?? "",
    slug: post.slug ?? "",
    category: post.category ?? "General Lab News",
    summary: post.summary ?? "",
    body: bodyToString(post.body),
    eventDate: dateInputValue(post.event_date),
    mainImageUrl: post.main_image_url ?? "",
    galleryImages: toGalleryForm(post.gallery_images),
    isFeatured: post.is_featured === true,
    isVisible: post.is_visible !== false,
    displayOrder: String(post.display_order ?? 0),
  };
}

function parseDisplayOrder(value: string) {
  return value.trim() ? Number(value) : 0;
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "News images must be JPG, PNG, or WEBP files.";
  }

  if (file.size > maxImageSize) {
    return "News images must be 5 MB or smaller.";
  }

  return "";
}

function galleryForPayload(images: GalleryImageForm[]) {
  return images
    .map((image) => ({
      url: image.url.trim(),
      caption: image.caption.trim(),
    }))
    .filter((image) => image.url);
}

function getNewsPayload(
  form: NewsPostForm,
  mainImageUrlOverride?: string | null,
  galleryImagesOverride?: GalleryImageForm[],
) {
  const nextMainImageUrl =
    mainImageUrlOverride !== undefined
      ? mainImageUrlOverride
      : form.mainImageUrl.trim() || null;
  const galleryImages = galleryForPayload(
    galleryImagesOverride ?? form.galleryImages,
  );

  return {
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    category: form.category.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    event_date: form.eventDate || null,
    main_image_url: nextMainImageUrl,
    gallery_images: galleryImages,
    is_featured: form.isFeatured,
    is_visible: form.isVisible,
    display_order: parseDisplayOrder(form.displayOrder),
  };
}

function validateNewsForm(form: NewsPostForm) {
  const payload = getNewsPayload(form);

  if (
    !payload.title ||
    !payload.slug ||
    !payload.category ||
    !payload.summary ||
    !payload.body ||
    !payload.event_date
  ) {
    return "Title, slug, category, summary, body, and event date are required.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

function thumbnail(post: NewsPostRecord) {
  if (post.main_image_url) {
    return (
      <div
        className="h-16 w-20 rounded-md border border-line bg-cover bg-center"
        style={{ backgroundImage: `url(${post.main_image_url})` }}
        role="img"
        aria-label={`${post.title} thumbnail`}
      />
    );
  }

  return (
    <div className="flex h-16 w-20 items-center justify-center rounded-md border border-dashed border-line bg-white/70 text-muted">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

async function uploadNewsImageToStorage(
  file: File,
  folderId: string,
  filePrefix: string,
) {
  const prefix = filePrefix ? `${filePrefix}-` : "";
  const path = `news/${folderId}/${prefix}${Date.now()}-${safeFileName(
    file.name,
  )}`;
  const { data, error } = await supabase.storage
    .from("news-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("news-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalNewsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [enabledWebsiteSections, setEnabledWebsiteSections] = useState<string[]>(
    [],
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setUserIsProjectAdmin] = useState(false);
  const [newsPosts, setNewsPosts] = useState<NewsPostRecord[]>([]);
  const [newsForm, setNewsForm] = useState<NewsPostForm>(emptyNewsForm);
  const [newsDrafts, setNewsDrafts] = useState<Record<string, NewsPostForm>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNewsFolderId, setNewNewsFolderId] = useState<string | null>(null);
  const [newMainImageFile, setNewMainImageFile] = useState<File | null>(null);
  const [editMainImageFiles, setEditMainImageFiles] = useState<
    Record<string, File | null>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [featuredFilter, setFeaturedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageNews = canManageWebsiteSection({
    role,
    enabledSections: enabledWebsiteSections,
    section: "news",
  });

  const loadNewsPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("news_posts")
      .select(newsSelect)
      .order("event_date", { ascending: false })
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setNewsPosts([]);
      setNewsDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextPosts = (data ?? []) as NewsPostRecord[];
    setNewsPosts(nextPosts);
    setNewsDrafts(
      nextPosts.reduce<Record<string, NewsPostForm>>((accumulator, post) => {
        accumulator[post.id] = toNewsForm(post);
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
      setErrorMessage("Please sign in again before managing news.");
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
        section: "news",
      })
    ) {
      await loadNewsPosts();
    }

    setLoading(false);
  }, [loadNewsPosts]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return newsPosts
      .filter((post) => {
        if (!normalizedSearch) {
          return true;
        }

        return [post.title, post.summary, post.body]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .filter((post) =>
        categoryFilter === "all" ? true : post.category === categoryFilter,
      )
      .filter((post) => {
        if (visibilityFilter === "visible") {
          return post.is_visible !== false;
        }

        if (visibilityFilter === "hidden") {
          return post.is_visible === false;
        }

        return true;
      })
      .filter((post) => {
        if (featuredFilter === "featured") {
          return post.is_featured === true;
        }

        if (featuredFilter === "not-featured") {
          return post.is_featured !== true;
        }

        return true;
      });
  }, [categoryFilter, featuredFilter, newsPosts, searchQuery, visibilityFilter]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / pageSize));
  const visiblePosts = filteredPosts.slice((page - 1) * pageSize, page * pageSize);

  const updateNewsForm = (
    field: keyof NewsPostForm,
    value: string | boolean | GalleryImageForm[],
  ) => {
    setNewsForm((current) => ({
      ...current,
      [field]: value,
      slug:
        field === "title" && !current.slug
          ? slugify(String(value))
          : current.slug,
    }));
  };

  const updateNewsDraft = (
    postId: string,
    field: keyof NewsPostForm,
    value: string | boolean | GalleryImageForm[],
  ) => {
    setNewsDrafts((current) => ({
      ...current,
      [postId]: {
        ...current[postId],
        [field]: value,
      },
    }));
  };

  const handleSingleImageSelection = (
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

  const handleGalleryUploadSelection = async ({
    event,
    folderId,
    uploadId,
    currentGallery,
    onGalleryChange,
  }: {
    event: ChangeEvent<HTMLInputElement>;
    folderId: string;
    uploadId: string;
    currentGallery: GalleryImageForm[];
    onGalleryChange: (images: GalleryImageForm[]) => void;
  }) => {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (selectedFiles.length === 0) {
      return;
    }

    const invalidFile = selectedFiles.find((file) => validateImageFile(file));

    if (invalidFile) {
      setErrorMessage(validateImageFile(invalidFile));
      event.target.value = "";
      return;
    }

    setUploadingId(uploadId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const uploadedImages = await Promise.all(
        selectedFiles.map(async (file) => ({
          url: await uploadNewsImageToStorage(
            file,
            `${folderId}/gallery`,
            "",
          ),
          caption: "",
        })),
      );

      onGalleryChange([...currentGallery, ...uploadedImages]);
      setSuccessMessage(
        `${uploadedImages.length} gallery image${
          uploadedImages.length === 1 ? "" : "s"
        } uploaded.`,
      );
      event.target.value = "";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gallery images could not be uploaded.",
      );
    } finally {
      setUploadingId(null);
    }
  };

  const uploadMainImage = async (
    file: File | null,
    folderId: string,
    existingUrl: string | null,
    manualUrl: string,
    uploadId: string,
  ) => {
    if (!file) {
      return manualUrl.trim() || existingUrl || null;
    }

    setUploadingId(uploadId);

    try {
      return await uploadNewsImageToStorage(file, folderId, "main");
    } finally {
      setUploadingId(null);
    }
  };

  const handleAddNewsPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageNews) {
      setErrorMessage("You do not have permission to manage news.");
      return;
    }

    const validationMessage = validateNewsForm(newsForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const folderId = newNewsFolderId ?? crypto.randomUUID();
      const mainImageUrl = await uploadMainImage(
        newMainImageFile,
        folderId,
        null,
        newsForm.mainImageUrl,
        "new",
      );
      const formToSave = {
        ...newsForm,
        mainImageUrl: mainImageUrl ?? "",
      };
      const { error } = await supabase.from("news_posts").insert({
        ...getNewsPayload(formToSave, mainImageUrl, formToSave.galleryImages),
        created_by: currentUserId,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("News post added.");
      setNewsForm(emptyNewsForm);
      setNewMainImageFile(null);
      setNewNewsFolderId(null);
      setShowAddForm(false);
      await loadNewsPosts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "News post could not be added.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleUpdateNewsPost = async (postId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = newsDrafts[postId];

    if (!draft) {
      return;
    }

    const validationMessage = validateNewsForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const existingPost = newsPosts.find((post) => post.id === postId);
      const mainImageUrl = await uploadMainImage(
        editMainImageFiles[postId] ?? null,
        postId,
        existingPost?.main_image_url ?? null,
        draft.mainImageUrl,
        postId,
      );
      const draftToSave = {
        ...draft,
        mainImageUrl: mainImageUrl ?? "",
      };
      const { error } = await supabase
        .from("news_posts")
        .update(getNewsPayload(draftToSave, mainImageUrl, draftToSave.galleryImages))
        .eq("id", postId);

      if (error) {
        throw error;
      }

      setSuccessMessage("News post updated.");
      setEditingId(null);
      setEditMainImageFiles((current) => ({ ...current, [postId]: null }));
      await loadNewsPosts();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "News post could not be updated.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleToggleNewsFlag = async (
    post: NewsPostRecord,
    field: "is_featured" | "is_visible",
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("news_posts")
      .update({ [field]: !post[field] })
      .eq("id", post.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      field === "is_visible"
        ? "News visibility updated."
        : "News featured status updated.",
    );
    setSaving(false);
    await loadNewsPosts();
  };

  const handleDeleteNewsPost = async (post: NewsPostRecord) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${post.title}"? This news post will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("news_posts").delete().eq("id", post.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("News post deleted.");
    setSaving(false);
    await loadNewsPosts();
  };

  const updateGalleryImage = (
    images: GalleryImageForm[],
    index: number,
    field: keyof GalleryImageForm,
    value: string,
  ) =>
    images.map((image, imageIndex) =>
      imageIndex === index ? { ...image, [field]: value } : image,
    );

  const renderNewsForm = (
    form: NewsPostForm,
    onChange: (
      field: keyof NewsPostForm,
      value: string | boolean | GalleryImageForm[],
    ) => void,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void,
    mainImageFile: File | null,
    onMainImageChange: (file: File | null) => void,
    onGalleryUpload: (event: ChangeEvent<HTMLInputElement>) => void,
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
        value={form.slug}
        onChange={(event) => onChange("slug", slugify(event.target.value))}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Slug"
        required
      />
      <input
        type="date"
        value={form.eventDate}
        onChange={(event) => onChange("eventDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        required
      />
      <select
        value={form.category}
        onChange={(event) => onChange("category", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        required
      >
        {categoryOptions.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <input
        value={form.mainImageUrl}
        onChange={(event) => onChange("mainImageUrl", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Manual main image URL, optional"
      />
      <textarea
        value={form.summary}
        onChange={(event) => onChange("summary", event.target.value)}
        className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Summary"
        required
      />
      <textarea
        value={form.body}
        onChange={(event) => onChange("body", event.target.value)}
        className="min-h-36 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Body text"
        required
      />

      <div className="rounded-md border border-line bg-white/70 p-3 text-sm lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Main image
        </p>
        <div className="mt-2 flex items-center gap-3">
          {form.mainImageUrl.trim() ? (
            <div
              className="h-16 w-24 rounded-md border border-line bg-cover bg-center"
              style={{ backgroundImage: `url(${form.mainImageUrl.trim()})` }}
              role="img"
              aria-label="News main image preview"
            />
          ) : (
            <div className="flex h-16 w-24 items-center justify-center rounded-md border border-dashed border-line text-muted">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">
              {form.mainImageUrl.trim() || "No main image URL saved yet."}
            </p>
            {form.mainImageUrl.trim() ? (
              <button
                type="button"
                onClick={() => onChange("mainImageUrl", "")}
                className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
              >
                Clear main image
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <label className="grid gap-1 text-sm font-medium text-muted lg:col-span-2">
        <span>Upload main image, optional</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            handleSingleImageSelection(event, onMainImageChange)
          }
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
        />
        <span className="text-xs font-normal text-muted">
          JPG, PNG, or WEBP. Max 5 MB.
          {mainImageFile ? ` Selected: ${mainImageFile.name}` : ""}
        </span>
      </label>

      <div className="rounded-md border border-line bg-white/70 p-3 lg:col-span-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Gallery images
          </p>
          <button
            type="button"
            onClick={() =>
              onChange("galleryImages", [
                ...form.galleryImages,
                { url: "", caption: "" },
              ])
            }
            className="text-xs font-semibold text-brand transition hover:text-foreground"
          >
            Add gallery URL
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          {form.galleryImages.length === 0 ? (
            <p className="text-sm text-muted">No gallery images yet.</p>
          ) : null}
          {form.galleryImages.map((image, index) => (
            <div
              key={`${index}-${image.url}`}
              className="grid gap-2 rounded-md border border-line bg-white/70 p-2 md:grid-cols-[72px_1fr_1fr_auto]"
            >
              {image.url.trim() ? (
                <div
                  className="h-14 w-16 rounded-md border border-line bg-cover bg-center"
                  style={{ backgroundImage: `url(${image.url.trim()})` }}
                  role="img"
                  aria-label="Gallery image preview"
                />
              ) : (
                <div className="flex h-14 w-16 items-center justify-center rounded-md border border-dashed border-line text-muted">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <input
                value={image.url}
                onChange={(event) =>
                  onChange(
                    "galleryImages",
                    updateGalleryImage(
                      form.galleryImages,
                      index,
                      "url",
                      event.target.value,
                    ),
                  )
                }
                className="rounded-md border border-line bg-white px-3 py-2 text-xs outline-none transition focus:border-brand"
                placeholder="Gallery image URL"
              />
              <input
                value={image.caption}
                onChange={(event) =>
                  onChange(
                    "galleryImages",
                    updateGalleryImage(
                      form.galleryImages,
                      index,
                      "caption",
                      event.target.value,
                    ),
                  )
                }
                className="rounded-md border border-line bg-white px-3 py-2 text-xs outline-none transition focus:border-brand"
                placeholder="Caption, optional"
              />
              <button
                type="button"
                onClick={() =>
                  onChange(
                    "galleryImages",
                    form.galleryImages.filter(
                      (_image, imageIndex) => imageIndex !== index,
                    ),
                  )
                }
                className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="grid gap-1 text-sm font-medium text-muted lg:col-span-2">
        <span>Upload gallery images, optional</span>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onGalleryUpload}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
        />
        <span className="text-xs font-normal text-muted">
          Files upload immediately and are added to the gallery list. Each image
          must be 5 MB or smaller.
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
        {uploadingId === uploadId || uploadingId === `${uploadId}-gallery` ? (
          <span className="text-xs font-medium text-muted">Uploading images...</span>
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
      title="News"
      description="Manage public lab news posts, visibility, featured status, and image galleries."
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            News
          </p>
          <h2 className="mt-4 text-3xl font-semibold">News management</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Maintain Supabase-backed news posts used by the public News page,
            detail pages, and the homepage Latest News section.
          </p>
        </div>
        {!loading && userCanManageNews ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add News Post
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading news tools...
        </div>
      ) : null}

      {!loading && !userCanManageNews ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage news.
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

      {!loading && userCanManageNews ? (
        <div className="mt-8 grid gap-6">
          {showAddForm ? (
            <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Add news post</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {renderNewsForm(
                newsForm,
                updateNewsForm,
                handleAddNewsPost,
                newMainImageFile,
                setNewMainImageFile,
                (event) => {
                  const folderId = newNewsFolderId ?? crypto.randomUUID();
                  setNewNewsFolderId(folderId);
                  void handleGalleryUploadSelection({
                    event,
                    folderId,
                    uploadId: "new-gallery",
                    currentGallery: newsForm.galleryImages,
                    onGalleryChange: (images) =>
                      setNewsForm((current) => ({
                        ...current,
                        galleryImages: images,
                      })),
                  });
                },
                "Add News Post",
                "new",
              )}
            </section>
          ) : null}

          <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand"
                  placeholder="Search title, summary, or body"
                />
              </label>
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                Showing {visiblePosts.length} of {filteredPosts.length} filtered
                news posts
              </span>
              <button
                type="button"
                onClick={() => void loadNewsPosts()}
                className="font-semibold text-brand transition hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No news posts match the current filters.
              </div>
            ) : null}

            {filteredPosts.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
                <div className="min-w-[980px] divide-y divide-line">
                  <div className="grid grid-cols-[96px_110px_150px_minmax(260px,1fr)_92px_84px_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Thumbnail</span>
                    <span>Date</span>
                    <span>Category</span>
                    <span>Title</span>
                    <span>Featured</span>
                    <span>Visible</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {visiblePosts.map((post) => {
                    const draft = newsDrafts[post.id] ?? toNewsForm(post);
                    const isEditing = editingId === post.id;

                    return (
                      <div key={post.id} className="divide-y divide-line">
                        <div className="grid grid-cols-[96px_110px_150px_minmax(260px,1fr)_92px_84px_auto] gap-3 px-3 py-3 text-sm">
                          <div>{thumbnail(post)}</div>
                          <p className="text-sm text-muted">
                            {formatDate(post.event_date)}
                          </p>
                          <p className="text-sm text-muted">{post.category}</p>
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-semibold leading-6">
                              {post.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-muted">
                              {post.summary}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleToggleNewsFlag(post, "is_featured")
                            }
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {post.is_featured ? "Featured" : "No"}
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleToggleNewsFlag(post, "is_visible")
                            }
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {post.is_visible === false ? "Hidden" : "Visible"}
                          </button>
                          <div className="flex h-fit flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setEditingId(isEditing ? null : post.id)
                              }
                              className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleDeleteNewsPost(post)}
                              className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="bg-[#f9fbfc] px-3 py-4">
                            {renderNewsForm(
                              draft,
                              (field, value) => updateNewsDraft(post.id, field, value),
                              (event) => {
                                event.preventDefault();
                                void handleUpdateNewsPost(post.id);
                              },
                              editMainImageFiles[post.id] ?? null,
                              (file) =>
                                setEditMainImageFiles((current) => ({
                                  ...current,
                                  [post.id]: file,
                                })),
                              (event) => {
                                void handleGalleryUploadSelection({
                                  event,
                                  folderId: post.id,
                                  uploadId: `${post.id}-gallery`,
                                  currentGallery: draft.galleryImages,
                                  onGalleryChange: (images) =>
                                    setNewsDrafts((current) => ({
                                      ...current,
                                      [post.id]: {
                                        ...draft,
                                        galleryImages: images,
                                      },
                                    })),
                                });
                              },
                              "Save News Post",
                              post.id,
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filteredPosts.length > pageSize ? (
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
