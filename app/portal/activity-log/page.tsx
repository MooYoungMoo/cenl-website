"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  id: string;
  role?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type ActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  metadata: unknown;
  created_at: string | null;
};

const pageSize = 50;

function canViewActivityLog(role: string | null, isProjectAdmin: boolean) {
  return role === "professor" || role === "admin" || isProjectAdmin;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

function stringifyMetadata(metadata: unknown) {
  if (metadata === null || metadata === undefined) {
    return "";
  }

  if (typeof metadata === "string") {
    return metadata;
  }

  try {
    return JSON.stringify(metadata);
  } catch {
    return String(metadata);
  }
}

function getActorLabel(profile: Profile | undefined, actorId: string | null) {
  if (!actorId) {
    return "System / unknown";
  }

  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    `User ${actorId.slice(0, 8)}`
  );
}

export default function ActivityLogPage() {
  const [role, setRole] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [actorProfiles, setActorProfiles] = useState<Record<string, Profile>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const userCanView = canViewActivityLog(role, isProjectAdmin);

  const loadActorProfiles = useCallback(async (activityLogs: ActivityLog[]) => {
    const actorIds = Array.from(
      new Set(
        activityLogs
          .map((log) => log.actor_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (actorIds.length === 0) {
      setActorProfiles({});
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name, name, email")
      .in("id", actorIds);

    const nextProfiles = ((data ?? []) as Profile[]).reduce<
      Record<string, Profile>
    >((accumulator, profile) => {
      accumulator[profile.id] = profile;
      return accumulator;
    }, {});

    setActorProfiles(nextProfiles);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("portal_activity_logs")
      .select(
        "id, actor_id, action, entity_type, entity_id, summary, metadata, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setLogs([]);
      setActorProfiles({});
      setErrorMessage(error.message);
      return;
    }

    const nextLogs = (data ?? []) as ActivityLog[];
    setLogs(nextLogs);
    await loadActorProfiles(nextLogs);
  }, [loadActorProfiles]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setIsProjectAdmin(false);
      setErrorMessage("Please sign in again before viewing activity logs.");
      setLoading(false);
      return;
    }

    const [profileResult, managersResult] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      supabase
        .from("funding_source_managers")
        .select("funding_source_id, user_id")
        .eq("user_id", user.id),
    ]);

    const nextRole = profileResult.error
      ? null
      : (((profileResult.data as Profile | null)?.role ?? null)?.toLowerCase() ??
        null);
    const nextIsProjectAdmin =
      ((managersResult.data ?? []) as FundingSourceManager[]).length > 0;

    setRole(nextRole);
    setIsProjectAdmin(nextIsProjectAdmin);

    if (!canViewActivityLog(nextRole, nextIsProjectAdmin)) {
      setLogs([]);
      setActorProfiles({});
      setLoading(false);
      return;
    }

    await loadLogs();
    setLoading(false);
  }, [loadLogs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitialData]);

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity_type))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) {
        return false;
      }

      if (entityFilter !== "all" && log.entity_type !== entityFilter) {
        return false;
      }

      if (log.created_at) {
        const createdAt = new Date(log.created_at);

        if (start && createdAt < start) {
          return false;
        }

        if (end && createdAt > end) {
          return false;
        }
      }

      if (!searchTerm) {
        return true;
      }

      const actor = getActorLabel(
        log.actor_id ? actorProfiles[log.actor_id] : undefined,
        log.actor_id,
      );
      const searchable = [
        actor,
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.summary ?? "",
        stringifyMetadata(log.metadata),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(searchTerm);
    });
  }, [
    actionFilter,
    actorProfiles,
    endDate,
    entityFilter,
    logs,
    search,
    startDate,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <PortalShell
      title="Activity Log"
      description="Review recent payment and admin changes in the Lab Portal."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Activity Log
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Portal audit trail</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
        Recent operational changes are recorded here for professor/admin review,
        including payment updates, merchant changes, Funding Source actions,
        project admin assignments, and user role changes.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading activity logs...
        </div>
      ) : null}

      {!loading && !userCanView ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to view global activity logs.
        </div>
      ) : null}

      {!loading && userCanView ? (
        <>
          {errorMessage ? (
            <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
              {errorMessage}
            </div>
          ) : null}

          <section className="portal-card mt-8 rounded-lg border border-line p-4 shadow-panel sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Search
                </span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                  placeholder="Search actor, action, summary, metadata"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Action
                </span>
                <select
                  value={actionFilter}
                  onChange={(event) => {
                    setActionFilter(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="all">All actions</option>
                  {actionOptions.map((action) => (
                    <option key={action} value={action}>
                      {formatLabel(action)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Entity
                </span>
                <select
                  value={entityFilter}
                  onChange={(event) => {
                    setEntityFilter(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="all">All entities</option>
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {formatLabel(entity)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Start
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  End
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                />
              </label>

              <button
                type="button"
                onClick={() => void loadLogs()}
                className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
              >
                Refresh
              </button>
            </div>

            <p className="mt-3 text-xs text-muted">
              Showing {visibleLogs.length} of {filteredLogs.length} filtered
              log entries. Recent log fetch is capped at 500 entries for now.
            </p>
          </section>

          {!errorMessage && logs.length === 0 ? (
            <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
              No activity logs yet.
            </div>
          ) : null}

          {!errorMessage && logs.length > 0 && visibleLogs.length === 0 ? (
            <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
              No activity logs match the current filters.
            </div>
          ) : null}

          {visibleLogs.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white/70">
              <div className="min-w-[980px] divide-y divide-line">
                <div className="grid grid-cols-[1fr_1.1fr_0.8fr_0.8fr_1.6fr_1.3fr] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  <span>Date/time</span>
                  <span>Actor</span>
                  <span>Action</span>
                  <span>Entity</span>
                  <span>Summary</span>
                  <span>Metadata</span>
                </div>
                {visibleLogs.map((log) => {
                  const metadataPreview = stringifyMetadata(log.metadata);
                  const actor = getActorLabel(
                    log.actor_id ? actorProfiles[log.actor_id] : undefined,
                    log.actor_id,
                  );

                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1fr_1.1fr_0.8fr_0.8fr_1.6fr_1.3fr] gap-3 px-3 py-2 text-xs"
                    >
                      <p className="text-muted">
                        {formatDateTime(log.created_at)}
                      </p>
                      <p className="truncate font-semibold text-foreground">
                        {actor}
                      </p>
                      <p className="capitalize text-brand">
                        {formatLabel(log.action)}
                      </p>
                      <div className="min-w-0">
                        <p className="capitalize text-muted">
                          {formatLabel(log.entity_type)}
                        </p>
                        {log.entity_id ? (
                          <p className="mt-0.5 truncate text-[0.68rem] text-muted">
                            {log.entity_id}
                          </p>
                        ) : null}
                      </div>
                      <p className="break-words leading-5 text-muted">
                        {log.summary ?? "No summary provided."}
                      </p>
                      <p className="line-clamp-3 break-words leading-5 text-muted">
                        {metadataPreview || "No metadata"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {filteredLogs.length > pageSize ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </PortalShell>
  );
}
