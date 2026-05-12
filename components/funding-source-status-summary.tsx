"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type FundingSource = {
  id: string;
  name: string;
  currency?: string | null;
  materials_budget?: number | null;
  activities_budget?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
  finished_at?: string | null;
  created_at?: string | null;
};

type PurchaseRequest = {
  id: string;
  request_kind?: string | null;
  cost_category?: CostCategory | string | null;
  estimated_cost?: number | null;
  status?: string | null;
  funding_source_id?: string | null;
};

type CategoryStatus = {
  budget: number;
  paid: number;
  pending: number;
  remaining: number;
};

type SourceStatus = {
  source: FundingSource;
  materials: CategoryStatus;
  activities: CategoryStatus;
};

type FundingSourceStatusSummaryProps = {
  className?: string;
  emptyMessage?: string;
  restrictToVisibleIds?: boolean;
  visibleFundingSourceIds?: string[] | null;
};

const sourceSelect =
  "id, name, currency, materials_budget, activities_budget, is_active, finished_at, created_at";

const requestSelect =
  "id, request_kind, cost_category, estimated_cost, status, funding_source_id";

function isActiveSource(source: FundingSource) {
  return source.is_active !== false && source.active !== false && !source.finished_at;
}

function getRequestCategory(request: PurchaseRequest): CostCategory {
  if (
    request.request_kind === "activities" ||
    request.request_kind === "activity" ||
    request.cost_category === "activities"
  ) {
    return "activities";
  }

  return "materials";
}

function formatAmount(value: number, currency = "KRW") {
  return `${Math.round(value).toLocaleString()} ${currency}`;
}

function getHealthLabel(status: CategoryStatus) {
  if (status.remaining < 0) {
    return "Over requested";
  }

  if (status.budget > 0 && status.remaining / status.budget <= 0.15) {
    return "Low";
  }

  return "Healthy";
}

function getHealthClass(label: string) {
  if (label === "Over requested") {
    return "bg-accent-soft text-accent";
  }

  if (label === "Low") {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-brand-soft text-brand";
}

function buildCategoryStatus(
  source: FundingSource,
  requests: PurchaseRequest[],
  category: CostCategory,
): CategoryStatus {
  const budget =
    category === "materials"
      ? (source.materials_budget ?? 0)
      : (source.activities_budget ?? 0);
  const categoryRequests = requests.filter(
    (request) =>
      request.funding_source_id === source.id &&
      getRequestCategory(request) === category,
  );
  const paid = categoryRequests
    .filter((request) => request.status === "paid")
    .reduce((total, request) => total + (request.estimated_cost ?? 0), 0);
  const pending = categoryRequests
    .filter((request) => request.status === "pending_payment")
    .reduce((total, request) => total + (request.estimated_cost ?? 0), 0);

  return {
    budget,
    paid,
    pending,
    remaining: budget - paid - pending,
  };
}

function StatusRow({
  label,
  status,
  currency,
}: {
  label: string;
  status: CategoryStatus;
  currency: string;
}) {
  const healthLabel = getHealthLabel(status);

  return (
    <div className="rounded-md border border-line/70 bg-white/75 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${getHealthClass(
            healthLabel,
          )}`}
        >
          {healthLabel}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[0.72rem] leading-5 text-muted sm:grid-cols-4">
        <p>
          <span className="font-semibold text-foreground">Budget:</span>{" "}
          {formatAmount(status.budget, currency)}
        </p>
        <p>
          <span className="font-semibold text-foreground">Paid:</span>{" "}
          {formatAmount(status.paid, currency)}
        </p>
        <p>
          <span className="font-semibold text-foreground">Pending:</span>{" "}
          {formatAmount(status.pending, currency)}
        </p>
        <p>
          <span className="font-semibold text-foreground">Remaining:</span>{" "}
          {formatAmount(status.remaining, currency)}
        </p>
      </div>
    </div>
  );
}

export function FundingSourceStatusSummary({
  className = "",
  emptyMessage = "No active funding sources are available.",
  restrictToVisibleIds = false,
  visibleFundingSourceIds = null,
}: FundingSourceStatusSummaryProps) {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const visibleIdSet = useMemo(
    () => new Set(visibleFundingSourceIds ?? []),
    [visibleFundingSourceIds],
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const [sourcesResult, requestsResult] = await Promise.all([
      supabase
        .from("funding_sources")
        .select(sourceSelect)
        .order("created_at", { ascending: false }),
      supabase.from("purchase_requests").select(requestSelect),
    ]);

    if (sourcesResult.error) {
      setSources([]);
      setErrorMessage(sourcesResult.error.message);
    } else {
      setSources((sourcesResult.data ?? []) as FundingSource[]);
    }

    if (requestsResult.error) {
      setRequests([]);
      setErrorMessage(requestsResult.error.message);
    } else {
      setRequests((requestsResult.data ?? []) as PurchaseRequest[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSummary();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadSummary]);

  const sourceStatuses = useMemo<SourceStatus[]>(
    () =>
      sources
        .filter(isActiveSource)
        .filter(
          (source) => !restrictToVisibleIds || visibleIdSet.has(source.id),
        )
        .slice(0, 5)
        .map((source) => ({
          source,
          materials: buildCategoryStatus(source, requests, "materials"),
          activities: buildCategoryStatus(source, requests, "activities"),
        })),
    [requests, restrictToVisibleIds, sources, visibleIdSet],
  );

  return (
    <section className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
            Funding Source Status
          </p>
          <h3 className="mt-2 text-lg font-semibold">
            Active funding source snapshot
          </h3>
        </div>
        <p className="text-xs text-muted">Showing up to 5 active sources</p>
      </div>

      {loading ? (
        <div className="portal-card mt-4 rounded-md border border-line p-4 text-sm text-muted">
          Loading Funding Source Status...
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <div className="mt-4 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          Could not load Funding Source Status.
        </div>
      ) : null}

      {!loading && !errorMessage && sourceStatuses.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-muted">
          {emptyMessage}
        </div>
      ) : null}

      {!loading && !errorMessage && sourceStatuses.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {sourceStatuses.map((summary) => {
            const currency = summary.source.currency || "KRW";

            return (
              <article
                key={summary.source.id}
                className="portal-card rounded-lg border border-line bg-white/70 p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                    {summary.source.name}
                  </p>
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[0.72rem] font-semibold text-brand">
                    Active
                  </span>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  <StatusRow
                    label="Materials"
                    status={summary.materials}
                    currency={currency}
                  />
                  <StatusRow
                    label="Activities"
                    status={summary.activities}
                    currency={currency}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
