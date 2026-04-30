"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import {
  formatProjectPeriod,
  ongoingProjectSelect,
  type SupabaseOngoingProject,
} from "@/lib/ongoing-projects";
import { supabase } from "@/lib/supabase/client";

type PortalOngoingProjectsManagerProps = {
  currentUserId: string | null;
};

type OngoingProjectForm = {
  title: string;
  fundingAgency: string;
  projectUnit: string;
  projectNumber: string;
  startDate: string;
  endDate: string;
  description: string;
  displayOrder: string;
  isVisible: boolean;
};

const emptyProjectForm: OngoingProjectForm = {
  title: "",
  fundingAgency: "",
  projectUnit: "",
  projectNumber: "",
  startDate: "",
  endDate: "",
  description: "",
  displayOrder: "0",
  isVisible: true,
};

function toProjectForm(project: SupabaseOngoingProject): OngoingProjectForm {
  return {
    title: project.title ?? "",
    fundingAgency: project.funding_agency ?? "",
    projectUnit: project.project_unit ?? "",
    projectNumber: project.project_number ?? "",
    startDate: project.start_date?.slice(0, 10) ?? "",
    endDate: project.end_date?.slice(0, 10) ?? "",
    description: project.description ?? "",
    displayOrder: String(project.display_order ?? 0),
    isVisible: project.is_visible !== false,
  };
}

function parseDisplayOrder(value: string) {
  return value.trim() ? Number(value) : 0;
}

function getProjectPayload(form: OngoingProjectForm) {
  return {
    title: form.title.trim(),
    funding_agency: form.fundingAgency.trim() || null,
    project_unit: form.projectUnit.trim() || null,
    project_number: form.projectNumber.trim() || null,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    description: form.description.trim() || null,
    display_order: parseDisplayOrder(form.displayOrder),
    is_visible: form.isVisible,
  };
}

function validateProjectForm(form: OngoingProjectForm) {
  const payload = getProjectPayload(form);

  if (!payload.title) {
    return "Project title is required.";
  }

  if (!Number.isFinite(payload.display_order)) {
    return "Display order must be a number.";
  }

  return "";
}

