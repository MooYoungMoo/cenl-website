"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Image as ImageIcon, Plus, Search } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import type { SupabaseLabMember } from "@/lib/members";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type MemberRecord = SupabaseLabMember;

type MemberForm = {
  name: string;
  memberType: "current" | "alumni";
  role: string;
  degreeProgram: string;
  email: string;
  biography: string;
  currentAffiliation: string;
  photoUrl: string;
  displayOrder: string;
  isVisible: boolean;
};

const emptyMemberForm: MemberForm = {
  name: "",
  memberType: "current",
  role: "",
  degreeProgram: "",
  email: "",
  biography: "",
  currentAffiliation: "",
  photoUrl: "",
  displayOrder: "0",
  isVisible: true,
};

const memberSelect =
  "id, name, member_type, role, degree_program, email, biography, current_affiliation, photo_url, display_order, is_visible, created_by, created_at, updated_at";

const maxImageSize = 5 * 1024 * 1024;
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function canManage(role: string | null) {
  return role === "professor" || role === "admin";
}

function toMemberForm(member: MemberRecord): MemberForm {
  return {
    name: member.name ?? "",
    memberType: member.member_type === "alumni" ? "alumni" : "current",
    role: member.role ?? "",
    degreeProgram: member.degree_program ?? "",
    email: member.email ?? "",
    biography: member.biography ?? "",
    currentAffiliation: member.current_affiliation ?? "",
    photoUrl: member.photo_url ?? "",
    displayOrder: String(member.display_order ?? 0),
    isVisible: member.is_visible !== false,
  };
}

function parseDisplayOrder(value: string) {
  return value.trim() ? Number(value) : 0;
}

function getMemberPayload(form: MemberForm, photoUrlOverride?: string | null) {
  const nextPhotoUrl =
    photoUrlOverride !== undefined ? photoUrlOverride : form.photoUrl.trim() || null;

  return {
    name: form.name.trim(),
    member_type: form.memberType,
    role: form.role.trim() || null,
    degree_program: form.degreeProgram.trim() || null,
    email: form.email.trim() || null,
    biography: form.biography.trim() || null,
    current_affiliation: form.currentAffiliation.trim() || null,
    photo_url: nextPhotoUrl,
    display_order: parseDisplayOrder(form.displayOrder),
    is_visible: form.isVisible,
  };
}

function resolveMemberPhotoUrl({
  form,
  uploadedPhotoUrl,
  existingPhotoUrl,
  clearRequested,
}: {
  form: MemberForm;
  uploadedPhotoUrl?: string;
  existingPhotoUrl?: string | null;
  clearRequested?: boolean;
}) {
  if (uploadedPhotoUrl) {
    return uploadedPhotoUrl;
  }

  const manualPhotoUrl = form.photoUrl.trim();

  if (manualPhotoUrl) {
    return manualPhotoUrl;
  }

  if (clearRequested) {
    return null;
  }

  return existingPhotoUrl ?? null;
}

