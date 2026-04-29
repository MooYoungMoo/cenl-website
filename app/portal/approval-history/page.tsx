"use client";

import { useCallback, useEffect, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type PurchaseRequest = {
  id: string;
  requester_id: string;
  item_name: string;
  vendor: string | null;
  item_url: string | null;
  purpose: string;
  project_name: string | null;
  estimated_cost: number | null;
  currency: string;
  status: string;
  professor_comment: string | null;
  requested_at: string | null;
  decided_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Profile = {
  role: string | null;
};

type ReviewAction = "approved" | "rejected";

const requestSelect =
  "id, requester_id, item_name, vendor, item_url, purpose, project_name, estimated_cost, currency, status, professor_comment, requested_at, decided_at, created_at, updated_at";

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatCost(cost: number | null, currency: string) {
  if (cost === null) {
    return "Not specified";
  }

  return `${cost.toLocaleString()} ${currency}`;
}

function canReview(role: string | null) {
  return role === "professor" || role === "admin";
}

export default function ApprovalHistoryPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(
    null,
  );

  const userCanReview = canReview(role);

  const loadRole = useCallback(async () => {
    setRoleLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setErrorMessage("Please sign in again before reviewing requests.");
      setRoleLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setRole(null);
      setErrorMessage(error.message);
    } else {
      setRole(((data as Profile | null)?.role ?? null)?.toLowerCase() ?? null);
    }

    setRoleLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("purchase_requests")
      .select(requestSelect)
      .order("requested_at", { ascending: false });

    if (error) {
      setRequests([]);
      setErrorMessage(error.message);
    } else {
      const nextRequests = (data ?? []) as PurchaseRequest[];
      setRequests(nextRequests);
      setComments((current) => {
        const nextComments: Record<string, string> = {};

        nextRequests.forEach((request) => {
          nextComments[request.id] =
            current[request.id] ?? request.professor_comment ?? "";
        });

        return nextComments;
      });
    }

    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRole();
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadRequests, loadRole]);

  const updateComment = (requestId: string, value: string) => {
    setComments((current) => ({
      ...current,
      [requestId]: value,
    }));
  };

  const handleReview = async (requestId: string, status: ReviewAction) => {
    setErrorMessage("");
    setSuccessMessage("");
    setUpdatingRequestId(requestId);

    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status,
        professor_comment: comments[requestId]?.trim() || null,
        decided_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingRequestId(null);
      return;
    }

    setSuccessMessage(
      status === "approved"
        ? "Purchase request approved successfully."
        : "Purchase request rejected successfully.",
    );
    setUpdatingRequestId(null);
    await loadRequests();
  };

  const loading = roleLoading || requestsLoading;

  return (
    <PortalShell
      title="Approval History"
      description="Review purchase requests and record professor or admin decisions."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Approval Workflow
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Review purchase requests
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Requests are loaded from Supabase and access is controlled by the
        existing profile role and purchase request RLS policies.
      </p>

      {!roleLoading && !userCanReview ? (
        <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to approve requests.
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

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Request Queue
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Purchase request records
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadRequests()}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="portal-card mt-6 rounded-md border border-line p-5 text-sm text-muted">
            Loading requests...
          </div>
        ) : null}

        {!loading && requests.length === 0 && !errorMessage ? (
          <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
            No purchase requests yet.
          </div>
        ) : null}

        {!loading && requests.length > 0 ? (
          <div className="mt-6 grid gap-5">
            {requests.map((request) => {
              const isUpdating = updatingRequestId === request.id;

              return (
                <article
                  key={request.id}
                  className="elevated-card portal-card border border-line p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        {request.status}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold">
                        {request.item_name}
                      </h4>
                    </div>
                    <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-muted shadow-sm">
                      {formatDate(request.requested_at)}
                    </p>
                  </div>

                  <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                    <div>
                      <dt className="font-semibold text-foreground">Vendor</dt>
                      <dd className="mt-1 text-muted">
                        {request.vendor || "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">Project</dt>
                      <dd className="mt-1 text-muted">
                        {request.project_name || "Not specified"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-foreground">
                        Estimated cost
                      </dt>
                      <dd className="mt-1 text-muted">
                        {formatCost(request.estimated_cost, request.currency)}
                      </dd>
                    </div>
                  </dl>

                  {request.item_url ? (
                    <a
                      href={request.item_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex text-sm font-semibold text-brand transition hover:text-foreground"
                    >
                      View item URL
                    </a>
                  ) : null}

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-md border border-line/70 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Purpose
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {request.purpose}
                      </p>
                    </div>

                    <div className="rounded-md border border-line/70 bg-white/70 p-4">
                      <p className="text-sm font-semibold text-foreground">
                        Professor Comment
                      </p>
                      <p className="mt-2 text-sm leading-7 text-muted">
                        {request.professor_comment || "No comment yet."}
                      </p>
                    </div>
                  </div>

                  {userCanReview ? (
                    <div className="mt-5 rounded-md border border-line/70 bg-white/80 p-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          Review comment
                        </span>
                        <textarea
                          value={comments[request.id] ?? ""}
                          onChange={(event) =>
                            updateComment(request.id, event.target.value)
                          }
                          className="min-h-24 rounded-md border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm"
                          placeholder="Add a professor/admin comment for this decision."
                        />
                      </label>
                      <div className="mt-4 flex flex-wrap justify-end gap-3">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleReview(request.id, "rejected")}
                          className="action-button rounded-md border border-accent/30 bg-white px-5 py-3 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:opacity-60 hover:bg-accent-soft"
                        >
                          {isUpdating ? "Saving..." : "Reject"}
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleReview(request.id, "approved")}
                          className="action-button action-button-primary rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isUpdating ? "Saving..." : "Approve"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </PortalShell>
  );
}
