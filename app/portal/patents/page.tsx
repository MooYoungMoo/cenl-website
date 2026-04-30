"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { PortalShell } from "@/components/portal-shell";
import { patentSelect, type SupabasePatent } from "@/lib/patents";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type PatentForm = {
  title: string;
  inventors: string;
  patentNumber: string;
  applicationNumber: string;
  country: string;
  status: string;
  filingDate: string;
  publicationDate: string;
  registrationDate: string;
  assignee: string;
  description: string;
  displayOrder: string;
  isVisible: boolean;
};

const emptyPatentForm: PatentForm = {
  title: "",
  inventors: "",
  patentNumber: "",
  applicationNumber: "",
  country: "",
  status: "Pending",
  filingDate: "",
  publicationDate: "",
  registrationDate: "",
  assignee: "",
  description: "",
  displayOrder: "0",
  isVisible: true,
};

const statusOptions = ["Filed", "Published", "Registered", "Granted", "Pending"];
const pageSize = 20;

function canManage(role: string | null) {
  return role === "professor" || role === "admin";
}

function toPatentForm(patent: SupabasePatent): PatentForm {
  return {
    title: patent.title ?? "",
    inventors: patent.inventors ?? "",
    patentNumber: patent.patent_number ?? "",
    applicationNumber: patent.application_number ?? "",
    country: patent.country ?? "",
    status: patent.status ?? "Pending",
    filingDate: patent.filing_date?.slice(0, 10) ?? "",
    publicationDate: patent.publication_date?.slice(0, 10) ?? "",
    registrationDate: patent.registration_date?.slice(0, 10) ?? "",
    assignee: patent.assignee ?? "",
    description: patent.description ?? "",
    displayOrder: String(patent.display_order ?? 0),
    isVisible: patent.is_visible !== false,
  };
}

function getPatentPayload(form: PatentForm) {
  return {
    title: form.title.trim(),
    inventors: form.inventors.trim(),
    patent_number: form.patentNumber.trim() || null,
    application_number: form.applicationNumber.trim() || null,
    country: form.country.trim() || null,
    status: form.status.trim() || "Pending",
    filing_date: form.filingDate || null,
    publication_date: form.publicationDate || null,
    registration_date: form.registrationDate || null,
    assignee: form.assignee.trim() || null,
    description: form.description.trim() || null,
    display_order: form.displayOrder.trim() ? Number(form.displayOrder) : 0,
    is_visible: form.isVisible,
  };
}

