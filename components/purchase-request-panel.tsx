"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
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

type PurchaseRequestForm = {
  itemName: string;
  vendor: string;
  itemUrl: string;
  purpose: string;
  projectName: string;
  estimatedCost: string;
  currency: string;
};

const initialForm: PurchaseRequestForm = {
  itemName: "",
  vendor: "",
  itemUrl: "",
  purpose: "",
  projectName: "",
  estimatedCost: "",
  currency: "KRW",
};

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

function FieldLabel({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm font-semibold text-foreground">
      {children}
      {required ? <span className="text-accent"> *</span> : null}
    </span>
  );
}

export function PurchaseRequestPanel() {
  const [form, setForm] = useState<PurchaseRequestForm>(initialForm);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError("");

    const { data, error } = await supabase
      .from("purchase_requests")
      .select(requestSelect)
      .order("requested_at", { ascending: false });

    if (error) {
      setRequests([]);
      setRequestsError(error.message);
    } else {
      setRequests((data ?? []) as PurchaseRequest[]);
    }

    setRequestsLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadRequests]);

  const updateForm = (field: keyof PurchaseRequestForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const itemName = form.itemName.trim();
    const purpose = form.purpose.trim();

    if (!itemName || !purpose) {
      setSubmitError("Please enter both the item name and purpose.");
      return;
    }

    const estimatedCost = form.estimatedCost.trim()
      ? Number(form.estimatedCost)
      : null;

    if (estimatedCost !== null && !Number.isFinite(estimatedCost)) {
      setSubmitError("Estimated cost must be a valid number.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError("Please sign in again before submitting a request.");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("purchase_requests").insert({
      requester_id: user.id,
      item_name: itemName,
      vendor: form.vendor.trim() || null,
      item_url: form.itemUrl.trim() || null,
      purpose,
      project_name: form.projectName.trim() || null,
      estimated_cost: estimatedCost,
      currency: form.currency.trim() || "KRW",
      status: "submitted",
      requested_at: new Date().toISOString(),
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setForm(initialForm);
    setSuccessMessage("Purchase request submitted successfully.");
    setSubmitting(false);
    await loadRequests();
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Purchase Workflow
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Submit a lab purchase request
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Submit equipment, material, software, or travel requests for review.
        Access is controlled by Supabase Auth and table-level RLS policies.
      </p>

      <form
        onSubmit={handleSubmit}
        className="portal-card mt-8 rounded-lg border border-line p-6 shadow-panel"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <FieldLabel required>Item name</FieldLabel>
            <input
              required
              value={form.itemName}
              onChange={(event) => updateForm("itemName", event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="e.g., Gas sensor substrate"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Vendor</FieldLabel>
            <input
              value={form.vendor}
              onChange={(event) => updateForm("vendor", event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="Vendor or supplier"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Item URL</FieldLabel>
            <input
              type="url"
              value={form.itemUrl}
              onChange={(event) => updateForm("itemUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="https://"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Project name</FieldLabel>
            <input
              value={form.projectName}
              onChange={(event) =>
                updateForm("projectName", event.target.value)
              }
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="Grant, project, or lab account"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Estimated cost</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estimatedCost}
              onChange={(event) =>
                updateForm("estimatedCost", event.target.value)
              }
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Currency</FieldLabel>
            <input
              value={form.currency}
              onChange={(event) => updateForm("currency", event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="KRW"
            />
          </label>
        </div>

        <label className="mt-5 grid gap-2">
          <FieldLabel required>Purpose</FieldLabel>
          <textarea
            required
            value={form.purpose}
            onChange={(event) => updateForm("purpose", event.target.value)}
            className="min-h-32 rounded-md border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm"
            placeholder="Briefly explain why this item is needed for lab work."
          />
        </label>

        {submitError ? (
          <div className="mt-5 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
            {submitError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            {successMessage}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="action-button action-button-primary rounded-md bg-brand px-6 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Request History
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Existing purchase requests
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

        {requestsLoading ? (
          <div className="portal-card mt-6 rounded-md border border-line p-5 text-sm text-muted">
            Loading requests...
          </div>
        ) : null}

        {!requestsLoading && requestsError ? (
          <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
            {requestsError}
          </div>
        ) : null}

        {!requestsLoading && !requestsError && requests.length === 0 ? (
          <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
            No purchase requests yet.
          </div>
        ) : null}

        {!requestsLoading && !requestsError && requests.length > 0 ? (
          <div className="mt-6 grid gap-4">
            {requests.map((request) => (
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

                <div className="mt-5 rounded-md border border-line/70 bg-white/70 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    Purpose
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    {request.purpose}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