export function PortalOngoingProjectsManager({
  currentUserId,
}: PortalOngoingProjectsManagerProps) {
  const [projects, setProjects] = useState<SupabaseOngoingProject[]>([]);
  const [projectForm, setProjectForm] =
    useState<OngoingProjectForm>(emptyProjectForm);
  const [projectDrafts, setProjectDrafts] = useState<
    Record<string, OngoingProjectForm>
  >({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("ongoing_projects")
      .select(ongoingProjectSelect)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setProjects([]);
      setProjectDrafts({});
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const nextProjects = (data ?? []) as SupabaseOngoingProject[];
    setProjects(nextProjects);
    setProjectDrafts(
      nextProjects.reduce<Record<string, OngoingProjectForm>>(
        (accumulator, project) => {
          accumulator[project.id] = toProjectForm(project);
          return accumulator;
        },
        {},
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProjects();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadProjects]);

  const updateProjectForm = (
    field: keyof OngoingProjectForm,
    value: string | boolean,
  ) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
  };

  const updateProjectDraft = (
    projectId: string,
    field: keyof OngoingProjectForm,
    value: string | boolean,
  ) => {
    setProjectDrafts((current) => ({
      ...current,
      [projectId]: {
        ...current[projectId],
        [field]: value,
      },
    }));
  };

  const handleAddProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const validationMessage = validateProjectForm(projectForm);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("ongoing_projects").insert({
      ...getProjectPayload(projectForm),
      created_by: currentUserId,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Ongoing project added.");
    setProjectForm(emptyProjectForm);
    setShowAddForm(false);
    setSaving(false);
    await loadProjects();
  };

  const handleUpdateProject = async (projectId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = projectDrafts[projectId];

    if (!draft) {
      return;
    }

    const validationMessage = validateProjectForm(draft);

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("ongoing_projects")
      .update(getProjectPayload(draft))
      .eq("id", projectId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Ongoing project updated.");
    setEditingId(null);
    setSaving(false);
    await loadProjects();
  };

  const handleToggleProjectVisibility = async (
    project: SupabaseOngoingProject,
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("ongoing_projects")
      .update({ is_visible: project.is_visible === false })
      .eq("id", project.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Ongoing project visibility updated.");
    setSaving(false);
    await loadProjects();
  };

  const handleDeleteProject = async (project: SupabaseOngoingProject) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.title}"? This ongoing project will be removed from the website.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("ongoing_projects")
      .delete()
      .eq("id", project.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Ongoing project deleted.");
    setSaving(false);
    await loadProjects();
  };

  const renderProjectForm = (
    form: OngoingProjectForm,
    onChange: (field: keyof OngoingProjectForm, value: string | boolean) => void,
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
        placeholder="Project title"
        required
      />
      <input
        value={form.fundingAgency}
        onChange={(event) => onChange("fundingAgency", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Funding agency"
      />
      <input
        type="number"
        value={form.displayOrder}
        onChange={(event) => onChange("displayOrder", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Display order"
      />
      <input
        value={form.projectUnit}
        onChange={(event) => onChange("projectUnit", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Project unit"
      />
      <input
        value={form.projectNumber}
        onChange={(event) => onChange("projectNumber", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
        placeholder="Project number"
      />
      <input
        type="date"
        value={form.startDate}
        onChange={(event) => onChange("startDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      />
      <input
        type="date"
        value={form.endDate}
        onChange={(event) => onChange("endDate", event.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
      />
      <textarea
        value={form.description}
        onChange={(event) => onChange("description", event.target.value)}
        className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand lg:col-span-4"
        placeholder="Description"
      />
      <label className="flex items-center gap-2 text-sm font-medium text-muted">
        <input
          type="checkbox"
          checked={form.isVisible}
          onChange={(event) => onChange("isVisible", event.target.checked)}
          className="h-4 w-4 rounded border-line"
        />
        Visible
      </label>
      <div className="flex items-center justify-end md:col-span-2 lg:col-span-3">
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
    <section className="portal-card rounded-lg border border-line p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Ongoing Projects
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Project management
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Add and maintain funded project records shown above Research
            Directions on the public Research page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
        >
          <Plus className="h-4 w-4" />
          Add Project
        </button>
      </div>

      {successMessage ? (
        <div className="mt-5 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {errorMessage}
        </div>
      ) : null}

      {showAddForm ? (
        <div className="mt-5">
          {renderProjectForm(
            projectForm,
            updateProjectForm,
            handleAddProject,
            "Add Project",
          )}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-md border border-line p-5 text-sm text-muted">
          Loading ongoing projects...
        </div>
      ) : null}

      {!loading && projects.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
          No ongoing projects have been created yet.
        </div>
      ) : null}

      {!loading && projects.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
          <div className="min-w-[980px] divide-y divide-line">
            <div className="grid grid-cols-[70px_190px_minmax(260px,1fr)_150px_150px_84px_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <span>Order</span>
              <span>Funding agency</span>
              <span>Project title</span>
              <span>Period</span>
              <span>Project No.</span>
              <span>Visible</span>
              <span className="text-right">Actions</span>
            </div>
            {projects.map((project) => {
              const draft = projectDrafts[project.id] ?? toProjectForm(project);
              const isEditing = editingId === project.id;

              return (
                <div key={project.id} className="divide-y divide-line">
                  <div className="grid grid-cols-[70px_190px_minmax(260px,1fr)_150px_150px_84px_auto] gap-3 px-3 py-3 text-sm">
                    <p className="text-muted">{project.display_order ?? 0}</p>
                    <p className="line-clamp-2 text-muted">
                      {project.funding_agency ?? "TBD"}
                    </p>
                    <p className="line-clamp-2 font-semibold leading-6">
                      {project.title}
                    </p>
                    <p className="text-muted">
                      {formatProjectPeriod(project.start_date, project.end_date)}
                    </p>
                    <p className="break-all text-muted">
                      {project.project_number ?? "TBD"}
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleToggleProjectVisibility(project)}
                      className="h-fit rounded-md border border-line px-2 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                    >
                      {project.is_visible === false ? "Hidden" : "Visible"}
                    </button>
                    <div className="flex h-fit flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditingId(isEditing ? null : project.id)}
                        className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                      >
                        {isEditing ? "Close" : "Edit"}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDeleteProject(project)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="bg-[#f9fbfc] px-3 py-4">
                      {renderProjectForm(
                        draft,
                        (field, value) =>
                          updateProjectDraft(project.id, field, value),
                        (event) => {
                          event.preventDefault();
                          void handleUpdateProject(project.id);
                        },
                        "Save Project",
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
  );
}
