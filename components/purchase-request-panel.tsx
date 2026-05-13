"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { FundingSourceStatusSummary } from "@/components/funding-source-status-summary";
import { logPortalActivity } from "@/lib/portal-activity";
import { supabase } from "@/lib/supabase/client";

type CostCategory = "materials" | "activities";

type RequestKind = "materials" | "activities";

type ActivityType = "conference" | "analysis" | "other";

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

type FundingSource = {
  id: string;
  name: string;
};

type ActivityGroup = {
  id: string;
  name: string;
  normalized_name: string;
  activity_type: ActivityType | string | null;
  is_active: boolean | null;
  needs_review: boolean | null;
  note: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PurchaseRequest = {
  id: string;
  requester_id: string;
  request_kind: RequestKind | string | null;
  merchant: string | null;
  merchant_id: string | null;
  activity_type: ActivityType | string | null;
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

type RequestGroup = {
  key: string;
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

type PurchaseRequestForm = {
  requestKind: RequestKind;
  requestDate: string;
  itemName: string;
  costCategory: CostCategory;
  activityType: ActivityType;
  activityDetail: string;
  estimatedCost: string;
  currency: string;
  purpose: string;
  paymentNote: string;
  itemUrl: string;
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialForm(): PurchaseRequestForm {
  return {
    requestKind: "materials",
    requestDate: todayInputValue(),
    itemName: "",
    costCategory: "materials",
    activityType: "conference",
    activityDetail: "",
    estimatedCost: "",
    currency: "KRW",
    purpose: "",
    paymentNote: "",
    itemUrl: "",
  };
}

const initialForm: PurchaseRequestForm = getInitialForm();

const activityGroupSelect =
  "id, name, normalized_name, activity_type, is_active, needs_review, note, created_by, created_at, updated_at";

const merchantSelect =
  "id, name, normalized_name, website, note, is_active, needs_review, created_by, created_at, updated_at";

const requestSelect =
  "id, requester_id, request_kind, merchant, merchant_id, activity_type, activity_group_name, activity_group_id, request_date, activity_detail, item_name, cost_category, item_url, purpose, estimated_cost, currency, status, payment_note, funding_source_id, requested_at, paid_at, created_at, updated_at";

const fundingSourceSelect = "id, name";

const inactiveMerchantMessage =
  "This merchant exists but is inactive. Please ask an admin to reactivate or rename it.";

const inactiveActivityGroupMessage =
  "This activity group exists but is inactive. Please ask an admin to reactivate or rename it.";

const activityTypeOptions: ActivityType[] = ["conference", "analysis", "other"];

const activityItemExamples =
  "registration_fee, flight, accommodation, meal, analysis_fee, other";

function normalizeRecordName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeMerchantName(value: string) {
  return normalizeRecordName(value);
}

function normalizeActivityGroupName(value: string) {
  return normalizeRecordName(value);
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

function formatGroupTotal(requests: PurchaseRequest[]) {
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

function getGroupLabel(group: RequestGroup) {
  return group.groupName;
}

function getRequestSortDate(request: PurchaseRequest) {
  return request.paid_at || request.request_date || request.requested_at || request.created_at;
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
    total: formatGroupTotal(group.requests) || "0 KRW",
  };
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
  const [highlightedMerchantIndex, setHighlightedMerchantIndex] = useState(0);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantMap, setMerchantMap] = useState<Record<string, Merchant>>({});
  const [activityGroupSearch, setActivityGroupSearch] = useState("");
  const [selectedActivityGroup, setSelectedActivityGroup] =
    useState<ActivityGroup | null>(null);
  const [activityGroupDropdownOpen, setActivityGroupDropdownOpen] =
    useState(false);
  const [activityGroups, setActivityGroups] = useState<ActivityGroup[]>([]);
  const [activityGroupMap, setActivityGroupMap] = useState<
    Record<string, ActivityGroup>
  >({});
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [activityGroupsLoading, setActivityGroupsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addingMerchant, setAddingMerchant] = useState(false);
  const [addingActivityGroup, setAddingActivityGroup] = useState(false);
  const [cancelingRequestId, setCancelingRequestId] = useState<string | null>(
    null,
  );
  const [fundingStatusRefreshKey, setFundingStatusRefreshKey] = useState(0);
  const [expandedPaidGroupKeys, setExpandedPaidGroupKeys] = useState<string[]>(
    [],
  );
  const [paidYearFilter, setPaidYearFilter] = useState("all");

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

  const loadActivityGroups = useCallback(async () => {
    setActivityGroupsLoading(true);

    const { data, error } = await supabase
      .from("activity_groups")
      .select(activityGroupSelect)
      .eq("is_active", true)
      .order("activity_type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setSubmitError(error.message);
      setActivityGroups([]);
    } else {
      const nextGroups = (data ?? []) as ActivityGroup[];
      setActivityGroups(nextGroups);
      setActivityGroupMap((current) => {
        const nextMap = { ...current };
        nextGroups.forEach((group) => {
          nextMap[group.id] = group;
        });
        return nextMap;
      });
    }

    setActivityGroupsLoading(false);
  }, []);

  const loadFundingSources = useCallback(async () => {
    const { data } = await supabase
      .from("funding_sources")
      .select(fundingSourceSelect)
      .order("name", { ascending: true });

    setFundingSources((data ?? []) as FundingSource[]);
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

  const loadRequestActivityGroups = useCallback(
    async (requestRows: PurchaseRequest[]) => {
      const groupIds = Array.from(
        new Set(
          requestRows
            .map((request) => request.activity_group_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (groupIds.length === 0) {
        return;
      }

      const { data } = await supabase
        .from("activity_groups")
        .select(activityGroupSelect)
        .in("id", groupIds);

      const nextGroups = (data ?? []) as ActivityGroup[];

      setActivityGroupMap((current) => {
        const nextMap = { ...current };
        nextGroups.forEach((group) => {
          nextMap[group.id] = group;
        });
        return nextMap;
      });
    },
    [],
  );

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
      await loadRequestActivityGroups(nextRequests);
    }

    setRequestsLoading(false);
  }, [loadRequestActivityGroups, loadRequestMerchants]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMerchants();
      void loadActivityGroups();
      void loadFundingSources();
      void loadRequests();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadActivityGroups, loadFundingSources, loadMerchants, loadRequests]);

  const filteredMerchants = useMemo(() => {
    const search = merchantSearch.trim().toLowerCase();
    const normalizedSearch = normalizeMerchantName(merchantSearch);

    if (!search) {
      return merchants;
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

  const filteredActivityGroups = useMemo(() => {
    const search = activityGroupSearch.trim().toLowerCase();
    const normalizedSearch = normalizeActivityGroupName(activityGroupSearch);

    return activityGroups
      .filter((group) => group.activity_type === form.activityType)
      .filter((group) =>
        search
          ? group.name.toLowerCase().includes(search) ||
            group.normalized_name.includes(normalizedSearch)
          : true,
      )
      .slice(0, search ? 8 : 6);
  }, [activityGroupSearch, activityGroups, form.activityType]);

  const searchedActivityNormalizedName =
    normalizeActivityGroupName(activityGroupSearch);
  const exactActivityGroupExists = activityGroups.some(
    (group) =>
      group.activity_type === form.activityType &&
      group.normalized_name === searchedActivityNormalizedName,
  );
  const canAddActivityGroup =
    activityGroupSearch.trim().length > 0 &&
    searchedActivityNormalizedName.length > 0 &&
    !exactActivityGroupExists;

  const updateForm = <Field extends keyof PurchaseRequestForm>(
    field: Field,
    value: PurchaseRequestForm[Field],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const switchRequestKind = (requestKind: RequestKind) => {
    setForm((current) => ({
      ...current,
      requestKind,
      costCategory: requestKind,
    }));
    setSubmitError("");
    setSuccessMessage("");
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
    setHighlightedMerchantIndex(0);

    if (selectedMerchant && selectedMerchant.name !== value) {
      setSelectedMerchant(null);
    }
  };

  const handleMerchantKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMerchantDropdownOpen(true);
      setHighlightedMerchantIndex((current) =>
        Math.min(current + 1, Math.max(filteredMerchants.length - 1, 0)),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMerchantDropdownOpen(true);
      setHighlightedMerchantIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter" && merchantDropdownOpen) {
      const highlightedMerchant = filteredMerchants[highlightedMerchantIndex];

      if (highlightedMerchant) {
        event.preventDefault();
        selectMerchant(highlightedMerchant);
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMerchantDropdownOpen(false);
    }
  };

  const clearSelectedMerchant = () => {
    setSelectedMerchant(null);
    setMerchantSearch("");
    setMerchantDropdownOpen(true);
  };

  const selectActivityGroup = (group: ActivityGroup, message?: string) => {
    setSelectedActivityGroup(group);
    setActivityGroupSearch(group.name);
    setActivityGroupDropdownOpen(false);
    setSuccessMessage(message ?? "");
    setSubmitError("");
  };

  const handleActivityGroupSearchChange = (value: string) => {
    setActivityGroupSearch(value);
    setActivityGroupDropdownOpen(true);

    if (selectedActivityGroup && selectedActivityGroup.name !== value) {
      setSelectedActivityGroup(null);
    }
  };

  const clearSelectedActivityGroup = () => {
    setSelectedActivityGroup(null);
    setActivityGroupSearch("");
    setActivityGroupDropdownOpen(true);
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

    const activeMerchant = merchants.find(
      (merchant) => merchant.normalized_name === normalizedName,
    );

    if (activeMerchant) {
      selectMerchant(activeMerchant, "Using existing merchant record.");
      setAddingMerchant(false);
      return;
    }

    const { data: existingMerchant } = await supabase
      .from("merchants")
      .select(merchantSelect)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (existingMerchant) {
      const merchant = existingMerchant as Merchant;

      if (merchant.is_active === false) {
        setSelectedMerchant(null);
        setSubmitError(inactiveMerchantMessage);
        setAddingMerchant(false);
        return;
      }

      selectMerchant(merchant, "Using existing merchant record.");
      setAddingMerchant(false);
      return;
    }

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

    const { data: matchingActiveMerchant } = await supabase
      .from("merchants")
      .select(merchantSelect)
      .eq("normalized_name", normalizedName)
      .eq("is_active", true)
      .maybeSingle();

    if (matchingActiveMerchant) {
      const merchant = matchingActiveMerchant as Merchant;
      setMerchantMap((current) => ({
        ...current,
        [merchant.id]: merchant,
      }));
      selectMerchant(merchant, "Using existing merchant record.");
      setAddingMerchant(false);
      return;
    }

    const { data: conflictingMerchant } = await supabase
        .from("merchants")
        .select(merchantSelect)
        .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (conflictingMerchant) {
      const merchant = conflictingMerchant as Merchant;

      if (merchant.is_active === false) {
        setSelectedMerchant(null);
        setSubmitError(inactiveMerchantMessage);
        setAddingMerchant(false);
        return;
      }

      setMerchantMap((current) => ({
        ...current,
        [merchant.id]: merchant,
      }));
      selectMerchant(merchant, "Using existing merchant record.");
      setAddingMerchant(false);
      return;
    }

    if (error?.message.toLowerCase().includes("duplicate")) {
      setSubmitError(inactiveMerchantMessage);
    } else {
      setSubmitError(
        error?.message ?? "Could not add this merchant. Please try again.",
      );
    }
    setAddingMerchant(false);
  };

  const handleAddActivityGroup = async () => {
    const name = activityGroupSearch.trim();
    const normalizedName = normalizeActivityGroupName(name);
    const activityType = form.activityType;

    if (!name || !normalizedName) {
      setSubmitError("Enter an activity group name before adding it.");
      return;
    }

    setAddingActivityGroup(true);
    setSubmitError("");
    setSuccessMessage("");

    const activeGroup = activityGroups.find(
      (group) =>
        group.activity_type === activityType &&
        group.normalized_name === normalizedName,
    );

    if (activeGroup) {
      selectActivityGroup(activeGroup, "Using existing activity group record.");
      setAddingActivityGroup(false);
      return;
    }

    const { data: existingGroup } = await supabase
      .from("activity_groups")
      .select(activityGroupSelect)
      .eq("activity_type", activityType)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (existingGroup) {
      const group = existingGroup as ActivityGroup;

      if (group.is_active === false) {
        setSelectedActivityGroup(null);
        setSubmitError(inactiveActivityGroupMessage);
        setAddingActivityGroup(false);
        return;
      }

      selectActivityGroup(group, "Using existing activity group record.");
      setAddingActivityGroup(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError("Please sign in again before adding an activity group.");
      setAddingActivityGroup(false);
      return;
    }

    const { data, error } = await supabase
      .from("activity_groups")
      .insert({
        name,
        normalized_name: normalizedName,
        activity_type: activityType,
        is_active: true,
        needs_review: true,
        created_by: user.id,
      })
      .select(activityGroupSelect)
      .single();

    if (!error && data) {
      const newGroup = data as ActivityGroup;
      setActivityGroups((current) => [...current, newGroup]);
      setActivityGroupMap((current) => ({
        ...current,
        [newGroup.id]: newGroup,
      }));
      selectActivityGroup(newGroup, "New activity group added and selected.");
      setAddingActivityGroup(false);
      return;
    }

    await loadActivityGroups();

    const { data: matchingActiveGroup } = await supabase
      .from("activity_groups")
      .select(activityGroupSelect)
      .eq("activity_type", activityType)
      .eq("normalized_name", normalizedName)
      .eq("is_active", true)
      .maybeSingle();

    if (matchingActiveGroup) {
      const group = matchingActiveGroup as ActivityGroup;
      setActivityGroupMap((current) => ({
        ...current,
        [group.id]: group,
      }));
      selectActivityGroup(group, "Using existing activity group record.");
      setAddingActivityGroup(false);
      return;
    }

    const { data: conflictingGroup } = await supabase
      .from("activity_groups")
      .select(activityGroupSelect)
      .eq("activity_type", activityType)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (conflictingGroup) {
      const group = conflictingGroup as ActivityGroup;

      if (group.is_active === false) {
        setSelectedActivityGroup(null);
        setSubmitError(inactiveActivityGroupMessage);
        setAddingActivityGroup(false);
        return;
      }

      setActivityGroupMap((current) => ({
        ...current,
        [group.id]: group,
      }));
      selectActivityGroup(group, "Using existing activity group record.");
      setAddingActivityGroup(false);
      return;
    }

    if (error?.message.toLowerCase().includes("duplicate")) {
      setSubmitError(inactiveActivityGroupMessage);
    } else {
      setSubmitError(
        error?.message ?? "Could not add this activity group. Please try again.",
      );
    }
    setAddingActivityGroup(false);
  };

  const getRequestMerchantName = (request: PurchaseRequest) => {
    if (request.merchant_id && merchantMap[request.merchant_id]) {
      return merchantMap[request.merchant_id].name;
    }

    return request.merchant || "Unknown merchant";
  };

  const getRequestMerchantNeedsReview = (request: PurchaseRequest) => {
    if (!request.merchant_id) {
      return false;
    }

    return Boolean(merchantMap[request.merchant_id]?.needs_review);
  };

  const getRequestActivityGroupName = (request: PurchaseRequest) => {
    if (
      request.activity_group_id &&
      activityGroupMap[request.activity_group_id]
    ) {
      return activityGroupMap[request.activity_group_id].name;
    }

    return request.activity_group_name || request.merchant || "Unknown activity";
  };

  const getRequestActivityNeedsReview = (request: PurchaseRequest) => {
    if (!request.activity_group_id) {
      return false;
    }

    return Boolean(activityGroupMap[request.activity_group_id]?.needs_review);
  };

  const getRequestGroupName = (request: PurchaseRequest) =>
    isActivityRequest(request)
      ? getRequestActivityGroupName(request)
      : getRequestMerchantName(request);

  const getRequestDisplayDate = (request: PurchaseRequest) =>
    request.request_date || request.requested_at;

  const createRequestGroups = (items: PurchaseRequest[]) => {
    const grouped = items.reduce<Record<string, RequestGroup>>(
      (accumulator, request) => {
        const activity = isActivityRequest(request);
        const groupName = getRequestGroupName(request);
        const fallbackKey =
          (activity
            ? normalizeActivityGroupName(groupName)
            : normalizeMerchantName(groupName)) || "unknown";
        const activityType = request.activity_type || "other";
        const key = activity
          ? request.activity_group_id
            ? `activity:${activityType}:${request.activity_group_id}`
            : `activity:${activityType}:text:${fallbackKey}`
          : request.merchant_id
            ? `merchant:${request.merchant_id}`
            : `merchant:text:${fallbackKey}`;

        accumulator[key] ??= {
          key,
          groupName,
          groupType: activity ? "activities" : "materials",
          activityType,
          needsReview: activity
            ? getRequestActivityNeedsReview(request)
            : getRequestMerchantNeedsReview(request),
          requests: [],
        };
        accumulator[key].requests.push(request);
        return accumulator;
      },
      {},
    );

    return Object.values(grouped).map((group) => ({
      ...group,
      requests: [...group.requests].sort((first, second) => {
        const firstDate = getRequestDisplayDate(first) || first.created_at || "";
        const secondDate = getRequestDisplayDate(second) || second.created_at || "";
        return firstDate.localeCompare(secondDate);
      }),
    }));
  };

  const pendingGroups = useMemo(
    () =>
      createRequestGroups(
        requests.filter((request) => request.status === "pending_payment"),
      ),
    // createRequestGroups intentionally depends on relation maps through helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      createRequestGroups(
        requests.filter(
          (request) =>
            request.status === "paid" &&
            (paidYearFilter === "all" ||
              getRequestHistoryYear(request) === paidYearFilter),
        ),
      )
        .map((group) => ({
          ...group,
          requests: [...group.requests].sort((first, second) => {
            const firstDate =
              first.paid_at || getRequestDisplayDate(first) || first.created_at || "";
            const secondDate =
              second.paid_at ||
              getRequestDisplayDate(second) ||
              second.created_at ||
              "";
            return secondDate.localeCompare(firstDate);
          }),
        }))
        .sort((first, second) => {
          const firstDate = getPaidGroupSummary(first).latestDate ?? "";
          const secondDate = getPaidGroupSummary(second).latestDate ?? "";
          return secondDate.localeCompare(firstDate);
        }),
    // createRequestGroups intentionally depends on relation maps through helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const togglePaidGroup = (groupKey: string) => {
    setExpandedPaidGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((key) => key !== groupKey)
        : [...current, groupKey],
    );
  };

  const handleCancelRequest = async (request: PurchaseRequest) => {
    setSubmitError("");
    setSuccessMessage("");

    if (request.status !== "pending_payment") {
      setSubmitError("Only pending payment requests can be canceled.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this Pending Payment request "${request.item_name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setCancelingRequestId(request.id);

    await logPortalActivity({
      action: "delete_purchase_request",
      entityType: "purchase_request",
      entityId: request.id,
      summary: `Deleted pending purchase request: ${request.item_name}.`,
      metadata: {
        item_name: request.item_name,
        group_name: getRequestGroupName(request),
        merchant: isActivityRequest(request) ? null : getRequestMerchantName(request),
        activity_group: isActivityRequest(request)
          ? getRequestActivityGroupName(request)
          : null,
        activity_type: request.activity_type,
        activity_detail: request.activity_detail,
        amount: request.estimated_cost,
        currency: request.currency,
        purpose: request.purpose,
        status: request.status,
        cost_category: request.cost_category,
        item_url: request.item_url,
        payment_note: request.payment_note,
      },
    });

    const { error } = await supabase
      .from("purchase_requests")
      .delete()
      .eq("id", request.id);

    if (error) {
      setSubmitError(error.message);
      setCancelingRequestId(null);
      return;
    }

    setSuccessMessage("Pending purchase request deleted.");
    setFundingStatusRefreshKey((current) => current + 1);
    setCancelingRequestId(null);
    await loadRequests();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    const itemName = form.itemName.trim();
    const purpose = form.purpose.trim();
    const estimatedCost = Number(form.estimatedCost);
    const isActivity = form.requestKind === "activities";
    const requestDate = form.requestDate || todayInputValue();

    if (!isActivity && !selectedMerchant) {
      setSubmitError("Select or add a merchant before submitting.");
      return;
    }

    if (isActivity && !selectedActivityGroup) {
      setSubmitError("Select or add an activity group before submitting.");
      return;
    }

    let submissionMerchant: Merchant | null = null;
    let submissionActivityGroup: ActivityGroup | null = null;

    if (!isActivity && selectedMerchant) {
      const { data: currentMerchant, error: merchantError } = await supabase
        .from("merchants")
        .select(merchantSelect)
        .eq("id", selectedMerchant.id)
        .maybeSingle();

      if (merchantError || !currentMerchant) {
        setSubmitError("Please select the merchant again before submitting.");
        return;
      }

      submissionMerchant = currentMerchant as Merchant;

      if (submissionMerchant.is_active === false) {
        setSelectedMerchant(null);
        setSubmitError(inactiveMerchantMessage);
        return;
      }
    }

    if (isActivity && selectedActivityGroup) {
      const { data: currentActivityGroup, error: activityGroupError } =
        await supabase
          .from("activity_groups")
          .select(activityGroupSelect)
          .eq("id", selectedActivityGroup.id)
          .maybeSingle();

      if (activityGroupError || !currentActivityGroup) {
        setSubmitError("Please select the activity group again before submitting.");
        return;
      }

      submissionActivityGroup = currentActivityGroup as ActivityGroup;

      if (submissionActivityGroup.is_active === false) {
        setSelectedActivityGroup(null);
        setSubmitError(inactiveActivityGroupMessage);
        return;
      }
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
      request_kind: form.requestKind,
      request_date: requestDate,
      merchant_id: submissionMerchant?.id ?? null,
      merchant: submissionMerchant?.name ?? null,
      activity_group_id: submissionActivityGroup?.id ?? null,
      activity_group_name: submissionActivityGroup?.name ?? null,
      activity_type: isActivity
        ? submissionActivityGroup?.activity_type ?? form.activityType
        : null,
      activity_detail: isActivity ? form.activityDetail.trim() || null : null,
      item_name: itemName,
      cost_category: form.requestKind,
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

    setForm(getInitialForm());
    setMerchantSearch("");
    setSelectedMerchant(null);
    setActivityGroupSearch("");
    setSelectedActivityGroup(null);
    setSuccessMessage("Purchase request created as a Pending Payment item.");
    setFundingStatusRefreshKey((current) => current + 1);
    setSubmitting(false);
    await loadRequests();
  };

  const renderGroupHeader = (group: RequestGroup, compactName = false) => (
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
      <span
        className={`min-w-0 truncate font-semibold text-foreground ${
          compactName ? "text-sm sm:text-base" : "text-lg"
        }`}
      >
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
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Payment Request
      </p>
      <h2 className="mt-4 break-words text-2xl font-semibold sm:text-3xl">
        Submit a Pending Payment request
      </h2>
      <p className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted">
        Materials use Merchant records. Activities use Activity Groups such as
        a conference, analysis facility, or lab event so payments can be grouped
        cleanly later.
      </p>

      <form
        onSubmit={handleSubmit}
        className="portal-card mt-6 rounded-lg border border-line p-4 shadow-panel sm:mt-8 sm:p-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-wrap gap-2 md:col-span-2">
            {(["materials", "activities"] as RequestKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => switchRequestKind(kind)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  form.requestKind === kind
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-muted hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                }`}
              >
                {kind === "materials" ? "Materials Request" : "Activity Request"}
              </button>
            ))}
          </div>

          <label className="grid gap-2">
            <FieldLabel>Request date</FieldLabel>
            <input
              type="date"
              value={form.requestDate}
              onChange={(event) =>
                updateForm("requestDate", event.target.value)
              }
              className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
            />
          </label>

          {form.requestKind === "materials" ? (
          <div className="grid gap-2 md:col-span-2">
            <FieldLabel required>Merchant</FieldLabel>
            <div className="relative">
              <input
                required
                value={merchantSearch}
                role="combobox"
                aria-controls="merchant-options"
                aria-expanded={merchantDropdownOpen}
                aria-autocomplete="list"
                onFocus={() => {
                  setMerchantDropdownOpen(true);
                  setHighlightedMerchantIndex(0);
                }}
                onBlur={() => {
                  window.setTimeout(() => setMerchantDropdownOpen(false), 120);
                }}
                onChange={(event) =>
                  handleMerchantSearchChange(event.target.value)
                }
                onKeyDown={handleMerchantKeyDown}
                className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
                placeholder="Search existing merchants"
              />

              {merchantDropdownOpen ? (
                <div
                  id="merchant-options"
                  className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-md border border-line bg-white p-2 shadow-panel"
                >
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
                      {filteredMerchants.map((merchant, index) => (
                        <button
                          key={merchant.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setHighlightedMerchantIndex(index)}
                          onClick={() => selectMerchant(merchant)}
                          className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                            selectedMerchant?.id === merchant.id ||
                            highlightedMerchantIndex === index
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
          ) : (
          <div className="grid gap-2 md:col-span-2">
            <FieldLabel required>Activity group</FieldLabel>
            <div className="grid gap-3 md:grid-cols-[0.35fr_1fr]">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted">
                  Activity type
                </span>
                <select
                  value={form.activityType}
                  onChange={(event) => {
                    updateForm("activityType", event.target.value as ActivityType);
                    setSelectedActivityGroup(null);
                    setActivityGroupSearch("");
                  }}
                  className="rounded-md border border-line bg-white px-3 py-2.5 text-sm capitalize outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
                >
                  {activityTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {formatActivityType(type)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="relative">
                <input
                  required
                  value={activityGroupSearch}
                  onFocus={() => setActivityGroupDropdownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(
                      () => setActivityGroupDropdownOpen(false),
                      120,
                    );
                  }}
                  onChange={(event) =>
                    handleActivityGroupSearchChange(event.target.value)
                  }
                  className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
                  placeholder="Search existing activity groups"
                />

                {activityGroupDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-md border border-line bg-white p-2 shadow-panel">
                    {activityGroupsLoading ? (
                      <p className="px-3 py-2 text-sm text-muted">
                        Loading activity groups...
                      </p>
                    ) : null}

                    {!activityGroupsLoading &&
                    filteredActivityGroups.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-muted">
                        No matching activity groups found.
                      </p>
                    ) : null}

                    {!activityGroupsLoading &&
                    filteredActivityGroups.length > 0 ? (
                      <div className="grid gap-1">
                        {filteredActivityGroups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectActivityGroup(group)}
                            className={`rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                              selectedActivityGroup?.id === group.id
                                ? "bg-brand-soft text-brand"
                                : "text-muted hover:bg-brand-soft hover:text-foreground"
                            }`}
                          >
                            <span>{group.name}</span>
                            <span className="ml-2 text-xs font-medium text-muted">
                              {formatActivityType(group.activity_type)}
                            </span>
                            {group.needs_review ? (
                              <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                                Needs review
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {canAddActivityGroup ? (
                      <button
                        type="button"
                        disabled={addingActivityGroup}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => void handleAddActivityGroup()}
                        className="mt-2 w-full rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-left text-sm font-semibold text-brand transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {addingActivityGroup
                          ? "Adding activity group..."
                          : `Add new activity group: ${activityGroupSearch.trim()}`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {selectedActivityGroup ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">
                  {selectedActivityGroup.name}
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-muted">
                    {formatActivityType(selectedActivityGroup.activity_type)}
                  </span>
                  {selectedActivityGroup.needs_review ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                      Needs review
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={clearSelectedActivityGroup}
                    className="ml-1 rounded-full px-1 text-brand transition hover:bg-white"
                    aria-label="Clear selected activity group"
                  >
                    x
                  </button>
                </span>
              </div>
            ) : null}

            <p className="text-xs leading-6 text-muted">
              New activity groups are marked as Needs review until a
              professor/admin confirms the group name.
            </p>
            {!selectedActivityGroup ? (
              <p className="text-xs font-medium text-accent">
                Select an existing activity group or add a new one before
                submitting.
              </p>
            ) : null}
          </div>
          )}

          <label className="grid gap-2">
            <FieldLabel required>Item name</FieldLabel>
            <input
              required
              value={form.itemName}
              onChange={(event) => updateForm("itemName", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
              placeholder={
                form.requestKind === "activities"
                  ? activityItemExamples
                  : "e.g., Gas sensor substrate"
              }
            />
          </label>

          {form.requestKind === "activities" ? (
            <label className="grid gap-2">
              <FieldLabel>Activity detail</FieldLabel>
              <input
                value={form.activityDetail}
                onChange={(event) =>
                  updateForm("activityDetail", event.target.value)
                }
                className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
                placeholder="e.g., Daegu->Jeju (LSY)"
              />
            </label>
          ) : null}

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
              className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
              placeholder="0"
            />
          </label>

          <label className="grid gap-2">
            <FieldLabel>Currency</FieldLabel>
            <input
              value={form.currency}
              onChange={(event) => updateForm("currency", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
              placeholder="KRW"
            />
          </label>

          <label className="grid gap-2 md:col-span-2">
            <FieldLabel>Item URL</FieldLabel>
            <input
              type="url"
              value={form.itemUrl}
              onChange={(event) => updateForm("itemUrl", event.target.value)}
              className="rounded-md border border-line bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:shadow-sm sm:px-4 sm:py-3"
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
            className="min-h-24 rounded-md border border-line bg-white px-3 py-2.5 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm sm:min-h-28 sm:px-4 sm:py-3"
            placeholder="Briefly explain why this item is needed for lab work."
          />
        </label>

        <label className="mt-5 grid gap-2">
          <FieldLabel>Comment / note</FieldLabel>
          <textarea
            value={form.paymentNote}
            onChange={(event) => updateForm("paymentNote", event.target.value)}
            className="min-h-20 rounded-md border border-line bg-white px-3 py-2.5 text-sm leading-7 outline-none transition focus:border-brand focus:shadow-sm sm:min-h-24 sm:px-4 sm:py-3"
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
            className="action-button action-button-primary w-full rounded-md bg-brand px-6 py-3 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
            <h3 className="mt-3 text-xl font-semibold sm:text-2xl">
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

        {!requestsLoading &&
        !requestsError &&
        pendingGroups.length === 0 &&
        paidGroups.length === 0 ? (
          <div className="portal-card mt-6 rounded-md border border-dashed border-line p-8 text-center text-sm text-muted">
            No purchase requests yet.
          </div>
        ) : null}

        {!requestsLoading && !requestsError && pendingGroups.length > 0 ? (
          <div className="mt-6 grid gap-5">
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
            {section.groups.map((group) => (
              <article
                key={group.key}
                className="elevated-card portal-card border border-line p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                        Pending
                      </p>
                      {group.needsReview ? (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                          Needs review
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1">{renderGroupHeader(group)}</div>
                  </div>
                  <p className="rounded-md bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
                    {formatGroupTotal(group.requests)}
                  </p>
                </div>

                <div className="mt-3 grid gap-2">
                  {group.requests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-md border border-line/70 bg-white/80 p-3 text-sm"
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_auto_auto] lg:items-start">
                        <div className="min-w-0">
                          <p className="break-words font-semibold lg:truncate">
                            {request.item_name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatDate(getRequestDisplayDate(request))} -{" "}
                            {formatStatus(request.status)}
                          </p>
                          {isActivityRequest(request) && request.activity_detail ? (
                            <p className="mt-0.5 break-words text-xs text-muted">
                              {request.activity_detail}
                            </p>
                          ) : null}
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
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {request.item_url ? (
                            <a
                              href={request.item_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-brand transition hover:text-foreground"
                            >
                              Item URL
                            </a>
                          ) : null}
                          <button
                            type="button"
                            disabled={cancelingRequestId === request.id}
                            onClick={() => void handleCancelRequest(request)}
                            className="rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancelingRequestId === request.id
                              ? "Deleting..."
                              : "Cancel Request"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 grid gap-1 text-xs leading-5 text-muted lg:grid-cols-2">
                        <p>
                          <span className="font-semibold text-foreground">
                            Purpose:
                          </span>{" "}
                          <span className="break-words">{request.purpose}</span>
                        </p>
                        {request.payment_note ? (
                          <p>
                            <span className="font-semibold text-foreground">
                              Note:
                            </span>{" "}
                            <span className="break-words">
                              {request.payment_note}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {!requestsLoading && !requestsError && paidGroups.length > 0 ? (
          <section className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Paid Requests
            </p>
            {renderYearTabs()}
            <div className="mt-4 grid gap-5">
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
              {section.groups.map((group) => {
                const expanded = expandedPaidGroupKeys.includes(group.key);
                const summary = getPaidGroupSummary(group);

                return (
                <article
                  key={group.key}
                  className="rounded-md border border-line bg-white/65"
                >
                  <button
                    type="button"
                    onClick={() => togglePaidGroup(group.key)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-brand-soft/50"
                    aria-expanded={expanded}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-brand">
                        {expanded ? "v" : ">"}
                      </span>
                      <div className="min-w-0">{renderGroupHeader(group, true)}</div>
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
                      {group.requests.length === 1 ? "" : "s"} - {summary.total}
                      {summary.latestDate
                        ? ` - latest ${formatDate(summary.latestDate)}`
                        : ""}
                    </p>
                  </button>

                  {expanded ? (
                  <div className="grid gap-1.5 border-t border-line px-2.5 py-2">
                    {group.requests.map((request) => (
                      <div
                        key={request.id}
                        className="grid gap-2 rounded-md bg-[#f7f9fb] px-2.5 py-1.5 text-xs text-muted lg:grid-cols-[0.7fr_minmax(0,1.5fr)_auto_auto_auto] lg:items-center"
                      >
                        <p className="font-medium">
                          {formatDate(getRequestDisplayDate(request))}
                        </p>
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-foreground lg:truncate">
                            {request.item_name}
                          </p>
                          {isActivityRequest(request) && request.activity_detail ? (
                            <p className="mt-0.5 truncate text-muted">
                              Detail: {request.activity_detail}
                            </p>
                          ) : null}
                          {request.payment_note ? (
                            <p className="mt-0.5 truncate text-muted">
                              Note: {request.payment_note}
                            </p>
                          ) : null}
                        </div>
                        <p className="font-semibold">
                          {formatCost(request.estimated_cost, request.currency)}
                        </p>
                        <p>
                          {request.funding_source_id
                            ? fundingSourceMap[request.funding_source_id]
                                ?.name ?? "Funding Source assigned"
                            : "No Funding Source"}
                        </p>
                        <p>{formatDate(request.paid_at)}</p>
                      </div>
                    ))}
                  </div>
                  ) : null}
                </article>
                );
              })}
                  </div>
                </section>
              ))}
            </div>
          </section>
        ) : null}

      </section>

      <FundingSourceStatusSummary
        className="mt-10"
        emptyMessage="No active funding sources are available."
        refreshKey={fundingStatusRefreshKey}
      />
    </div>
  );
}
