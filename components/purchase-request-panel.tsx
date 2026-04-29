"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type PurchaseStatus = "pending_payment" | "paid" | "canceled";

type Merchant = {
  id: string;
  name: string;
  normalized_name: string;
  website: string | null;
  note: string | null;
  is_active: boolean | null;
  needs_review: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PurchaseRequest = {
  id: string;
  requester_id: string;
  merchant: string | null;
  merchant_id: string | null;
  item_name: string;
  cost_category: CostCategory | null;
  item_url: string | null;
  purpose: string;
  estimated_cost: number | null;
  currency: string;
  status: PurchaseStatus | string;
  payment_note: string | null;
  funding_source_id: string | null;
  requested_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PurchaseRequestForm = {
  itemName: string;
  costCategory: CostCategory;
  estimatedCost: string;
  currency: string;
  purpose: string;
  paymentNote: string;
  itemUrl: string;
};

const initialForm: PurchaseRequestForm = {
  itemName: "",
  costCategory: "materials",
  estimatedCost: "",
  currency: "KRW",
  purpose: "",
  paymentNote: "",
  itemUrl: "",
};

const merchantSelect =
  "id, name, normalized_name, website, note, is_active, needs_review, created_by, created_at, updated_at";

const requestSelect =
  "id, requester_id, merchant, merchant_id, item_name, cost_category, item_url, purpose, estimated_cost, currency, status, payment_note, funding_source_id, requested_at, paid_at, created_at, updated_at";

function normalizeMerchantName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

function formatStatus(status: string) {
  return status.replaceAll("_", " ");
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
  const [merchantSearch, setMerchantSearch] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(
    null,
  );
  const [merchantDropdownOpen, setMerchantDropdownOpen] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, Merchant>>({});
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addingMerchant, setAddingMerchant] = useState(false);

  const loadMerchants = useCallback(async () => {
    setMerchantsLoading(true);

    const { data, error } = await supabase
      .from("merchants")
      .select(merchantSelect)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      setSubmitError(error.message);
      setMerchants([]);
    } else {
      const nextMerchants = (data ?? []) as Merchant[];
      setMerchants(nextMerchants);
      setMerchantMap((current) => {
        const nextMap = { ...current };
        nextMerchants.forEach((merchant) => {
          nextMap[merchant.id] = merchant;
        });
        return nextMap;
      });
    }

    setMerchantsLoading(false);
  }, []);

  const loadRequestMerchants = useCallback(async (requestRows: PurchaseRequest[]) => {
    const merchantIds = Array.from(
      new Set(
        requestRows
          .map((request) => request.merchant_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (merchantIds.length === 0) {
      return;
    }

    const { data } = await supabase
      .from("merchants")
      .select(merchantSelect)
      .in("id", merchantIds);

    const nextMerchants = (data ?? []) as Merchant[];

    setMerchantMap((current) => {
      const nextMap = { ...current };
      nextMerchants.forEach((merchant) => {
        nextMap[merchant.id] = merchant;
      });
      return nextMap;
    });
  }, []);

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
      const nextRequests = (data ?? []) as PurchaseRequest[];
      setRequests(nextRequests);
      await loadRequestMerchants(nextRequests);
    }

    setRequestsLoading(false);
  }, [loadRequestMerchants]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMerchants();
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadMerchants, loadRequests]);

  const filteredMerchants = useMemo(() => {
    const search = merchantSearch.trim().toLowerCase();
    const normalizedSearch = normalizeMerchantName(merchantSearch);

    if (!search) {
      return merchants.slice(0, 6);
    }

    return merchants
      .filter(
        (merchant) =>
          merchant.name.toLowerCase().includes(search) ||
          merchant.normalized_name.includes(normalizedSearch),
      )
      .slice(0, 8);
  }, [merchantSearch, merchants]);

  const searchedNormalizedName = normalizeMerchantName(merchantSearch);
  const exactMerchantExists = merchants.some(
    (merchant) => merchant.normalized_name === searchedNormalizedName,
  );
  const canAddMerchant =
    merchantSearch.trim().length > 0 &&
    searchedNormalizedName.length > 0 &&
    !exactMerchantExists;

  const updateForm = <Field extends keyof PurchaseRequestForm>(
    field: Field,
    value: PurchaseRequestForm[Field],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectMerchant = (merchant: Merchant, message?: string) => {
    setSelectedMerchant(merchant);
    setMerchantSearch(merchant.name);
    setMerchantDropdownOpen(false);
    setSuccessMessage(message ?? "");
    setSubmitError("");
  };

  const handleMerchantSearchChange = (value: string) => {
    setMerchantSearch(value);
    setMerchantDropdownOpen(true);

    if (selectedMerchant && selectedMerchant.name !== value) {
      setSelectedMerchant(null);
    }
  };

  const clearSelectedMerchant = () => {
    setSelectedMerchant(null);
    setMerchantSearch("");
    setMerchantDropdownOpen(true);
  };

  const handleAddMerchant = async () => {
    const name = merchantSearch.trim();
    const normalizedName = normalizeMerchantName(name);

    if (!name || !normalizedName) {
      setSubmitError("Enter a merchant name before adding a new merchant.");
      return;
    }

    setAddingMerchant(true);
    setSubmitError("");
    setSuccessMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError("Please sign in again before adding a merchant.");
      setAddingMerchant(false);
      return;
    }

    const { data, error } = await supabase
      .from("merchants")
      .insert({
        name,
        normalized_name: normalizedName,
        is_active: true,
        needs_review: true,
        created_by: user.id,
      })
      .select(merchantSelect)
      .single();

    if (!error && data) {
      const newMerchant = data as Merchant;
      setMerchants((current) => [...current, newMerchant]);
      setMerchantMap((current) => ({
        ...current,
        [newMerchant.id]: newMerchant,
      }));
      selectMerchant(newMerchant, "New merchant added and selected.");
      setAddingMerchant(false);
      return;
    }

    await loadMerchants();

    const existingMerchant =
      merchants.find((merchant) => merchant.normalized_name === normalizedName) ??
      ((await supabase
        .from("merchants")
        .select(merchantSelect)
        .eq("normalized_name", normalizedName)
        .maybeSingle()).data as Merchant | null);

    if (existingMerchant) {
      setMerchantMap((current) => ({
        ...current,
        [existingMerchant.id]: existingMerchant,
      }));
      selectMerchant(existingMerchant, "Using existing merchant record.");
      setAddingMerchant(false);
      return;
    }

    setSubmitError(
      error?.message ?? "Could not add this merchant. Please try again.",
    );
    setAddingMerchant(false);
  };

  const getRequestMerchantName = (request: PurchaseRequest) => {
    if (request.merchant_id && merchantMap[request.merchant_id]) {
      return merchantMap[request.merchant_id].name;
    }

    return request.merchant || "Unknown merchant";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const itemName = form.itemName.trim();
    const purpose = form.purpose.trim();
    const estimatedCost = Number(form.estimatedCost);

    if (!selectedMerchant) {
      setSubmitError("Select or add a merchant before submitting.");
      return;
    }

    if (!itemName || !purpose || !form.estimatedCost.trim()) {
      setSubmitError("Please enter the item name, estimated cost, and purpose.");
      return;
    }

    if (!Number.isFinite(estimatedCost) || estimatedCost < 0) {
      setSubmitError("Estimated cost must be a valid positive number.");
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
      merchant_id: selectedMerchant.id,
      merchant: selectedMerchant.name,
      item_name: itemName,
      cost_category: form.costCategory,
      estimated_cost: estimatedCost,
      currency: form.currency.trim() || "KRW",
      purpose,
      payment_note: form.paymentNote.trim() || null,
      item_url: form.itemUrl.trim() || null,
      status: "pending_payment",
      requested_at: new Date().toISOString(),
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setForm(initialForm);
    setMerchantSearch("");
    setSelectedMerchant(null);
    setSuccessMessage("Purchase request submitted for payment tracking.");
    setSubmitting(false);
    await loadRequests();
  };

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Payment Request
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Submit a pending payment request
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Search for an existing merchant first. If it is not listed, add a new
        merchant record so future payment tracking stays consistent.
      </p>

      <form
        onSubmit={handleSubmit}
        className="portal-card mt-8 rounded-lg border border-line p-6 shadow-panel"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <FieldLabel required>Merchant</FieldLabel>
            <div className="relative">
              <input
                required
                value={merchantSearch}
                onFocus={() => setMerchantDropdownOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setMerchantDropdownOpen(false), 120);
                }}
                onChange={(event) =>
                  handleMerchantSearchChange(event.target.value)
                }
                className="w-full rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
                placeholder="Search existing merchants"
              />

              {merchantDropdownOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-md border border-line bg-white p-2 shadow-panel">
                  {merchantsLoading ? (
                    <p className="px-3 py-2 text-sm text-muted">
                      Loading merchants...
                    </p>
                  ) : null}

                  {!merchantsLoading && filteredMerchants.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted">
                      No matching merchants found.
                    </p>
                  ) : null}

                  {!merchantsLoading && filteredMerchants.length > 0 ? (
                    <div className="grid gap-1">
                      {filteredMerchants.map((merchant) => (
                        <button
                          key={merchant.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectMerchant(merchant)}
                          className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                            selectedMerchant?.id === merchant.id
                              ? "bg-brand-soft text-brand"
                              : "text-muted hover:bg-brand-soft hover:text-foreground"
                          }`}
                        >
                          <span>{merchant.name}</span>
                          {merchant.needs_review ? (
                            <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                              Needs review
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {canAddMerchant ? (
                    <button
                      type="button"
                      disabled={addingMerchant}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void handleAddMerchant()}
                      className="mt-2 w-full rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingMerchant
                        ? "Adding merchant..."
                        : `Add new merchant: ${merchantSearch.trim()}`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedMerchant ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">
                  {selectedMerchant.name}
                  {selectedMerchant.needs_review ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                      Needs review
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelectedMerchant}
                    className="ml-1 rounded-full px-1 text-brand transition hover:bg-white"
                    aria-label="Clear selected merchant"
                  >
                    x
                  </button>
                </span>
              </div>
            ) : null}

            <p className="text-xs leading-6 text-muted">
              New merchants are marked as Needs review until a professor/admin
              confirms the merchant name.
            </p>
            {!selectedMerchant ? (
              <p className="text-xs font-medium text-accent">
                Select an existing merchant or add a new one before submitting.
              </p>
            ) : null}
          </div>

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
            <FieldLabel required>Cost category</FieldLabel>
            <select
              required
              value={form.costCategory}
              onChange={(event) =>
                updateForm("costCategory", event.target.value as CostCategory)
              }
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
            >
              <option value="materials">Materials</option>
              <option value="activities">Activities</option>
            </select>
          </label>

          <label className="grid gap-2">
            <FieldLabel required>Estimated cost</FieldLabel>
            <input
              required
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

          <label className="grid gap-2 md:col-span-2">
            <FieldLabel>Item URL</FieldLabel>
            <input
              type="url"
              value={form.itemUrl}
              onChange={(event) => updateForm("itemUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              placeholder="https://"
            />
          </label>
        </div>

        <label className="mt-5 grid gap-2">
          <FieldLabel required>Purpose</FieldLabel>
          <textarea
            required
            value={form.purpose}
            onChange={(event) => updateForm("purpose", event.target.value)}
            className="min-h-28 rounded-md border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm"
            placeholder="Briefly explain why this item is needed for lab work."
          />
        </label>

        <label className="mt-5 grid gap-2">
          <FieldLabel>Comment / note</FieldLabel>
          <textarea
            value={form.paymentNote}
            onChange={(event) => updateForm("paymentNote", event.target.value)}
            className="min-h-24 rounded-md border border-line bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm"
            placeholder="Optional note for payment tracking."
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
              Your payment requests
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
                      {formatStatus(request.status)}
                    </p>
                    <h4 className="mt-2 text-xl font-semibold">
                      {request.item_name}
                    </h4>
                    <p className="mt-1 text-sm text-muted">
                      {getRequestMerchantName(request)}
                    </p>
                  </div>
                  <p className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-muted shadow-sm">
                    {formatDate(request.requested_at)}
                  </p>
                </div>

                <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3">
                  <div>
                    <dt className="font-semibold text-foreground">Category</dt>
                    <dd className="mt-1 capitalize text-muted">
                      {request.cost_category || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Amount</dt>
                    <dd className="mt-1 text-muted">
                      {formatCost(request.estimated_cost, request.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-foreground">Paid date</dt>
                    <dd className="mt-1 text-muted">
                      {formatDate(request.paid_at)}
                    </dd>
                  </div>
                </dl>

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
                      Comment / payment note
                    </p>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {request.payment_note || "No note provided."}
                    </p>
                  </div>
                </div>

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
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
