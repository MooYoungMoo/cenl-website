"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type FundingSource = {
  id: string;
  name: string;
  funding_agency?: string | null;
  project_code?: string | null;
  project_title?: string | null;
  currency?: string | null;
  materials_budget?: number | null;
  activities_budget?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
};

type Merchant = {
  id: string;
  name: string;
  normalized_name: string;
};

type PurchaseRequest = {
  id: string;
  merchant_id: string | null;
  merchant: string;
  item_name: string;
  cost_category: CostCategory | null;
  estimated_cost: number | null;
  currency: string;
  status: string;
  funding_source_id: string | null;
  requested_at: string | null;
  paid_at: string | null;
};

type BudgetSummary = {
  source: FundingSource;
  materialsBudget: number;
  activitiesBudget: number;
  materialsPaid: number;
  activitiesPaid: number;
};

const requestSelect =
  "id, merchant_id, merchant, item_name, cost_category, estimated_cost, currency, status, funding_source_id, requested_at, paid_at";

const merchantSelect = "id, name, normalized_name";

function normalizeMerchantName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatAmount(value: number, currency = "KRW") {
  return `${value.toLocaleString()} ${currency}`;
}

function getUsagePercent(paid: number, budget: number) {
  if (budget <= 0) {
    return paid > 0 ? 100 : 0;
  }

  return Math.min(100, Math.max(0, (paid / budget) * 100));
}