function validateMemberForm(form: MemberForm) {
  const payload = getMemberPayload(form);

  if (!payload.name || !payload.member_type) {
    return "Name and member type are required.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return "Member photos must be JPG, PNG, or WEBP files.";
  }

  if (file.size > maxImageSize) {
    return "Member photos must be 5 MB or smaller.";
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

  return `${baseName || "member-photo"}.${extension}`;
}

function thumbnail(member: MemberRecord) {
  if (member.photo_url) {
    return (
      <div
        className="h-16 w-16 rounded-md border border-line bg-cover bg-center"
        style={{ backgroundImage: `url(${member.photo_url})` }}
        role="img"
        aria-label={`${member.name} photo`}
      />
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-line bg-white/70 text-muted">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

async function uploadMemberPhotoToStorage(file: File, folderId: string) {
  const path = `members/${folderId}/${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("member-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("member-images").getPublicUrl(data.path);

  return publicUrl;
}

export default function PortalMembersPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userIsProjectAdmin, setUserIsProjectAdmin] = useState(false);
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [memberForm, setMemberForm] = useState<MemberForm>(emptyMemberForm);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberForm>>(
    {},
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoCleared, setNewPhotoCleared] = useState(false);
  const [editPhotoFiles, setEditPhotoFiles] = useState<
    Record<string, File | null>
  >({});
  const [clearedPhotoIds, setClearedPhotoIds] = useState<
    Record<string, boolean>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManageMembers = canManage(role) || userIsProjectAdmin;

  const loadMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("lab_members")
      .select(memberSelect)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMembers([]);
      setMemberDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextMembers = (data ?? []) as MemberRecord[];
    setMembers(nextMembers);
    setMemberDrafts(
      nextMembers.reduce<Record<string, MemberForm>>((accumulator, member) => {
        accumulator[member.id] = toMemberForm(member);
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
      setCurrentUserId(null);
      setUserIsProjectAdmin(false);
      setErrorMessage("Please sign in again before managing members.");
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
      await loadMembers();
    }

    setLoading(false);
  }, [loadMembers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const filteredMembers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return members
      .filter((member) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          member.name,
          member.role,
          member.email,
          member.biography,
          member.current_affiliation,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .filter((member) =>
        typeFilter === "all" ? true : member.member_type === typeFilter,
      )
      .filter((member) => {
        if (visibilityFilter === "visible") {
          return member.is_visible !== false;
        }

        if (visibilityFilter === "hidden") {
          return member.is_visible === false;
        }

        return true;
      });
  }, [members, searchQuery, typeFilter, visibilityFilter]);

  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const visibleMembers = filteredMembers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const updateMemberForm = (
    field: keyof MemberForm,
    value: string | boolean,
  ) => {
    setMemberForm((current) => ({ ...current, [field]: value }));

    if (field === "photoUrl" && typeof value === "string" && value.trim()) {
      setNewPhotoCleared(false);
    }
  };

  const updateMemberDraft = (
    memberId: string,
    field: keyof MemberForm,
    value: string | boolean,
  ) => {
    setMemberDrafts((current) => ({
      ...current,
      [memberId]: {
        ...current[memberId],
        [field]: value,
      },
    }));

    if (field === "photoUrl" && typeof value === "string" && value.trim()) {
      setClearedPhotoIds((current) => ({ ...current, [memberId]: false }));
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

  const uploadMemberPhoto = async (
    file: File,
    folderId: string,
    uploadId: string,
  ) => {
    setUploadingId(uploadId);

    try {
      return await uploadMemberPhotoToStorage(file, folderId);
    } finally {
      setUploadingId(null);
    }
  };

  const handleAddMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManageMembers) {
      setErrorMessage("You do not have permission to manage members.");
      return;
    }

    const validationMessage = validateMemberForm(memberForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const folderId = crypto.randomUUID();
      const uploadedPhotoUrl = newPhotoFile
        ? await uploadMemberPhoto(newPhotoFile, folderId, "new")
        : undefined;
      const photoUrlToSave = resolveMemberPhotoUrl({
        form: memberForm,
        uploadedPhotoUrl,
        clearRequested: newPhotoCleared,
      });
      const formToSave = {
        ...memberForm,
        photoUrl: photoUrlToSave ?? "",
      };
      const { error } = await supabase.from("lab_members").insert({
        ...getMemberPayload(formToSave, photoUrlToSave),
        created_by: currentUserId,
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Member added.");
      setMemberForm(emptyMemberForm);
      setNewPhotoFile(null);
      setNewPhotoCleared(false);
      setShowAddForm(false);
      await loadMembers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Member could not be added.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleUpdateMember = async (memberId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = memberDrafts[memberId];

    if (!draft) {
      return;
    }

    const validationMessage = validateMemberForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const existingMember = members.find((member) => member.id === memberId);
      const photoFile = editPhotoFiles[memberId] ?? null;
      const uploadedPhotoUrl = photoFile
        ? await uploadMemberPhoto(photoFile, memberId, memberId)
        : undefined;
      const photoUrlToSave = resolveMemberPhotoUrl({
        form: draft,
        uploadedPhotoUrl,
        existingPhotoUrl: existingMember?.photo_url,
        clearRequested: clearedPhotoIds[memberId],
      });
      const draftToSave = {
        ...draft,
        photoUrl: photoUrlToSave ?? "",
      };
      const { error } = await supabase
        .from("lab_members")
        .update(getMemberPayload(draftToSave, photoUrlToSave))
        .eq("id", memberId);

      if (error) {
        throw error;
      }

      setSuccessMessage("Member updated.");
      setEditingId(null);
      setEditPhotoFiles((current) => ({ ...current, [memberId]: null }));
      setClearedPhotoIds((current) => ({ ...current, [memberId]: false }));
      await loadMembers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Member could not be updated.",
      );
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  };

  const handleToggleMemberVisibility = async (member: MemberRecord) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("lab_members")
      .update({ is_visible: member.is_visible === false })
      .eq("id", member.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Member visibility updated.");
    setSaving(false);
    await loadMembers();
  };

  const handleDeleteMember = async (member: MemberRecord) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${member.name}"? This member record will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("lab_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Member deleted.");
    setSaving(false);
    await loadMembers();
  };

  const renderMemberForm = (
    form: MemberForm,
    onChange: (field: keyof MemberForm, value: string | boolean) => void,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void,
    photoFile: File | null,
    onPhotoChange: (file: File | null) => void,
    onClearPhoto: () => void,
    submitLabel: string,
    uploadId: string,
  ) => (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-md border border-line bg-white/55 p-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <input
        value={form.name}
        onChange={(event) => onChange("name", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Name"
        required
      />
      <select
        value={form.memberType}
        onChange={(event) =>
          onChange("memberType", event.target.value as "current" | "alumni")
        }
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        required
      >
        <option value="current">current</option>
        <option value="alumni">alumni</option>
      </select>
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <input
        value={form.role}
        onChange={(event) => onChange("role", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Role"
      />
      <input
        value={form.degreeProgram}
        onChange={(event) => onChange("degreeProgram", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Degree / Program"
      />
      <input
        value={form.email}
        onChange={(event) => onChange("email", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Email"
      />
      <input
        value={form.currentAffiliation}
        onChange={(event) => onChange("currentAffiliation", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Current affiliation"
      />
      <input
        value={form.photoUrl}
        onChange={(event) => onChange("photoUrl", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Manual photo URL, optional"
      />
      <textarea
        value={form.biography}
        onChange={(event) => onChange("biography", event.target.value)}
        className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Biography"
      />
      <div className="rounded-md border border-line bg-white/70 p-3 text-sm lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          Profile photo
        </p>
        <div className="mt-2 flex items-center gap-3">
          {form.photoUrl.trim() ? (
            <div
              className="h-16 w-16 rounded-md border border-line bg-cover bg-center"
              style={{ backgroundImage: `url(${form.photoUrl.trim()})` }}
              role="img"
              aria-label="Member photo preview"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-line text-muted">
              <ImageIcon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs text-muted">
              {form.photoUrl.trim() || "No photo URL saved yet."}
            </p>
            {form.photoUrl.trim() ? (
              <button
                type="button"
                onClick={onClearPhoto}
                className="mt-2 text-xs font-semibold text-accent transition hover:text-foreground"
              >
                Clear photo
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <label className="grid gap-1 text-sm font-medium text-muted lg:col-span-2">
        <span>Upload photo, optional</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileSelection(event, onPhotoChange)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand focus:border-brand"
        />
        <span className="text-xs font-normal text-muted">
          JPG, PNG, or WEBP. Max 5 MB.
          {photoFile ? ` Selected: ${photoFile.name}` : ""}
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
          <span className="text-xs font-medium text-muted">Uploading photo...</span>
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
      title="Members"
      description="Manage current lab member and alumni profile cards."
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Members
          </p>
          <h2 className="mt-4 text-3xl font-semibold">Members management</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Maintain Supabase-backed current member and alumni records for the
            public member directory. The PI page remains managed separately.
          </p>
        </div>
        {!loading && userCanManageMembers ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading member tools...
        </div>
      ) : null}

      {!loading && !userCanManageMembers ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage members.
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

      {!loading && userCanManageMembers ? (
        <div className="mt-8 grid gap-6">
          {showAddForm ? (
            <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Add member</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {renderMemberForm(
                memberForm,
                updateMemberForm,
                handleAddMember,
                newPhotoFile,
                setNewPhotoFile,
                () => {
                  setMemberForm((current) => ({ ...current, photoUrl: "" }));
                  setNewPhotoFile(null);
                  setNewPhotoCleared(true);
                },
                "Add Member",
                "new",
              )}
            </section>
          ) : null}

          <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-md border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand"
                  placeholder="Search name, role, email, biography, or affiliation"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All types</option>
                <option value="current">Current</option>
                <option value="alumni">Alumni</option>
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
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {visibleMembers.length} of {filteredMembers.length} filtered
                members
              </span>
              <button
                type="button"
                onClick={() => void loadMembers()}
                className="font-semibold text-brand transition hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No members match the current filters.
              </div>
            ) : null}

            {filteredMembers.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
                <div className="min-w-[1120px] divide-y divide-line">
                  <div className="grid grid-cols-[80px_180px_90px_150px_170px_180px_80px_70px_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Photo</span>
                    <span>Name</span>
                    <span>Type</span>
                    <span>Role</span>
                    <span>Degree/Program</span>
                    <span>Email</span>
                    <span>Visible</span>
                    <span>Order</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {visibleMembers.map((member) => {
                    const draft = memberDrafts[member.id] ?? toMemberForm(member);
                    const isEditing = editingId === member.id;

                    return (
                      <div key={member.id} className="divide-y divide-line">
                        <div className="grid grid-cols-[80px_180px_90px_150px_170px_180px_80px_70px_auto] gap-3 px-3 py-3 text-sm">
                          <div>{thumbnail(member)}</div>
                          <p className="font-semibold">{member.name}</p>
                          <p className="text-sm text-muted">{member.member_type}</p>
                          <p className="line-clamp-2 text-sm text-muted">
                            {member.role ?? "TBD"}
                          </p>
                          <p className="line-clamp-2 text-sm text-muted">
                            {member.degree_program ?? "TBD"}
                          </p>
                          <p className="truncate text-sm text-muted">
                            {member.email ?? "TBD"}
                          </p>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleToggleMemberVisibility(member)}
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {member.is_visible === false ? "Hidden" : "Visible"}
                          </button>
                          <p className="text-sm text-muted">
                            {member.display_order ?? 0}
                          </p>
                          <div className="flex h-fit flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setEditingId(isEditing ? null : member.id)
                              }
                              className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleDeleteMember(member)}
                              className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        {isEditing ? (
                          <div className="bg-[#f9fbfc] px-3 py-4">
                            {renderMemberForm(
                              draft,
                              (field, value) =>
                                updateMemberDraft(member.id, field, value),
                              (event) => {
                                event.preventDefault();
                                void handleUpdateMember(member.id);
                              },
                              editPhotoFiles[member.id] ?? null,
                              (file) =>
                                setEditPhotoFiles((current) => ({
                                  ...current,
                                  [member.id]: file,
                                })),
                              () => {
                                setMemberDrafts((current) => ({
                                  ...current,
                                  [member.id]: {
                                    ...draft,
                                    photoUrl: "",
                                  },
                                }));
                                setEditPhotoFiles((current) => ({
                                  ...current,
                                  [member.id]: null,
                                }));
                                setClearedPhotoIds((current) => ({
                                  ...current,
                                  [member.id]: true,
                                }));
                              },
                              "Save Member",
                              member.id,
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filteredMembers.length > pageSize ? (
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
