"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type PurchaseStatus = "pending_payment" | "paid" | "canceled";

type Merchant = {
  id: string;
  name: string;
  normalized_name: string;
  needs_review: boolean | null;
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

type Profile = {
  id: string;
  role?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type FundingSource = {
  id: string;
  name: string;
  materials_budget?: number | null;
  activities_budget?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

type MerchantGroup = {
  key: string;
  merchantId: string | null;
  merchantName: string;
  needsReview: boolean;
  requests: PurchaseRequest[];
};

const requestSelect =
  "id, requester_id, merchant, merchant_id, item_name, cost_category, item_url, purpose, estimated_cost, currency, status, payment_note, funding_source_id, requested_at, paid_at, created_at, updated_at";

const merchantSelect = "id, name, normalized_name, needs_review";

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

function canManagePayments(role: string | null) {
  return role === "professor" || role === "admin";
}

function getRequesterLabel(profile: Profile | undefined, requesterId: string) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    `Requester ${requesterId.slice(0, 8)}`
  );
}

function getRequestMerchantName(
  request: PurchaseRequest,
  merchantMap: Record<string, Merchant>,
) {
  if (request.merchant_id && merchantMap[request.merchant_id]) {
    return merchantMap[request.merchant_id].name;
  }

  return request.merchant || "Unknown merchant";
}

function getGroupTotal(requests: PurchaseRequest[]) {
  const totals = requests.reduce<Record<string, number>>((accumulator, request) => {
    const currency = request.currency || "KRW";
    accumulator[currency] =
      (accumulator[currency] ?? 0) + (request.estimated_cost ?? 0);
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([currency, total]) => `${total.toLocaleString()} ${currency}`)
    .join(" / ");
}

function getPaidGroupTotal(requests: PurchaseRequest[]) {
  return getGroupTotal(requests.filter((request) => request.status === "paid"));
}

function groupRequestsByMerchant(
  requests: PurchaseRequest[],
  merchantMap: Record<string, Merchant>,
) {
  const grouped = requests.reduce<Record<string, MerchantGroup>>(
    (accumulator, request) => {
      const merchantRecord = request.merchant_id
        ? merchantMap[request.merchant_id]
        : undefined;
      const merchantName = getRequestMerchantName(request, merchantMap);
      const fallbackKey = normalizeMerchantName(merchantName) || "unknown";
      const key = request.merchant_id
        ? `merchant:${request.merchant_id}`
        : `text:${fallbackKey}`;

      accumulator[key] ??= {
        key,
        merchantId: request.merchant_id,
        merchantName,
        needsReview: Boolean(merchantRecord?.needs_review),
        requests: [],
      };
      accumulator[key].requests.push(request);
      return accumulator;
    },
    {},
  );

  return Object.values(grouped);
}

export default function PaymentTrackerPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<
    Record<string, Profile>
  >({});
  const [merchantMap, setMerchantMap] = useState<Record<string, Merchant>>({});
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedFundingSourceId, setSelectedFundingSourceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoingRequestId, setUndoingRequestId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const userCanManagePayments = canManagePayments(role);

  const fundingSourceMap = useMemo(
    () =>
      fundingSources.reduce<Record<string, FundingSource>>(
        (accumulator, source) => {
          accumulator[source.id] = source;
          return accumulator;
        },
        {},
      ),
    [fundingSources],
  );

  const loadFundingSources = useCallback(async () => {
    setFundingLoading(true);

    const { data, error } = await supabase
      .from("funding_sources")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setFundingSources([]);
      setErrorMessage(error.message);
    } else {
      const activeSources = ((data ?? []) as FundingSource[]).filter(
        (source) => source.is_active !== false && source.active !== false,
      );
      setFundingSources(activeSources);
    }

    setFundingLoading(false);
  }, []);

  const loadRelatedRecords = useCallback(async (requestRows: PurchaseRequest[]) => {
    const requesterIds = Array.from(
      new Set(requestRows.map((request) => request.requester_id)),
    );
    const merchantIds = Array.from(
      new Set(
        requestRows
          .map((request) => request.merchant_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (requesterIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", requesterIds);

      const nextProfiles = ((profiles ?? []) as Profile[]).reduce<
        Record<string, Profile>
      >((accumulator, profile) => {
        accumulator[profile.id] = profile;
        return accumulator;
      }, {});

      setRequesterProfiles(nextProfiles);
    } else {
      setRequesterProfiles({});
    }

    if (merchantIds.length > 0) {
      const { data: merchants } = await supabase
        .from("merchants")
        .select(merchantSelect)
        .in("id", merchantIds);

      const nextMerchants = ((merchants ?? []) as Merchant[]).reduce<
        Record<string, Merchant>
      >((accumulator, merchant) => {
        accumulator[merchant.id] = merchant;
        return accumulator;
      }, {});

      setMerchantMap(nextMerchants);
    } else {
      setMerchantMap({});
    }
  }, []);

  const loadRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("purchase_requests")
      .select(requestSelect)
      .order("requested_at", { ascending: false });

    if (error) {
      setRequests([]);
      setRequesterProfiles({});
      setMerchantMap({});
      setErrorMessage(error.message);
      return;
    }

    const nextRequests = (data ?? []) as PurchaseRequest[];
    setRequests(nextRequests);
    await loadRelatedRecords(nextRequests);
  }, [loadRelatedRecords]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setErrorMessage("Please sign in again before viewing payment requests.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const nextRole = profileError
      ? null
      : (((profile as Profile | null)?.role ?? null)?.toLowerCase() ?? null);

    if (profileError) {
      setErrorMessage(profileError.message);
    }

    setRole(nextRole);
    await loadRequests();

    if (canManagePayments(nextRole)) {
      await loadFundingSources();
    }

    setLoading(false);
  }, [loadFundingSources, loadRequests]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitialData]);

  const pendingGroups = useMemo(
    () =>
      groupRequestsByMerchant(
        requests.filter((request) => request.status === "pending_payment"),
        merchantMap,
      ),
    [merchantMap, requests],
  );

  const paidGroups = useMemo(
    () =>
      groupRequestsByMerchant(
        requests.filter((request) => request.status === "paid"),
        merchantMap,
      ),
    [merchantMap, requests],
  );

  const toggleRequest = (requestId: string) => {
    setSelectedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId],
    );
  };

  const toggleMerchantGroup = (group: MerchantGroup) => {
    const groupIds = group.requests.map((request) => request.id);
    const allSelected = groupIds.every((id) => selectedRequestIds.includes(id));

    setSelectedRequestIds((current) =>
      allSelected
        ? current.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current, ...groupIds])),
    );
  };

  const handleMarkAsPaid = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePayments) {
      setErrorMessage("You do not have permission to mark requests as paid.");
      return;
    }

    if (selectedRequestIds.length === 0) {
      setErrorMessage("Select at least one Pending Payment item to mark as Paid.");
      return;
    }

    if (!selectedFundingSourceId) {
      setErrorMessage("Select a Funding Source before marking requests as Paid.");
      return;
    }

    setSaving(true);

    const updatePayload: {
      status: "paid";
      funding_source_id: string;
      paid_at: string;
      payment_note?: string;
    } = {
      status: "paid",
      funding_source_id: selectedFundingSourceId,
      paid_at: new Date().toISOString(),
    };

    const trimmedNote = paymentNote.trim();

    if (trimmedNote) {
      updatePayload.payment_note = trimmedNote;
    }

    const { error } = await supabase
      .from("purchase_requests")
      .update(updatePayload)
      .in("id", selectedRequestIds);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Selected Pending Payment items were marked as Paid.");
    setSelectedRequestIds([]);
    setPaymentNote("");
    setSaving(false);
    await loadRequests();
  };

  const handleUndoPayment = async (request: PurchaseRequest) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userCanManagePayments) {
      setErrorMessage("You do not have permission to undo payments.");
      return;
    }

    const confirmed = window.confirm(
      `Undo payment for "${request.item_name}"? This will move it back to pending payment.`,
    );

    if (!confirmed) {
      return;
    }

    setUndoingRequestId(request.id);

    const { error } = await supabase
      .from("purchase_requests")
      .update({
        status: "pending_payment",
        funding_source_id: null,
        paid_at: null,
      })
      .eq("id", request.id);

    if (error) {
      setErrorMessage(error.message);
      setUndoingRequestId(null);
      return;
    }

    setSuccessMessage("Payment was undone and moved back to pending.");
    setUndoingRequestId(null);
    await loadRequests();
  };

  return (
    <PortalShell
      title="Payment Tracker"
      description="Group Pending Payment items by Merchant and record Paid expenses."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Payment Tracker
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Merchant-based Pending Payments
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Pending Payment items are grouped by Merchant identity when available, with
        older text-only rows grouped by normalized merchant text.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-muted">
        New merchants are marked as Needs review until a professor/admin
        confirms the merchant name.
      </p>

      {!loading && !userCanManagePayments ? (
        <div className="mt-6 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          Payment controls are available only to professor/admin users.
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

      {userCanManagePayments ? (
        <section className="portal-card mt-8 rounded-lg border border-line p-5 shadow-panel">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Funding Source
              </span>
              <select
                value={selectedFundingSourceId}
                onChange={(event) =>
                  setSelectedFundingSourceId(event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
              >
                <option value="">Select Funding Source</option>
                {fundingSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-foreground">
                Payment note
              </span>
              <input
                value={paymentNote}
                onChange={(event) => setPaymentNote(event.target.value)}
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand focus:shadow-sm"
                placeholder="Optional note applied to selected rows"
              />
            </label>

            <button
              type="button"
              disabled={saving || fundingLoading || fundingSources.length === 0}
              onClick={() => void handleMarkAsPaid()}
              className="action-button action-button-primary rounded-md bg-brand px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Mark as Paid"}
            </button>
          </div>

          {fundingLoading ? (
            <p className="mt-3 text-sm text-muted">Loading Funding Sources...</p>
          ) : null}

          {!fundingLoading && fundingSources.length === 0 ? (
            <p className="mt-3 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
              No Funding Sources have been created yet.
            </p>
          ) : null}

          <p className="mt-3 text-sm text-muted">
            Selected Pending Payment items: {selectedRequestIds.length}
          </p>
        </section>
      ) : null}

      <section className="mt-9">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Pending Payments by Merchant
            </p>
            <h3 className="mt-2 text-2xl font-semibold">
              Pending Payment queue
            </h3>
          </div>
          <button
            type="button"
            onClick={() => void loadInitialData()}
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="portal-card mt-5 rounded-md border border-line p-5 text-sm text-muted">
            Loading requests...
          </div>
        ) : null}

        {!loading && pendingGroups.length === 0 && !errorMessage ? (
          <div className="portal-card mt-5 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
            No Pending Payment items yet.
          </div>
        ) : null}

        {!loading && pendingGroups.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {pendingGroups.map((group) => {
              const groupIds = group.requests.map((request) => request.id);
              const allSelected = groupIds.every((id) =>
                selectedRequestIds.includes(id),
              );

              return (
                <article
                  key={group.key}
                  className="elevated-card portal-card border border-line p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                          {group.requests.length} pending item
                          {group.requests.length === 1 ? "" : "s"}
                        </p>
                        {group.needsReview ? (
                          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                            Needs review
                          </span>
                        ) : null}
                      </div>
                      <h4 className="mt-1 text-xl font-semibold">
                        {group.merchantName}
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Pending total</p>
                      <p className="mt-1 text-lg font-semibold text-brand">
                        {getGroupTotal(group.requests)}
                      </p>
                    </div>
                  </div>

                  {userCanManagePayments ? (
                    <button
                      type="button"
                      onClick={() => toggleMerchantGroup(group)}
                      className="mt-3 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                    >
                      {allSelected ? "Clear merchant selection" : "Select merchant items"}
                    </button>
                  ) : null}

                  <div className="mt-3 grid gap-2">
                    {group.requests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-md border border-line/70 bg-white/80 p-3"
                      >
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_auto_auto] lg:items-start">
                          <div className="flex min-w-0 gap-3">
                            {userCanManagePayments ? (
                              <input
                                type="checkbox"
                                checked={selectedRequestIds.includes(request.id)}
                                onChange={() => toggleRequest(request.id)}
                                className="mt-1 h-4 w-4 shrink-0 accent-brand"
                                aria-label={`Select ${request.item_name}`}
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {request.item_name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                {getRequesterLabel(
                                  requesterProfiles[request.requester_id],
                                  request.requester_id,
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-brand-soft px-2 py-1 font-semibold capitalize text-brand">
                              {request.cost_category || "uncategorized"}
                            </span>
                            <span className="rounded-md bg-white px-2 py-1 font-semibold text-muted">
                              {formatCost(
                                request.estimated_cost,
                                request.currency,
                              )}
                            </span>
                          </div>

                          {request.item_url ? (
                            <a
                              href={request.item_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-brand transition hover:text-foreground"
                            >
                              Item URL
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-2 grid gap-1 text-xs leading-5 text-muted lg:grid-cols-2">
                          <p>
                            <span className="font-semibold text-foreground">
                              Purpose:
                            </span>{" "}
                            {request.purpose}
                          </p>
                          {request.payment_note ? (
                            <p>
                              <span className="font-semibold text-foreground">
                                Note:
                              </span>{" "}
                              {request.payment_note}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {!loading && paidGroups.length > 0 ? (
        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Paid by Merchant
          </p>
          <h3 className="mt-2 text-2xl font-semibold">
            Paid request history
          </h3>
          <div className="mt-5 grid gap-3">
            {paidGroups.map((group) => (
              <article
                key={group.key}
                className="rounded-md border border-line bg-white/60 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">{group.merchantName}</h4>
                    {group.needsReview ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                        Needs review
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-muted">
                    Paid total: {getPaidGroupTotal(group.requests) || "0 KRW"}
                  </p>
                </div>

                <div className="mt-3 grid gap-2">
                  {group.requests.map((request) => (
                    <div
                      key={request.id}
                      className="grid gap-2 rounded-md bg-[#f7f9fb] px-3 py-2 text-xs text-muted lg:grid-cols-[minmax(0,1.5fr)_auto_auto_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {request.item_name}
                        </p>
                        {request.payment_note ? (
                          <p className="mt-0.5 truncate">
                            Note: {request.payment_note}
                          </p>
                        ) : null}
                      </div>
                      <p className="font-semibold">
                        {formatCost(request.estimated_cost, request.currency)}
                      </p>
                      <p>
                        {request.funding_source_id
                          ? fundingSourceMap[request.funding_source_id]?.name ??
                            "Funding Source assigned"
                          : "No Funding Source"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span>{formatDate(request.paid_at)}</span>
                        {userCanManagePayments && request.status === "paid" ? (
                          <button
                            type="button"
                            disabled={undoingRequestId === request.id}
                            onClick={() => void handleUndoPayment(request)}
                            className="rounded-md border border-line bg-white px-2 py-1 font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {undoingRequestId === request.id
                              ? "Undoing..."
                              : "Undo Payment"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </PortalShell>
  );
}
