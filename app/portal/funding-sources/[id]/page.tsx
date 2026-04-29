"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type FundingSource = {
  id: string;
  name: string;
  funding_agency: string | null;
  project_code: string | null;
  project_title: string | null;
  description: string | null;
  materials_budget: number | null;
  activities_budget: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
};

type PurchaseRequest = {
  id: string;
  requester_id: string;
  merchant_id: string | null;
  merchant: string | null;
  item_name: string;
  cost_category: CostCategory | null;
  estimated_cost: number | null;
  currency: string;
  purpose: string;
  payment_note: string | null;
  status: string;
  funding_source_id: string | null;
  paid_at: string | null;
};

type Profile = {
  id: string;
  role?: string | null;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
};

type Merchant = {
  id: string;
  name: string;
};

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

const requestSelect =
  "id, requester_id, merchant_id, merchant, item_name, cost_category, estimated_cost, currency, purpose, payment_note, status, funding_source_id, paid_at";

function canViewAll(role: string | null) {
  return role === "professor" || role === "admin";
}

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatAmount(value: number, currency = "KRW") {
  return `${value.toLocaleString()} ${currency}`;
}

function getRequesterLabel(profile: Profile | undefined, requesterId: string) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.email ||
    `Requester ${requesterId.slice(0, 8)}`
  );
}

function getMerchantName(
  request: PurchaseRequest,
  merchantMap: Record<string, Merchant>,
) {
  if (request.merchant_id && merchantMap[request.merchant_id]) {
    return merchantMap[request.merchant_id].name;
  }

  return request.merchant || "Unknown merchant";
}

function getPaidAmount(requests: PurchaseRequest[], category: CostCategory) {
  return requests
    .filter((request) => request.cost_category === category)
    .reduce((total, request) => total + (request.estimated_cost ?? 0), 0);
}