function UsageBar({
  label,
  paid,
  budget,
}: {
  label: string;
  paid: number;
  budget: number;
}) {
  const percent = getUsagePercent(paid, budget);

  return (
    <div className="mt-4">
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>{label} usage</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/70">
        <div
          className="h-full rounded-full bg-brand/70 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function getFundingMetadata(source: FundingSource) {
  return [
    source.funding_agency ? `Agency: ${source.funding_agency}` : "",
    source.project_code ? `Code: ${source.project_code}` : "",
    source.project_title ? `Project: ${source.project_title}` : "",
  ].filter(Boolean);
}

function getSourceBudget(source: FundingSource, category: CostCategory) {
  return category === "materials"
    ? (source.materials_budget ?? 0)
    : (source.activities_budget ?? 0);
}

function getPaidAmount(requests: PurchaseRequest[], sourceId: string, category: CostCategory) {
  return requests
    .filter(
      (request) =>
        request.status === "paid" &&
        request.funding_source_id === sourceId &&
        request.cost_category === category,
    )
    .reduce((total, request) => total + (request.estimated_cost ?? 0), 0);
}

function getMerchantTotals(
  requests: PurchaseRequest[],
  merchantMap: Record<string, Merchant>,
) {
  return requests
    .filter((request) => request.status === "pending_payment")
    .reduce<Record<string, { name: string; total: number }>>((accumulator, request) => {
      const merchantRecord = request.merchant_id
        ? merchantMap[request.merchant_id]
        : undefined;
      const merchantName =
        merchantRecord?.name || request.merchant || "Unknown merchant";
      const fallbackKey = normalizeMerchantName(merchantName) || "unknown";
      const key = request.merchant_id
        ? `merchant:${request.merchant_id}`
        : `text:${fallbackKey}`;

      accumulator[key] ??= { name: merchantName, total: 0 };
      accumulator[key].total += request.estimated_cost ?? 0;
      return accumulator;
    }, {});
}

export default function BudgetDashboardPage() {
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, Merchant>>({});
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [sourcesResult, requestsResult] = await Promise.all([
      supabase.from("funding_sources").select("*").order("name", {
        ascending: true,
      }),
      supabase
        .from("purchase_requests")
        .select(requestSelect)
        .order("requested_at", { ascending: false }),
    ]);

    if (sourcesResult.error) {
      setFundingSources([]);
      setErrorMessage(sourcesResult.error.message);
    } else {
      const activeSources = ((sourcesResult.data ?? []) as FundingSource[]).filter(
        (source) => source.is_active !== false && source.active !== false,
      );
      setFundingSources(activeSources);
    }

    if (requestsResult.error) {
      setRequests([]);
      setMerchantMap({});
      setErrorMessage(requestsResult.error.message);
    } else {
      const nextRequests = (requestsResult.data ?? []) as PurchaseRequest[];
      setRequests(nextRequests);

      const merchantIds = Array.from(
        new Set(
          nextRequests
            .map((request) => request.merchant_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (merchantIds.length > 0) {
        const { data: merchants } = await supabase
          .from("merchants")
          .select(merchantSelect)
          .in("id", merchantIds);

        const nextMerchantMap = ((merchants ?? []) as Merchant[]).reduce<
          Record<string, Merchant>
        >((accumulator, merchant) => {
          accumulator[merchant.id] = merchant;
          return accumulator;
        }, {});

        setMerchantMap(nextMerchantMap);
      } else {
        setMerchantMap({});
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  const budgetSummaries = useMemo<BudgetSummary[]>(
    () =>
      fundingSources.map((source) => ({
        source,
        materialsBudget: getSourceBudget(source, "materials"),
        activitiesBudget: getSourceBudget(source, "activities"),
        materialsPaid: getPaidAmount(requests, source.id, "materials"),
        activitiesPaid: getPaidAmount(requests, source.id, "activities"),
      })),
    [fundingSources, requests],
  );

  const pendingMerchantTotals = useMemo(
    () => Object.values(getMerchantTotals(requests, merchantMap)),
    [merchantMap, requests],
  );

  const budgetTotals = useMemo(
    () =>
      budgetSummaries.reduce(
        (totals, summary) => {
          const materialsRemaining =
            summary.materialsBudget - summary.materialsPaid;
          const activitiesRemaining =
            summary.activitiesBudget - summary.activitiesPaid;

          return {
            activeSources: totals.activeSources + 1,
            materialsRemaining:
              totals.materialsRemaining + materialsRemaining,
            activitiesRemaining:
              totals.activitiesRemaining + activitiesRemaining,
            totalRemaining:
              totals.totalRemaining + materialsRemaining + activitiesRemaining,
          };
        },
        {
          activeSources: 0,
          materialsRemaining: 0,
          activitiesRemaining: 0,
          totalRemaining: 0,
        },
      ),
    [budgetSummaries],
  );

  return (
    <PortalShell
      title="Budget Dashboard"
      description="Track paid request totals against Funding Source budgets."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Funding Overview
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Funding Source budget summary
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Paid requests are counted against their assigned Funding Source.
        Pending merchant requests are shown separately and are not subtracted
        from budgets until marked as paid.
      </p>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="portal-card mt-6 rounded-md border border-line p-5 text-sm text-muted">
          Loading budget dashboard...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          {errorMessage}
        </div>
      ) : null}

      {!loading && fundingSources.length === 0 && !errorMessage ? (
        <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
          No Funding Sources have been created yet.
        </div>
      ) : null}

      {!loading && budgetSummaries.length > 0 ? (
        <section className="mt-8 grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-line bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Active Sources
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {budgetTotals.activeSources}
            </p>
          </div>
          <div className="rounded-md border border-line bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Materials Remaining
            </p>
            <p className="mt-2 text-lg font-semibold text-brand">
              {formatAmount(budgetTotals.materialsRemaining)}
            </p>
          </div>
          <div className="rounded-md border border-line bg-white/75 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Activities Remaining
            </p>
            <p className="mt-2 text-lg font-semibold text-brand">
              {formatAmount(budgetTotals.activitiesRemaining)}
            </p>
          </div>
          <div className="rounded-md border border-line bg-brand-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              Total Remaining
            </p>
            <p className="mt-2 text-lg font-semibold text-brand">
              {formatAmount(budgetTotals.totalRemaining)}
            </p>
          </div>
        </section>
      ) : null}

      {!loading && budgetSummaries.length > 0 ? (
        <div className="mt-6 grid gap-5">
          {budgetSummaries.map((summary) => {
            const materialsRemaining =
              summary.materialsBudget - summary.materialsPaid;
            const activitiesRemaining =
              summary.activitiesBudget - summary.activitiesPaid;
            const materialsTotal = summary.materialsBudget;
            const activitiesTotal = summary.activitiesBudget;
            const totalBudget = materialsTotal + activitiesTotal;
            const totalPaid = summary.materialsPaid + summary.activitiesPaid;
            const totalRemaining = materialsRemaining + activitiesRemaining;
            const currency = summary.source.currency ?? "KRW";
            const fundingMetadata = getFundingMetadata(summary.source);

            return (
              <article
                key={summary.source.id}
                className="elevated-card portal-card border border-line p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      Funding Source
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {summary.source.name}
                    </h3>
                    {fundingMetadata.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {fundingMetadata.map((metadata) => (
                          <span
                            key={metadata}
                            className="rounded-full border border-line bg-white/75 px-3 py-1 text-xs font-semibold text-muted"
                          >
                            {metadata}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-brand-soft px-4 py-3 text-right">
                    <p className="text-sm text-muted">Total remaining</p>
                    <p className="mt-1 text-xl font-semibold text-brand">
                      {formatAmount(totalRemaining, currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md border border-line/70 bg-white/75 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Total Budget
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatAmount(totalBudget, currency)}
                    </p>
                  </div>
                  <div className="rounded-md border border-line/70 bg-white/75 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      Total Paid
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatAmount(totalPaid, currency)}
                    </p>
                  </div>
                  <div className="rounded-md border border-line/70 bg-brand-soft p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                      Total Remaining
                    </p>
                    <p className="mt-2 text-lg font-semibold text-brand">
                      {formatAmount(totalRemaining, currency)}
                    </p>
                  </div>
                </div>

                <UsageBar label="Total" paid={totalPaid} budget={totalBudget} />

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-line/70 bg-white/75 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                      Materials
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Budget</dt>
                        <dd className="font-semibold">
                          {formatAmount(summary.materialsBudget, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Paid</dt>
                        <dd className="font-semibold">
                          {formatAmount(summary.materialsPaid, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-line pt-3">
                        <dt className="text-muted">Remaining</dt>
                        <dd className="font-semibold text-brand">
                          {formatAmount(materialsRemaining, currency)}
                        </dd>
                      </div>
                    </dl>
                    <UsageBar
                      label="Materials"
                      paid={summary.materialsPaid}
                      budget={summary.materialsBudget}
                    />
                  </div>

                  <div className="rounded-md border border-line/70 bg-white/75 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                      Activities
                    </p>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Budget</dt>
                        <dd className="font-semibold">
                          {formatAmount(summary.activitiesBudget, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted">Paid</dt>
                        <dd className="font-semibold">
                          {formatAmount(summary.activitiesPaid, currency)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-line pt-3">
                        <dt className="text-muted">Remaining</dt>
                        <dd className="font-semibold text-brand">
                          {formatAmount(activitiesRemaining, currency)}
                        </dd>
                      </div>
                    </dl>
                    <UsageBar
                      label="Activities"
                      paid={summary.activitiesPaid}
                      budget={summary.activitiesBudget}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!loading ? (
        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Unassigned Pending Payments
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Not yet assigned to Funding Sources
          </h3>
          {pendingMerchantTotals.length === 0 ? (
            <div className="portal-card mt-6 rounded-md border border-dashed border-line p-6 text-sm text-muted">
              No pending payment requests.
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {pendingMerchantTotals.map((merchantTotal) => (
                <div
                  key={merchantTotal.name}
                  className="rounded-md border border-line bg-white/75 p-4"
                >
                  <p className="font-semibold">{merchantTotal.name}</p>
                  <p className="mt-2 text-sm text-muted">
                    Pending amount: {formatAmount(merchantTotal.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </PortalShell>
  );
}