function validatePatentForm(form: PatentForm) {
  const payload = getPatentPayload(form);

  if (!payload.title || !payload.inventors) {
    return "Title and inventors are required.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

function isMatchingSearch(patent: SupabasePatent, search: string) {
  if (!search) {
    return true;
  }

  return [
    patent.title,
    patent.inventors,
    patent.patent_number,
    patent.application_number,
    patent.assignee,
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function PortalPatentsPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userIsProjectAdmin, setUserIsProjectAdmin] = useState(false);
  const [patents, setPatents] = useState<SupabasePatent[]>([]);
  const [patentForm, setPatentForm] = useState<PatentForm>(emptyPatentForm);
  const [patentDrafts, setPatentDrafts] = useState<Record<string, PatentForm>>(
    {},
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManagePatents = canManage(role) || userIsProjectAdmin;

  const loadPatents = useCallback(async () => {
    const { data, error } = await supabase
      .from("patents")
      .select(patentSelect)
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setPatents([]);
      setPatentDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextPatents = (data ?? []) as SupabasePatent[];
    setPatents(nextPatents);
    setPatentDrafts(
      nextPatents.reduce<Record<string, PatentForm>>((accumulator, patent) => {
        accumulator[patent.id] = toPatentForm(patent);
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
      setErrorMessage("Please sign in again before managing patents.");
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
      await loadPatents();
    }

    setLoading(false);
  }, [loadPatents]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccess();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAccess]);

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(patents.map((patent) => patent.status || "Pending")),
      ).sort(),
    [patents],
  );

  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          patents
            .map((patent) => patent.country)
            .filter((country): country is string => Boolean(country)),
        ),
      ).sort(),
    [patents],
  );

  const filteredPatents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return patents
      .filter((patent) => isMatchingSearch(patent, normalizedSearch))
      .filter((patent) =>
        statusFilter === "all"
          ? true
          : (patent.status || "Pending") === statusFilter,
      )
      .filter((patent) =>
        countryFilter === "all" ? true : patent.country === countryFilter,
      )
      .filter((patent) => {
        if (visibilityFilter === "visible") {
          return patent.is_visible !== false;
        }

        if (visibilityFilter === "hidden") {
          return patent.is_visible === false;
        }

        return true;
      });
  }, [countryFilter, patents, searchQuery, statusFilter, visibilityFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPatents.length / pageSize));
  const visiblePatents = filteredPatents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const updatePatentForm = (
    field: keyof PatentForm,
    value: string | boolean,
  ) => {
    setPatentForm((current) => ({ ...current, [field]: value }));
  };

  const updatePatentDraft = (
    patentId: string,
    field: keyof PatentForm,
    value: string | boolean,
  ) => {
    setPatentDrafts((current) => ({
      ...current,
      [patentId]: {
        ...current[patentId],
        [field]: value,
      },
    }));
  };

  const handleAddPatent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePatents) {
      setErrorMessage("You do not have permission to manage patents.");
      return;
    }

    const validationMessage = validatePatentForm(patentForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("patents").insert({
      ...getPatentPayload(patentForm),
      created_by: currentUserId,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Patent added.");
    setPatentForm(emptyPatentForm);
    setShowAddForm(false);
    setSaving(false);
    await loadPatents();
  };

  const handleUpdatePatent = async (patentId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePatents) {
      setErrorMessage("You do not have permission to manage patents.");
      return;
    }

    const draft = patentDrafts[patentId];

    if (!draft) {
      return;
    }

    const validationMessage = validatePatentForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("patents")
      .update(getPatentPayload(draft))
      .eq("id", patentId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Patent updated.");
    setEditingId(null);
    setSaving(false);
    await loadPatents();
  };

  const handleToggleVisibility = async (patent: SupabasePatent) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("patents")
      .update({ is_visible: patent.is_visible === false })
      .eq("id", patent.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Patent visibility updated.");
    setSaving(false);
    await loadPatents();
  };

  const handleDeletePatent = async (patent: SupabasePatent) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${patent.title}"? This patent record will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("patents")
      .delete()
      .eq("id", patent.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Patent deleted.");
    setSaving(false);
    await loadPatents();
  };

  const renderPatentForm = (
    form: PatentForm,
    onChange: (field: keyof PatentForm, value: string | boolean) => void,
    onSubmit: (event: FormEvent<HTMLFormElement>) => void,
    submitLabel: string,
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
        value={form.inventors}
        onChange={(event) => onChange("inventors", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-2"
        placeholder="Inventors"
        required
      />
      <input
        value={form.patentNumber}
        onChange={(event) => onChange("patentNumber", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Patent number"
      />
      <input
        value={form.applicationNumber}
        onChange={(event) => onChange("applicationNumber", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Application number"
      />
      <input
        value={form.country}
        onChange={(event) => onChange("country", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Country"
      />
      <select
        value={form.status}
        onChange={(event) => onChange("status", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      >
        {statusOptions.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={form.filingDate}
        onChange={(event) => onChange("filingDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      />
      <input
        type="date"
        value={form.publicationDate}
        onChange={(event) => onChange("publicationDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      />
      <input
        type="date"
        value={form.registrationDate}
        onChange={(event) => onChange("registrationDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      />
      <input
        value={form.assignee}
        onChange={(event) => onChange("assignee", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Assignee"
      />
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <label className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(event) => onChange("isVisible", event.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Visible
      </label>
      <textarea
        value={form.description}
        onChange={(event) => onChange("description", event.target.value)}
        className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Description"
      />
      <div className="flex justify-end md:col-span-2 lg:col-span-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <PortalShell
      title="Patents"
      description="Manage patent and invention disclosure records for the public website."
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Patents
          </p>
          <h2 className="mt-4 text-3xl font-semibold">Patent management</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Maintain Supabase-backed patent records used by the public Patents
            page. Static patent data remains as a public fallback.
          </p>
        </div>
        {!loading && userCanManagePatents ? (
          <button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add Patent
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading patent tools...
        </div>
      ) : null}

      {!loading && !userCanManagePatents ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage patents.
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

      {!loading && userCanManagePatents ? (
        <div className="mt-8 grid gap-6">
          {showAddForm ? (
            <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">Add patent</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs font-semibold text-muted transition hover:text-foreground"
                >
                  Close
                </button>
              </div>
              {renderPatentForm(
                patentForm,
                updatePatentForm,
                handleAddPatent,
                "Add Patent",
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
                  placeholder="Search title, inventors, numbers, or assignee"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={countryFilter}
                onChange={(event) => {
                  setCountryFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
              >
                <option value="all">All countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
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
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>
                Showing {visiblePatents.length} of {filteredPatents.length}{" "}
                filtered patents
              </span>
              <button
                type="button"
                onClick={() => void loadPatents()}
                className="font-semibold text-brand transition hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            {filteredPatents.length === 0 ? (
              <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No patents match the current filters.
              </div>
            ) : null}

            {filteredPatents.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
                <div className="min-w-[1120px] divide-y divide-line">
                  <div className="grid grid-cols-[72px_minmax(260px,1.4fr)_minmax(180px,1fr)_90px_110px_minmax(150px,0.8fr)_84px_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Order</span>
                    <span>Title</span>
                    <span>Inventors</span>
                    <span>Country</span>
                    <span>Status</span>
                    <span>Patent / App No.</span>
                    <span>Visible</span>
                    <span className="text-right">Actions</span>
                  </div>
                  {visiblePatents.map((patent) => {
                    const draft =
                      patentDrafts[patent.id] ?? toPatentForm(patent);
                    const isEditing = editingId === patent.id;

                    return (
                      <div key={patent.id} className="divide-y divide-line">
                        <div className="grid grid-cols-[72px_minmax(260px,1.4fr)_minmax(180px,1fr)_90px_110px_minmax(150px,0.8fr)_84px_auto] gap-3 px-3 py-3 text-sm">
                          <p className="font-semibold">
                            {patent.display_order ?? 0}
                          </p>
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-semibold leading-6">
                              {patent.title}
                            </p>
                            {patent.assignee ? (
                              <p className="mt-1 line-clamp-1 text-xs text-muted">
                                {patent.assignee}
                              </p>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 text-sm text-muted">
                            {patent.inventors}
                          </p>
                          <p className="text-sm text-muted">
                            {patent.country || "TBD"}
                          </p>
                          <p className="text-sm font-semibold text-muted">
                            {patent.status || "Pending"}
                          </p>
                          <p className="line-clamp-2 text-xs text-muted">
                            {patent.patent_number ||
                              patent.application_number ||
                              "TBD"}
                          </p>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleToggleVisibility(patent)}
                            className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                          >
                            {patent.is_visible === false ? "Hidden" : "Visible"}
                          </button>
                          <div className="flex h-fit flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                setEditingId(isEditing ? null : patent.id)
                              }
                              className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleDeletePatent(patent)}
                              className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="px-3 pb-3 text-xs text-muted">
                          Filing: {formatDate(patent.filing_date)} / Public:{" "}
                          {formatDate(patent.publication_date)} / Registration:{" "}
                          {formatDate(patent.registration_date)}
                        </div>
                        {isEditing ? (
                          <div className="bg-[#f9fbfc] px-3 py-4">
                            {renderPatentForm(
                              draft,
                              (field, value) =>
                                updatePatentDraft(patent.id, field, value),
                              (event) => {
                                event.preventDefault();
                                void handleUpdatePatent(patent.id);
                              },
                              "Save Patent",
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {filteredPatents.length > pageSize ? (
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