export default function FundingSourceDetailPage() {
  const params = useParams<{ id: string }>();
  const sourceId = params.id;
  const [source, setSource] = useState<FundingSource | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, Merchant>>({});
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    setAccessDenied(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Please sign in again before viewing this Funding Source.");
      setLoading(false);
      return;
    }

    const [profileResult, managerResult, sourceResult, requestsResult] =
      await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("funding_source_managers")
          .select("*")
          .eq("funding_source_id", sourceId)
          .eq("user_id", user.id),
        supabase.from("funding_sources").select("*").eq("id", sourceId).maybeSingle(),
        supabase
          .from("purchase_requests")
          .select(requestSelect)
          .eq("funding_source_id", sourceId)
          .eq("status", "paid")
          .order("paid_at", { ascending: false }),
      ]);

    const role =
      (((profileResult.data as Profile | null)?.role ?? null)?.toLowerCase() ??
        null);
    const managerRows = (managerResult.data ?? []) as FundingSourceManager[];
    const hasAccess = canViewAll(role) || managerRows.length > 0;

    if (!hasAccess) {
      setAccessDenied(true);
      setSource(null);
      setRequests([]);
      setLoading(false);
      return;
    }

    if (sourceResult.error || !sourceResult.data) {
      setErrorMessage(sourceResult.error?.message ?? "Funding Source not found.");
      setSource(null);
      setRequests([]);
      setLoading(false);
      return;
    }

    const nextRequests = (requestsResult.data ?? []) as PurchaseRequest[];
    setSource(sourceResult.data as FundingSource);
    setRequests(nextRequests);

    const merchantIds = Array.from(
      new Set(
        nextRequests
          .map((request) => request.merchant_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
    const requesterIds = Array.from(
      new Set(nextRequests.map((request) => request.requester_id)),
    );

    const [merchantsResult, profilesResult] = await Promise.all([
      merchantIds.length > 0
        ? supabase.from("merchants").select("id, name").in("id", merchantIds)
        : Promise.resolve({ data: [], error: null }),
      requesterIds.length > 0
        ? supabase.from("profiles").select("*").in("id", requesterIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    setMerchantMap(
      ((merchantsResult.data ?? []) as Merchant[]).reduce<
        Record<string, Merchant>
      >((accumulator, merchant) => {
        accumulator[merchant.id] = merchant;
        return accumulator;
      }, {}),
    );
    setProfileMap(
      ((profilesResult.data ?? []) as Profile[]).reduce<
        Record<string, Profile>
      >((accumulator, profile) => {
        accumulator[profile.id] = profile;
        return accumulator;
      }, {}),
    );

    setLoading(false);
  }, [sourceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDetail]);

  const summary = useMemo(() => {
    const materialsBudget = source?.materials_budget ?? 0;
    const activitiesBudget = source?.activities_budget ?? 0;
    const materialsPaid = getPaidAmount(requests, "materials");
    const activitiesPaid = getPaidAmount(requests, "activities");

    return {
      materialsBudget,
      activitiesBudget,
      materialsPaid,
      activitiesPaid,
      materialsRemaining: materialsBudget - materialsPaid,
      activitiesRemaining: activitiesBudget - activitiesPaid,
      totalBudget: materialsBudget + activitiesBudget,
      totalPaid: materialsPaid + activitiesPaid,
      totalRemaining:
        materialsBudget + activitiesBudget - materialsPaid - activitiesPaid,
    };
  }, [requests, source]);

  const merchantTotals = useMemo(() => {
    const totals = requests.reduce<
      Record<string, { merchantName: string; total: number; count: number }>
    >((accumulator, request) => {
      const merchantName = getMerchantName(request, merchantMap);
      accumulator[merchantName] ??= { merchantName, total: 0, count: 0 };
      accumulator[merchantName].total += request.estimated_cost ?? 0;
      accumulator[merchantName].count += 1;
      return accumulator;
    }, {});

    return Object.values(totals).sort((first, second) => second.total - first.total);
  }, [merchantMap, requests]);

  const requestsByCategory = useMemo(
    () => ({
      materials: requests.filter((request) => request.cost_category === "materials"),
      activities: requests.filter((request) => request.cost_category === "activities"),
    }),
    [requests],
  );

  const currency = source?.currency ?? "KRW";

  return (
    <PortalShell
      title="Funding Source"
      description="Review Funding Source details, paid requests, and budget usage."
    >
      {loading ? (
        <div className="portal-card rounded-md border border-line p-5 text-sm text-muted">
          Loading Funding Source...
        </div>
      ) : null}

      {!loading && accessDenied ? (
        <div className="rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to view this Funding Source.
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <div className="rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {errorMessage}
        </div>
      ) : null}

      {!loading && source && !accessDenied ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Funding Source Detail
          </p>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">{source.name}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
                {source.description || "No description provided."}
              </p>
            </div>
            <span className="rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
              {source.is_active === false ? "Inactive" : "Active"}
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ["Funding agency", source.funding_agency],
              ["Project code", source.project_code],
              ["Project title", source.project_title],
              ["Currency", source.currency ?? "KRW"],
              ["Start date", formatDate(source.start_date)],
              ["End date", formatDate(source.end_date)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-line bg-white/70 p-3 text-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  {label}
                </p>
                <p className="mt-1 font-semibold">{value || "TBD"}</p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Budget Summary
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ["Materials budget", summary.materialsBudget],
                ["Materials paid", summary.materialsPaid],
                ["Materials remaining", summary.materialsRemaining],
                ["Activities budget", summary.activitiesBudget],
                ["Activities paid", summary.activitiesPaid],
                ["Activities remaining", summary.activitiesRemaining],
                ["Total budget", summary.totalBudget],
                ["Total paid", summary.totalPaid],
                ["Total remaining", summary.totalRemaining],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-line bg-white/70 p-3 text-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {label}
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatAmount(Number(value), currency)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Merchant Paid Totals
            </p>
            {merchantTotals.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                No paid requests for this Funding Source.
              </div>
            ) : (
              <div className="mt-4 grid gap-2">
                {merchantTotals.map((merchantTotal) => (
                  <div
                    key={merchantTotal.merchantName}
                    className="grid gap-2 rounded-md border border-line bg-white/70 px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto]"
                  >
                    <p className="font-semibold">{merchantTotal.merchantName}</p>
                    <p className="text-muted">{merchantTotal.count} paid item(s)</p>
                    <p className="font-semibold text-brand">
                      {formatAmount(merchantTotal.total, currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {(["materials", "activities"] as CostCategory[]).map((category) => (
            <section key={category} className="mt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                {category} paid requests
              </p>
              {requestsByCategory[category].length === 0 ? (
                <div className="mt-4 rounded-md border border-dashed border-line p-5 text-sm text-muted">
                  No paid {category} requests.
                </div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {requestsByCategory[category].map((request) => (
                    <div
                      key={request.id}
                      className="rounded-md border border-line bg-white/70 px-3 py-2 text-xs text-muted"
                    >
                      <div className="grid gap-2 md:grid-cols-[0.8fr_1fr_1.3fr_auto] md:items-center">
                        <p>{formatDate(request.paid_at)}</p>
                        <p className="font-semibold text-foreground">
                          {getMerchantName(request, merchantMap)}
                        </p>
                        <p className="font-semibold text-foreground">
                          {request.item_name}
                        </p>
                        <p className="font-semibold text-brand">
                          {formatAmount(request.estimated_cost ?? 0, request.currency)}
                        </p>
                      </div>
                      <div className="mt-2 grid gap-1 md:grid-cols-2">
                        <p>
                          Requester:{" "}
                          {getRequesterLabel(
                            profileMap[request.requester_id],
                            request.requester_id,
                          )}
                        </p>
                        <p>Purpose: {request.purpose}</p>
                        {request.payment_note ? (
                          <p className="md:col-span-2">
                            Payment note: {request.payment_note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </PortalShell>
  );
}
