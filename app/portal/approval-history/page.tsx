"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal-shell";
import { logPortalActivity } from "@/lib/portal-activity";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type RequestKind = "materials" | "activities";

type PurchaseStatus = "pending_payment" | "paid" | "canceled";

type Merchant = {
  id: string;
  name: string;
  normalized_name: string;
  needs_review: boolean | null;
};

type ActivityGroup = {
  id: string;
  name: string;
  normalized_name: string;
  activity_type: string | null;
  needs_review: boolean | null;
};

type PurchaseRequest = {
  id: string;
  requester_id: string;
  request_kind: RequestKind | string | null;
  merchant: string | null;
  merchant_id: string | null;
  activity_type: string | null;
  activity_group_name: string | null;
  activity_group_id: string | null;
  request_date: string | null;
  activity_detail: string | null;
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

type FundingSourceManager = {
  funding_source_id: string;
  user_id: string;
};

type RequestGroup = {
  key: string;
  merchantId: string | null;
  groupName: string;
  groupType: RequestKind;
  activityType?: string | null;
  needsReview: boolean;
  requests: PurchaseRequest[];
};

type PaidGroupSummary = {
  latestDate: string | null;
  total: string;
};

const requestSelect =
  "id, requester_id, request_kind, merchant, merchant_id, activity_type, activity_group_name, activity_group_id, request_date, activity_detail, item_name, cost_category, item_url, purpose, estimated_cost, currency, status, payment_note, funding_source_id, requested_at, paid_at, created_at, updated_at";

const merchantSelect = "id, name, normalized_name, needs_review";

const activityGroupSelect =
  "id, name, normalized_name, activity_type, needs_review";

function normalizeMerchantName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeActivityGroupName(value: string) {
  return normalizeMerchantName(value);
}

function formatActivityType(value: string | null | undefined) {
  if (!value) {
    return "Activity";
  }

  return value.replaceAll("_", " ").replace(/^\w/, (letter) =>
    letter.toUpperCase(),
  );
}

function isActivityRequest(request: PurchaseRequest) {
  return (
    request.request_kind === "activities" ||
    request.cost_category === "activities" ||
    Boolean(request.activity_group_id || request.activity_group_name)
  );
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

function getRequestActivityGroupName(
  request: PurchaseRequest,
  activityGroupMap: Record<string, ActivityGroup>,
) {
  if (
    request.activity_group_id &&
    activityGroupMap[request.activity_group_id]
  ) {
    return activityGroupMap[request.activity_group_id].name;
  }

  return request.activity_group_name || request.merchant || "Unknown activity";
}

function getRequestGroupName(
  request: PurchaseRequest,
  merchantMap: Record<string, Merchant>,
  activityGroupMap: Record<string, ActivityGroup>,
) {
  return isActivityRequest(request)
    ? getRequestActivityGroupName(request, activityGroupMap)
    : getRequestMerchantName(request, merchantMap);
}

function getRequestDisplayDate(request: PurchaseRequest) {
  return request.request_date || request.requested_at;
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

function getGroupLabel(group: RequestGroup) {
  return group.groupName;
}

function getRequestSortDate(request: PurchaseRequest) {
  return request.paid_at || getRequestDisplayDate(request) || request.created_at;
}

function getRequestHistoryYear(request: PurchaseRequest) {
  const date =
    request.request_date || request.paid_at || request.created_at || request.requested_at;
  return date ? date.slice(0, 4) : "Unknown";
}

function getPaidGroupSummary(group: RequestGroup): PaidGroupSummary {
  const latestDate =
    group.requests
      .map((request) => getRequestSortDate(request))
      .filter((value): value is string => Boolean(value))
      .sort((first, second) => second.localeCompare(first))[0] ?? null;

  return {
    latestDate,
    total: getPaidGroupTotal(group.requests) || "0 KRW",
  };
}

function groupRequestsByEntity(
  requests: PurchaseRequest[],
  merchantMap: Record<string, Merchant>,
  activityGroupMap: Record<string, ActivityGroup>,
) {
  const grouped = requests.reduce<Record<string, RequestGroup>>(
    (accumulator, request) => {
      const activity = isActivityRequest(request);
      const merchantRecord =
        !activity && request.merchant_id
          ? merchantMap[request.merchant_id]
          : undefined;
      const activityGroupRecord =
        activity && request.activity_group_id
          ? activityGroupMap[request.activity_group_id]
          : undefined;
      const groupName = getRequestGroupName(
        request,
        merchantMap,
        activityGroupMap,
      );
      const fallbackKey =
        (activity
          ? normalizeActivityGroupName(groupName)
          : normalizeMerchantName(groupName)) || "unknown";
      const activityType =
        request.activity_type || activityGroupRecord?.activity_type || "other";
      const key = activity
        ? request.activity_group_id
          ? `activity:${activityType}:${request.activity_group_id}`
          : `activity:${activityType}:text:${fallbackKey}`
        : request.merchant_id
          ? `merchant:${request.merchant_id}`
          : `merchant:text:${fallbackKey}`;

      accumulator[key] ??= {
        key,
        merchantId: request.merchant_id,
        groupName,
        groupType: activity ? "activities" : "materials",
        activityType,
        needsReview: activity
          ? Boolean(activityGroupRecord?.needs_review)
          : Boolean(merchantRecord?.needs_review),
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
  const [activityGroupMap, setActivityGroupMap] = useState<
    Record<string, ActivityGroup>
  >({});
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedFundingSourceId, setSelectedFundingSourceId] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [managedFundingSourceIds, setManagedFundingSourceIds] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoingRequestId, setUndoingRequestId] = useState<string | null>(null);
  const [expandedPaidGroupKeys, setExpandedPaidGroupKeys] = useState<string[]>(
    [],
  );
  const [paidYearFilter, setPaidYearFilter] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const userIsGlobalManager = canManagePayments(role);
  const userIsProjectAdmin = managedFundingSourceIds.length > 0;
  const userCanManagePayments = userIsGlobalManager || userIsProjectAdmin;

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

  const loadFundingSources = useCallback(async (userId: string, userRole: string | null) => {
    setFundingLoading(true);

    const [sourcesResult, managersResult] = await Promise.all([
      supabase
      .from("funding_sources")
      .select("*")
        .order("name", { ascending: true }),
      userId
        ? supabase
            .from("funding_source_managers")
            .select("*")
            .eq("user_id", userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (sourcesResult.error) {
      setFundingSources([]);
      setErrorMessage(sourcesResult.error.message);
    } else {
      const assignedIds = ((managersResult.data ?? []) as FundingSourceManager[])
        .map((manager) => manager.funding_source_id)
        .filter(Boolean);

      setManagedFundingSourceIds(assignedIds);

      const activeSources = ((sourcesResult.data ?? []) as FundingSource[]).filter(
        (source) => source.is_active !== false && source.active !== false,
      );
      setFundingSources(
        canManagePayments(userRole)
          ? activeSources
          : activeSources.filter((source) => assignedIds.includes(source.id)),
      );
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
    const activityGroupIds = Array.from(
      new Set(
        requestRows
          .map((request) => request.activity_group_id)
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

    if (activityGroupIds.length > 0) {
      const { data: activityGroups } = await supabase
        .from("activity_groups")
        .select(activityGroupSelect)
        .in("id", activityGroupIds);

      const nextActivityGroups = (
        (activityGroups ?? []) as ActivityGroup[]
      ).reduce<Record<string, ActivityGroup>>((accumulator, group) => {
        accumulator[group.id] = group;
        return accumulator;
      }, {});

      setActivityGroupMap(nextActivityGroups);
    } else {
      setActivityGroupMap({});
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
      setActivityGroupMap({});
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
      setCurrentUserId(null);
      setManagedFundingSourceIds([]);
      setErrorMessage("Please sign in again before viewing payment requests.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

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

    await loadFundingSources(user.id, nextRole);

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
      groupRequestsByEntity(
        requests
          .filter((request) => request.status === "pending_payment")
          .sort((first, second) => {
            const firstDate =
              getRequestDisplayDate(first) || first.created_at || "";
            const secondDate =
              getRequestDisplayDate(second) || second.created_at || "";
            return firstDate.localeCompare(secondDate);
          }),
        merchantMap,
        activityGroupMap,
      ),
    [activityGroupMap, merchantMap, requests],
  );

  const paidYears = useMemo(
    () =>
      Array.from(
        new Set(
          requests
            .filter((request) => request.status === "paid")
            .map((request) => getRequestHistoryYear(request)),
        ),
      ).sort((first, second) => second.localeCompare(first)),
    [requests],
  );

  const paidGroups = useMemo(
    () =>
      groupRequestsByEntity(
        requests
          .filter(
            (request) =>
              request.status === "paid" &&
              (paidYearFilter === "all" ||
                getRequestHistoryYear(request) === paidYearFilter),
          )
          .sort((first, second) => {
            const firstDate =
              first.paid_at || getRequestDisplayDate(first) || first.created_at || "";
            const secondDate =
              second.paid_at ||
              getRequestDisplayDate(second) ||
              second.created_at ||
              "";
            return secondDate.localeCompare(firstDate);
          }),
        merchantMap,
        activityGroupMap,
      ).sort((first, second) => {
        const firstDate = getPaidGroupSummary(first).latestDate ?? "";
        const secondDate = getPaidGroupSummary(second).latestDate ?? "";
        return secondDate.localeCompare(firstDate);
      }),
    [activityGroupMap, merchantMap, paidYearFilter, requests],
  );

  const pendingMaterialsGroups = useMemo(
    () => pendingGroups.filter((group) => group.groupType === "materials"),
    [pendingGroups],
  );

  const pendingActivityGroups = useMemo(
    () => pendingGroups.filter((group) => group.groupType === "activities"),
    [pendingGroups],
  );

  const paidMaterialsGroups = useMemo(
    () => paidGroups.filter((group) => group.groupType === "materials"),
    [paidGroups],
  );

  const paidActivityGroups = useMemo(
    () => paidGroups.filter((group) => group.groupType === "activities"),
    [paidGroups],
  );

  const toggleRequest = (requestId: string) => {
    setSelectedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId],
    );
  };

  const toggleRequestGroup = (group: RequestGroup) => {
    const groupIds = group.requests.map((request) => request.id);
    const allSelected = groupIds.every((id) => selectedRequestIds.includes(id));

    setSelectedRequestIds((current) =>
      allSelected
        ? current.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current, ...groupIds])),
    );
  };

  const togglePaidGroup = (groupKey: string) => {
    setExpandedPaidGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
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

    if (
      !userIsGlobalManager &&
      !managedFundingSourceIds.includes(selectedFundingSourceId)
    ) {
      setErrorMessage("Select one of your assigned Funding Sources.");
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

    const selectedRequests = requests.filter((request) =>
      selectedRequestIds.includes(request.id),
    );
    const selectedFundingSource = fundingSourceMap[selectedFundingSourceId];
    const groupNames = Array.from(
      new Set(
        selectedRequests.map((request) =>
          getRequestGroupName(request, merchantMap, activityGroupMap),
        ),
      ),
    );

    await logPortalActivity({
      action: "mark_as_paid",
      entityType: "purchase_request",
      entityId: selectedRequestIds.join(","),
      summary: `Marked ${selectedRequestIds.length} purchase request${
        selectedRequestIds.length === 1 ? "" : "s"
      } as paid using ${selectedFundingSource?.name ?? "a Funding Source"}.`,
      metadata: {
        request_ids: selectedRequestIds,
        funding_source_id: selectedFundingSourceId,
        funding_source_name: selectedFundingSource?.name ?? null,
        group_names: groupNames,
        total_amount: getGroupTotal(selectedRequests),
        payment_note: trimmedNote || null,
      },
    });

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

    if (
      !userIsGlobalManager &&
      (!request.funding_source_id ||
        !managedFundingSourceIds.includes(request.funding_source_id))
    ) {
      setErrorMessage(
        "You can only undo payments made under your assigned Funding Sources.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to undo this payment for "${request.item_name}"? It will return the request to Pending Payment.`,
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

    await logPortalActivity({
      action: "undo_payment",
      entityType: "purchase_request",
      entityId: request.id,
      summary: `Undid payment for ${request.item_name}.`,
      metadata: {
        request_id: request.id,
        item_name: request.item_name,
        group_name: getRequestGroupName(request, merchantMap, activityGroupMap),
        merchant: isActivityRequest(request)
          ? null
          : getRequestMerchantName(request, merchantMap),
        activity_group: isActivityRequest(request)
          ? getRequestActivityGroupName(request, activityGroupMap)
          : null,
        activity_type: request.activity_type,
        activity_detail: request.activity_detail,
        funding_source_id: request.funding_source_id,
        funding_source_name: request.funding_source_id
          ? fundingSourceMap[request.funding_source_id]?.name ?? null
          : null,
        paid_at: request.paid_at,
        amount: request.estimated_cost,
        currency: request.currency,
      },
    });

    setSuccessMessage("Payment was undone and moved back to pending.");
    setUndoingRequestId(null);
    await loadRequests();
  };

  const renderGroupHeader = (group: RequestGroup) => (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          group.groupType === "materials"
            ? "border-brand/20 bg-brand-soft text-brand"
            : "border-cyan-200 bg-cyan-50 text-cyan-700"
        }`}
      >
        {group.groupType === "materials" ? "Materials" : "Activities"}
      </span>
      {group.groupType === "activities" ? (
        <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[0.72rem] font-semibold text-muted">
          {formatActivityType(group.activityType)}
        </span>
      ) : null}
      <span className="min-w-0 truncate text-lg font-semibold text-foreground">
        {getGroupLabel(group)}
      </span>
    </span>
  );

  const renderYearTabs = () => (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {["all", ...paidYears].map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => setPaidYearFilter(year)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              paidYearFilter === year
                ? "border-brand bg-brand text-white"
                : "border-line bg-white text-muted hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
            }`}
          >
            {year === "all" ? "All" : year}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <PortalShell
      title="Payment Tracker"
      description="Group Pending Payment items by Merchant or Activity Group and record Paid expenses."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Payment Tracker
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Pending Payments by Merchant and Activity Group
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
        Materials are grouped by Merchant. Activities are grouped by Activity
        Group so conferences, analyses, and lab activities stay easy to scan.
      </p>
      <p className="mt-2 max-w-3xl text-xs leading-6 text-muted">
        New merchants and activity groups are marked as Needs review until a
        professor/admin confirms the name.
      </p>

      {!loading && !userCanManagePayments ? (
        <div className="mt-6 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
          Payment controls are available only to professor/admin users or
          assigned project admins.
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
              {userIsGlobalManager
                ? "No Funding Sources have been created yet."
                : "No funding sources are assigned to you."}
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
              Pending Payments
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
          <div className="mt-5 grid gap-5">
            {[
              {
                title: "Pending Materials",
                groups: pendingMaterialsGroups,
                empty: "No pending materials.",
              },
              {
                title: "Pending Activities",
                groups: pendingActivityGroups,
                empty: "No pending activities.",
              },
            ].map((section) => (
              <section key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {section.title}
                </p>
                {section.groups.length === 0 ? (
                  <div className="mt-3 rounded-md border border-dashed border-line p-4 text-sm text-muted">
                    {section.empty}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-4">
            {section.groups.map((group) => {
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
                      <div className="mt-1">{renderGroupHeader(group)}</div>
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
                      onClick={() => toggleRequestGroup(group)}
                      className="mt-3 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                    >
                      {allSelected ? "Clear group selection" : "Select group items"}
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
                              <p className="mt-0.5 text-xs text-muted">
                                {formatDate(getRequestDisplayDate(request))}
                                {isActivityRequest(request) &&
                                request.activity_detail
                                  ? ` - ${request.activity_detail}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-md bg-brand-soft px-2 py-1 font-semibold capitalize text-brand">
                              {isActivityRequest(request)
                                ? formatActivityType(request.activity_type)
                                : request.cost_category || "uncategorized"}
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
              </section>
            ))}
          </div>
        ) : null}
      </section>

      {!loading && paidGroups.length > 0 ? (
        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Paid Request History
          </p>
          <h3 className="mt-2 text-2xl font-semibold">
            Paid request history
          </h3>
          {renderYearTabs()}
          <div className="mt-5 grid gap-5">
            {[
              {
                title: "Paid Materials",
                groups: paidMaterialsGroups,
                empty: "No paid materials yet.",
              },
              {
                title: "Paid Activities",
                groups: paidActivityGroups,
                empty: "No paid activities yet.",
              },
            ].map((section) => (
              <section key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {section.title}
                </p>
                {section.groups.length === 0 ? (
                  <div className="mt-3 rounded-md border border-dashed border-line p-4 text-sm text-muted">
                    {section.empty}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3">
            {section.groups.map((group) => (
              <article
                key={group.key}
                className="rounded-md border border-line bg-white/60"
              >
                <button
                  type="button"
                  onClick={() => togglePaidGroup(group.key)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-brand-soft/50"
                  aria-expanded={expandedPaidGroupKeys.includes(group.key)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold">
                      {expandedPaidGroupKeys.includes(group.key) ? "v" : ">"}
                      {" "}
                      <span className="inline-flex align-middle">
                        {renderGroupHeader(group)}
                      </span>
                    </h4>
                    <h4 className="hidden">
                      {group.groupType === "activities"
                        ? `${formatActivityType(group.activityType)} · ${group.groupName}`
                        : group.groupName}
                    </h4>
                    {group.needsReview ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                        Needs review
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-brand">
                    {group.requests.length} paid request
                    {group.requests.length === 1 ? "" : "s"} -{" "}
                    {getPaidGroupSummary(group).total}
                    {getPaidGroupSummary(group).latestDate
                      ? ` - latest ${formatDate(
                          getPaidGroupSummary(group).latestDate,
                        )}`
                      : ""}
                  </p>
                </button>

                {expandedPaidGroupKeys.includes(group.key) ? (
                <div className="grid gap-1.5 border-t border-line px-2.5 py-2">
                  {group.requests.map((request) => (
                    <div
                      key={request.id}
                      className="grid gap-2 rounded-md bg-[#f7f9fb] px-2.5 py-1.5 text-[0.78rem] text-muted lg:grid-cols-[0.7fr_minmax(0,1.5fr)_auto_auto_auto] lg:items-center"
                    >
                      <p className="font-medium">
                        {formatDate(getRequestDisplayDate(request))}
                      </p>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {request.item_name}
                        </p>
                        <p className="mt-0.5 truncate">
                          {getRequesterLabel(
                            requesterProfiles[request.requester_id],
                            request.requester_id,
                          )}
                        </p>
                        {isActivityRequest(request) &&
                        request.activity_detail ? (
                          <p className="mt-0.5 truncate">
                            Detail: {request.activity_detail}
                          </p>
                        ) : null}
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
                        {userCanManagePayments &&
                        request.status === "paid" &&
                        (userIsGlobalManager ||
                          Boolean(
                            request.funding_source_id &&
                              managedFundingSourceIds.includes(
                                request.funding_source_id,
                              ),
                          )) ? (
                          <button
                            type="button"
                            disabled={undoingRequestId === request.id}
                            onClick={() => void handleUndoPayment(request)}
                            className="rounded-md border border-line bg-white px-2 py-0.5 text-[0.72rem] font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {undoingRequestId === request.id
                              ? "Undoing..."
                              : "Undo"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                ) : null}
              </article>
            ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && paidGroups.length === 0 && !errorMessage ? (
        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Paid Request History
          </p>
          <div className="portal-card mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
            No paid requests yet.
          </div>
        </section>
      ) : null}
    </PortalShell>
  );
}
