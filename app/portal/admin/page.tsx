"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PortalShell } from "@/components/portal-shell";
import { logPortalActivity } from "@/lib/portal-activity";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSource = {
  id: string;
  name: string;
  funding_agency: string | null;
  project_code: string | null;
  project_title: string | null;
  description: string | null;
  currency: string | null;
  materials_budget: number | null;
  activities_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  finished_at: string | null;
  is_active: boolean | null;
};

type FundingSourceForm = {
  name: string;
  fundingAgency: string;
  projectCode: string;
  projectTitle: string;
  description: string;
  currency: string;
  materialsBudget: string;
  activitiesBudget: string;
  startDate: string;
  endDate: string;
};

type MerchantReview = {
  id: string;
  name: string;
  normalized_name: string;
  note: string | null;
  needs_review: boolean | null;
  is_active: boolean | null;
};

type ActivityGroupReview = {
  id: string;
  name: string;
  normalized_name: string;
  activity_type: string | null;
  note: string | null;
  needs_review: boolean | null;
  is_active: boolean | null;
};

type FundingUsage = {
  funding_source_id: string | null;
};

type MerchantUsage = {
  merchant_id: string | null;
};

type ActivityGroupUsage = {
  activity_group_id: string | null;
};

type ActivityGroupDraft = {
  name: string;
  activityType: string;
  note: string;
};

type FundingSourceManager = {
  id?: string;
  funding_source_id: string;
  user_id: string;
  created_at?: string | null;
};

type ManagedProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  affiliation: string | null;
  position: string | null;
  created_at: string | null;
  approval_status: string | null;
  requested_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  signup_note: string | null;
};

type ManagedProfileForm = {
  fullName: string;
  role: string;
  affiliation: string;
  position: string;
};

const emptyFundingForm: FundingSourceForm = {
  name: "",
  fundingAgency: "",
  projectCode: "",
  projectTitle: "",
  description: "",
  currency: "KRW",
  materialsBudget: "",
  activitiesBudget: "",
  startDate: "",
  endDate: "",
};

function canManage(role: string | null) {
  return role === "professor" || role === "admin";
}

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
    return "Other";
  }

  return value.replaceAll("_", " ").replace(/^\w/, (letter) =>
    letter.toUpperCase(),
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

function getApprovalStatus(profile: ManagedProfile) {
  return (profile.approval_status ?? "approved").trim().toLowerCase();
}

function getApprovalBadgeClass(status: string) {
  if (status === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-brand/20 bg-brand-soft text-brand";
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toFundingForm(source: FundingSource): FundingSourceForm {
  return {
    name: source.name ?? "",
    fundingAgency: source.funding_agency ?? "",
    projectCode: source.project_code ?? "",
    projectTitle: source.project_title ?? "",
    description: source.description ?? "",
    currency: source.currency ?? "KRW",
    materialsBudget: String(source.materials_budget ?? ""),
    activitiesBudget: String(source.activities_budget ?? ""),
    startDate: dateInputValue(source.start_date),
    endDate: dateInputValue(source.end_date),
  };
}

function toProfileForm(profile: ManagedProfile): ManagedProfileForm {
  return {
    fullName: profile.full_name ?? "",
    role: profile.role ?? "student",
    affiliation: profile.affiliation ?? "",
    position: profile.position ?? "",
  };
}

function parseBudget(value: string) {
  return value.trim() ? Number(value) : 0;
}

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [usedFundingSourceIds, setUsedFundingSourceIds] = useState<string[]>(
    [],
  );
  const [fundingSourceManagers, setFundingSourceManagers] = useState<
    FundingSourceManager[]
  >([]);
  const [managerUserDrafts, setManagerUserDrafts] = useState<
    Record<string, string>
  >({});
  const [usedMerchantIds, setUsedMerchantIds] = useState<string[]>([]);
  const [merchantReviews, setMerchantReviews] = useState<MerchantReview[]>([]);
  const [usedActivityGroupIds, setUsedActivityGroupIds] = useState<string[]>(
    [],
  );
  const [activityGroupReviews, setActivityGroupReviews] = useState<
    ActivityGroupReview[]
  >([]);
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [profileDrafts, setProfileDrafts] = useState<
    Record<string, ManagedProfileForm>
  >({});
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [fundingForm, setFundingForm] =
    useState<FundingSourceForm>(emptyFundingForm);
  const [fundingDrafts, setFundingDrafts] = useState<
    Record<string, FundingSourceForm>
  >({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>(
    {},
  );
  const [activityGroupDrafts, setActivityGroupDrafts] = useState<
    Record<string, ActivityGroupDraft>
  >({});
  const [mergeSourceSearch, setMergeSourceSearch] = useState("");
  const [mergeTargetSearch, setMergeTargetSearch] = useState("");
  const [mergeSourceMerchantId, setMergeSourceMerchantId] = useState("");
  const [mergeTargetMerchantId, setMergeTargetMerchantId] = useState("");
  const [activityMergeSourceSearch, setActivityMergeSourceSearch] =
    useState("");
  const [activityMergeTargetSearch, setActivityMergeTargetSearch] =
    useState("");
  const [activityMergeSourceId, setActivityMergeSourceId] = useState("");
  const [activityMergeTargetId, setActivityMergeTargetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userIsGlobalManager = canManage(role);

  const projectManagedFundingSourceIds = useMemo(
    () =>
      fundingSourceManagers
        .filter((manager) => manager.user_id === currentUserId)
        .map((manager) => manager.funding_source_id),
    [currentUserId, fundingSourceManagers],
  );

  const userIsProjectAdmin = projectManagedFundingSourceIds.length > 0;
  const userCanUseAdmin = userIsGlobalManager || userIsProjectAdmin;

  const activeFundingSources = useMemo(
    () => fundingSources.filter((source) => source.is_active !== false),
    [fundingSources],
  );

  const inactiveFundingSources = useMemo(
    () => fundingSources.filter((source) => source.is_active === false),
    [fundingSources],
  );

  const needsReviewMerchants = useMemo(
    () =>
      merchantReviews.filter(
        (merchant) => merchant.is_active !== false && merchant.needs_review,
      ),
    [merchantReviews],
  );

  const activeMerchants = useMemo(
    () =>
      merchantReviews.filter(
        (merchant) => merchant.is_active !== false && !merchant.needs_review,
      ),
    [merchantReviews],
  );

  const inactiveMerchants = useMemo(
    () => merchantReviews.filter((merchant) => merchant.is_active === false),
    [merchantReviews],
  );

  const needsReviewActivityGroups = useMemo(
    () =>
      activityGroupReviews.filter(
        (group) => group.is_active !== false && group.needs_review,
      ),
    [activityGroupReviews],
  );

  const activeActivityGroups = useMemo(
    () =>
      activityGroupReviews.filter(
        (group) => group.is_active !== false && !group.needs_review,
      ),
    [activityGroupReviews],
  );

  const inactiveActivityGroups = useMemo(
    () => activityGroupReviews.filter((group) => group.is_active === false),
    [activityGroupReviews],
  );

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((first, second) =>
        (first.full_name || first.email || "").localeCompare(
          second.full_name || second.email || "",
        ),
      ),
    [profiles],
  );

  const filteredProfiles = useMemo(
    () =>
      sortedProfiles.filter((profile) =>
        approvalFilter === "all"
          ? true
          : getApprovalStatus(profile) === approvalFilter,
      ),
    [approvalFilter, sortedProfiles],
  );

  const profileMap = useMemo(
    () =>
      profiles.reduce<Record<string, ManagedProfile>>((accumulator, profile) => {
        accumulator[profile.id] = profile;
        return accumulator;
      }, {}),
    [profiles],
  );

  const mergeSourceMerchant = useMemo(
    () =>
      merchantReviews.find((merchant) => merchant.id === mergeSourceMerchantId) ??
      null,
    [mergeSourceMerchantId, merchantReviews],
  );

  const mergeTargetMerchant = useMemo(
    () =>
      merchantReviews.find((merchant) => merchant.id === mergeTargetMerchantId) ??
      null,
    [mergeTargetMerchantId, merchantReviews],
  );

  const activityMergeSourceGroup = useMemo(
    () =>
      activityGroupReviews.find((group) => group.id === activityMergeSourceId) ??
      null,
    [activityGroupReviews, activityMergeSourceId],
  );

  const activityMergeTargetGroup = useMemo(
    () =>
      activityGroupReviews.find((group) => group.id === activityMergeTargetId) ??
      null,
    [activityGroupReviews, activityMergeTargetId],
  );

  const sourceMerchantOptions = useMemo(() => {
    const search = mergeSourceSearch.trim().toLowerCase();

    return merchantReviews
      .filter((merchant) =>
        search
          ? merchant.name.toLowerCase().includes(search) ||
            merchant.normalized_name.includes(normalizeMerchantName(search))
          : true,
      )
      .slice(0, 12);
  }, [mergeSourceSearch, merchantReviews]);

  const targetMerchantOptions = useMemo(() => {
    const search = mergeTargetSearch.trim().toLowerCase();

    return merchantReviews
      .filter((merchant) => merchant.is_active !== false)
      .filter((merchant) =>
        search
          ? merchant.name.toLowerCase().includes(search) ||
            merchant.normalized_name.includes(normalizeMerchantName(search))
          : true,
      )
      .slice(0, 12);
  }, [mergeTargetSearch, merchantReviews]);

  const activitySourceOptions = useMemo(() => {
    const search = activityMergeSourceSearch.trim().toLowerCase();

    return activityGroupReviews
      .filter((group) =>
        search
          ? group.name.toLowerCase().includes(search) ||
            group.normalized_name.includes(normalizeActivityGroupName(search))
          : true,
      )
      .slice(0, 12);
  }, [activityGroupReviews, activityMergeSourceSearch]);

  const activityTargetOptions = useMemo(() => {
    const search = activityMergeTargetSearch.trim().toLowerCase();

    return activityGroupReviews
      .filter((group) => group.is_active !== false)
      .filter((group) =>
        search
          ? group.name.toLowerCase().includes(search) ||
            group.normalized_name.includes(normalizeActivityGroupName(search))
          : true,
      )
      .slice(0, 12);
  }, [activityGroupReviews, activityMergeTargetSearch]);

  const getFundingSourceLabel = (sourceId: string) =>
    fundingSources.find((source) => source.id === sourceId)?.name ??
    "Funding Source";

  const getMerchantLabel = (merchantId: string) =>
    merchantReviews.find((merchant) => merchant.id === merchantId)?.name ??
    "Merchant";

  const getActivityGroupLabel = (groupId: string) =>
    activityGroupReviews.find((group) => group.id === groupId)?.name ??
    "Activity Group";

  const getProfileLabel = (profileId: string) => {
    const profile = profileMap[profileId];

    return (
      profile?.email ||
      profile?.full_name ||
      `User ${profileId.slice(0, 8)}`
    );
  };

  const loadFundingSources = useCallback(async () => {
    const [sourcesResult, usageResult] = await Promise.all([
      supabase
        .from("funding_sources")
        .select(
          "id, name, funding_agency, project_code, project_title, description, currency, materials_budget, activities_budget, start_date, end_date, finished_at, is_active",
        )
        .order("name", { ascending: true }),
      supabase
        .from("purchase_requests")
        .select("funding_source_id")
        .eq("status", "paid")
        .not("funding_source_id", "is", null),
    ]);

    if (sourcesResult.error) {
      setFundingSources([]);
      setErrorMessage(sourcesResult.error.message);
      return;
    }

    const nextSources = (sourcesResult.data ?? []) as FundingSource[];
    setFundingSources(nextSources);
    setFundingDrafts(
      nextSources.reduce<Record<string, FundingSourceForm>>(
        (accumulator, source) => {
          accumulator[source.id] = toFundingForm(source);
          return accumulator;
        },
        {},
      ),
    );

    if (!usageResult.error) {
      const usedIds = ((usageResult.data ?? []) as FundingUsage[])
        .map((row) => row.funding_source_id)
        .filter((id): id is string => Boolean(id));
      setUsedFundingSourceIds(Array.from(new Set(usedIds)));
    }
  }, []);

  const loadFundingSourceManagers = useCallback(async () => {
    const { data, error } = await supabase
      .from("funding_source_managers")
      .select("*");

    if (error) {
      setFundingSourceManagers([]);
      setErrorMessage(error.message);
      return [];
    }

    const nextManagers = (data ?? []) as FundingSourceManager[];
    setFundingSourceManagers(nextManagers);
    return nextManagers;
  }, []);

  const loadMerchantReviews = useCallback(async () => {
    const [merchantsResult, usageResult] = await Promise.all([
      supabase
        .from("merchants")
        .select("id, name, normalized_name, note, needs_review, is_active")
        .order("is_active", { ascending: false })
        .order("name", { ascending: true }),
      supabase
        .from("purchase_requests")
        .select("merchant_id")
        .not("merchant_id", "is", null),
    ]);

    if (merchantsResult.error) {
      setMerchantReviews([]);
      setErrorMessage(merchantsResult.error.message);
      return;
    }

    const nextMerchants = (merchantsResult.data ?? []) as MerchantReview[];
    setMerchantReviews(nextMerchants);
    setMerchantDrafts(
      nextMerchants.reduce<Record<string, string>>((accumulator, merchant) => {
        accumulator[merchant.id] = merchant.name;
        return accumulator;
      }, {}),
    );

    if (!usageResult.error) {
      const usedIds = ((usageResult.data ?? []) as MerchantUsage[])
        .map((row) => row.merchant_id)
        .filter((id): id is string => Boolean(id));
      setUsedMerchantIds(Array.from(new Set(usedIds)));
    }
  }, []);

  const loadActivityGroupReviews = useCallback(async () => {
    const [groupsResult, usageResult] = await Promise.all([
      supabase
        .from("activity_groups")
        .select(
          "id, name, normalized_name, activity_type, note, needs_review, is_active",
        )
        .order("is_active", { ascending: false })
        .order("activity_type", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("purchase_requests")
        .select("activity_group_id")
        .not("activity_group_id", "is", null),
    ]);

    if (groupsResult.error) {
      setActivityGroupReviews([]);
      setErrorMessage(groupsResult.error.message);
      return;
    }

    const nextGroups = (groupsResult.data ?? []) as ActivityGroupReview[];
    setActivityGroupReviews(nextGroups);
    setActivityGroupDrafts(
      nextGroups.reduce<Record<string, ActivityGroupDraft>>(
        (accumulator, group) => {
          accumulator[group.id] = {
            name: group.name,
            activityType: group.activity_type ?? "other",
            note: group.note ?? "",
          };
          return accumulator;
        },
        {},
      ),
    );

    if (!usageResult.error) {
      const usedIds = ((usageResult.data ?? []) as ActivityGroupUsage[])
        .map((row) => row.activity_group_id)
        .filter((id): id is string => Boolean(id));
      setUsedActivityGroupIds(Array.from(new Set(usedIds)));
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, affiliation, position, created_at, approval_status, requested_at, approved_at, approved_by, rejected_at, rejected_by, signup_note",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setProfiles([]);
      setProfileDrafts({});
      setErrorMessage(error.message);
      return;
    }

    const nextProfiles = (data ?? []) as ManagedProfile[];
    setProfiles(nextProfiles);
    setProfileDrafts(
      nextProfiles.reduce<Record<string, ManagedProfileForm>>(
        (accumulator, profile) => {
          accumulator[profile.id] = toProfileForm(profile);
          return accumulator;
        },
        {},
      ),
    );
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setRole(null);
      setCurrentUserId(null);
      setErrorMessage("Please sign in again before using Admin tools.");
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setRole(null);
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    const nextRole =
      ((profile as Profile | null)?.role ?? null)?.toLowerCase() ?? null;
    setRole(nextRole);

    const nextManagers = await loadFundingSourceManagers();
    const hasProjectAdminAccess = nextManagers.some(
      (manager) => manager.user_id === user.id,
    );

    if (canManage(nextRole)) {
      await Promise.all([
        loadFundingSources(),
        loadActivityGroupReviews(),
        loadMerchantReviews(),
        loadProfiles(),
      ]);
    } else if (hasProjectAdminAccess) {
      await Promise.all([loadActivityGroupReviews(), loadMerchantReviews()]);
    }

    setLoading(false);
  }, [
    loadFundingSourceManagers,
    loadFundingSources,
    loadActivityGroupReviews,
    loadMerchantReviews,
    loadProfiles,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAdminData();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAdminData]);

  const updateFundingForm = (
    field: keyof FundingSourceForm,
    value: string,
  ) => {
    setFundingForm((current) => ({ ...current, [field]: value }));
  };

  const updateFundingDraft = (
    sourceId: string,
    field: keyof FundingSourceForm,
    value: string,
  ) => {
    setFundingDrafts((current) => ({
      ...current,
      [sourceId]: {
        ...current[sourceId],
        [field]: value,
      },
    }));
  };

  const updateProfileDraft = (
    profileId: string,
    field: keyof ManagedProfileForm,
    value: string,
  ) => {
    setProfileDrafts((current) => ({
      ...current,
      [profileId]: {
        ...current[profileId],
        [field]: value,
      },
    }));
  };

  const getFundingPayload = (form: FundingSourceForm) => ({
    name: form.name.trim(),
    funding_agency: form.fundingAgency.trim() || null,
    project_code: form.projectCode.trim() || null,
    project_title: form.projectTitle.trim() || null,
    description: form.description.trim() || null,
    currency: form.currency.trim() || "KRW",
    materials_budget: parseBudget(form.materialsBudget),
    activities_budget: parseBudget(form.activitiesBudget),
    start_date: form.startDate || null,
    end_date: form.endDate || null,
  });

  const handleAddFundingSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!userIsGlobalManager) {
      setErrorMessage("You do not have permission to manage funding sources.");
      return;
    }

    const payload = getFundingPayload(fundingForm);

    if (!payload.name) {
      setErrorMessage("Funding source name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("funding_sources").insert({
      ...payload,
      is_active: true,
      finished_at: null,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "add_funding_source",
      entityType: "funding_source",
      summary: `Added Funding Source: ${payload.name}.`,
      metadata: payload,
    });

    setSuccessMessage("Funding source added.");
    setFundingForm(emptyFundingForm);
    setSaving(false);
    await loadFundingSources();
  };

  const handleUpdateProfile = async (profile: ManagedProfile) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = profileDrafts[profile.id];

    if (!draft) {
      return;
    }

    const nextRole = draft.role.trim().toLowerCase();

    if (!["student", "professor", "admin", "lab_manager"].includes(nextRole)) {
      setErrorMessage("Role must be student, professor, admin, or lab_manager.");
      return;
    }

    const currentRole = (profile.role ?? "").toLowerCase();
    const nextRoleKeepsGlobalAccess =
      nextRole === "professor" || nextRole === "admin";
    const isSelfDowngrade =
      profile.id === currentUserId &&
      (currentRole === "professor" || currentRole === "admin") &&
      !nextRoleKeepsGlobalAccess;

    if (isSelfDowngrade) {
      setErrorMessage("You cannot remove your own professor/admin access.");
      return;
    }

    const professorCount = profiles.filter(
      (nextProfile) => nextProfile.role?.toLowerCase() === "professor",
    ).length;
    const removesProfessorRole = currentRole === "professor" && nextRole !== "professor";

    if (removesProfessorRole && professorCount <= 1) {
      setErrorMessage("At least one professor account must remain.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: draft.fullName.trim() || null,
        role: nextRole,
        affiliation: draft.affiliation.trim() || null,
        position: draft.position.trim() || null,
      })
      .eq("id", profile.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    if (currentRole !== nextRole) {
      await logPortalActivity({
        action: "update_user_role",
        entityType: "profile",
        entityId: profile.id,
        summary: `Changed user role for ${
          profile.email ?? profile.full_name ?? profile.id
        } from ${currentRole || "unknown"} to ${nextRole}.`,
        metadata: {
          previous_role: currentRole || null,
          new_role: nextRole,
          profile_id: profile.id,
          email: profile.email,
        },
      });
    }

    setSuccessMessage("User profile updated.");
    setSaving(false);
    await loadProfiles();
  };

  const handleUpdateApprovalStatus = async (
    profile: ManagedProfile,
    nextStatus: "approved" | "rejected",
  ) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userIsGlobalManager) {
      setErrorMessage("You do not have permission to approve portal users.");
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();
    const payload =
      nextStatus === "approved"
        ? {
            approval_status: "approved",
            approved_at: now,
            approved_by: currentUserId,
            rejected_at: null,
            rejected_by: null,
          }
        : {
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
            rejected_at: now,
            rejected_by: currentUserId,
          };

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action:
        nextStatus === "approved"
          ? "approve_user_access"
          : "reject_user_access",
      entityType: "profile",
      entityId: profile.id,
      summary: `${
        nextStatus === "approved" ? "Approved" : "Rejected"
      } portal access for ${profile.email ?? profile.full_name ?? profile.id}.`,
      metadata: {
        profile_id: profile.id,
        email: profile.email,
        previous_approval_status: profile.approval_status,
        new_approval_status: nextStatus,
      },
    });

    setSuccessMessage(
      nextStatus === "approved"
        ? "Portal access approved."
        : "Portal access rejected.",
    );
    setSaving(false);
    await loadProfiles();
  };

  const handleUpdateFundingSource = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = fundingDrafts[sourceId];

    if (!draft) {
      return;
    }

    const payload = getFundingPayload(draft);

    if (!payload.name) {
      setErrorMessage("Funding source name is required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("funding_sources")
      .update(payload)
      .eq("id", sourceId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "edit_funding_source",
      entityType: "funding_source",
      entityId: sourceId,
      summary: `Edited Funding Source: ${payload.name}.`,
      metadata: {
        funding_source_id: sourceId,
        previous_name: getFundingSourceLabel(sourceId),
        ...payload,
      },
    });

    setSuccessMessage("Funding source updated.");
    setSaving(false);
    await loadFundingSources();
  };

  const handleAssignFundingSourceManager = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const userId = managerUserDrafts[sourceId];

    if (!userId) {
      setErrorMessage("Select a user to assign as project admin.");
      return;
    }

    const alreadyAssigned = fundingSourceManagers.some(
      (manager) =>
        manager.funding_source_id === sourceId && manager.user_id === userId,
    );

    if (alreadyAssigned) {
      setErrorMessage("This user is already assigned to this Funding Source.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("funding_source_managers").insert({
      funding_source_id: sourceId,
      user_id: userId,
    });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "add_project_admin",
      entityType: "funding_source_manager",
      entityId: sourceId,
      summary: `Assigned ${getProfileLabel(userId)} as project admin for ${getFundingSourceLabel(
        sourceId,
      )}.`,
      metadata: {
        funding_source_id: sourceId,
        funding_source_name: getFundingSourceLabel(sourceId),
        user_id: userId,
        user_label: getProfileLabel(userId),
      },
    });

    setSuccessMessage("Project admin assigned to Funding Source.");
    setManagerUserDrafts((current) => ({ ...current, [sourceId]: "" }));
    setSaving(false);
    await loadFundingSourceManagers();
  };

  const handleRemoveFundingSourceManager = async (
    sourceId: string,
    userId: string,
  ) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to remove this project admin assignment? The user will no longer manage this Funding Source.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("funding_source_managers")
      .delete()
      .eq("funding_source_id", sourceId)
      .eq("user_id", userId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "remove_project_admin",
      entityType: "funding_source_manager",
      entityId: sourceId,
      summary: `Removed ${getProfileLabel(userId)} as project admin for ${getFundingSourceLabel(
        sourceId,
      )}.`,
      metadata: {
        funding_source_id: sourceId,
        funding_source_name: getFundingSourceLabel(sourceId),
        user_id: userId,
        user_label: getProfileLabel(userId),
      },
    });

    setSuccessMessage("Project admin removed from Funding Source.");
    setSaving(false);
    await loadFundingSourceManagers();
  };

  const handleFinishFundingSource = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const confirmed = window.confirm(
      "Are you sure you want to finish this funding source? It will move to inactive/finished sources.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("funding_sources")
      .update({
        is_active: false,
        finished_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "finish_funding_source",
      entityType: "funding_source",
      entityId: sourceId,
      summary: `Finished Funding Source: ${getFundingSourceLabel(sourceId)}.`,
      metadata: {
        funding_source_id: sourceId,
        funding_source_name: getFundingSourceLabel(sourceId),
      },
    });

    setSuccessMessage("Funding source marked as finished.");
    setSaving(false);
    await loadFundingSources();
  };

  const handleReactivateFundingSource = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("funding_sources")
      .update({
        is_active: true,
        finished_at: null,
      })
      .eq("id", sourceId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "reactivate_funding_source",
      entityType: "funding_source",
      entityId: sourceId,
      summary: `Reactivated Funding Source: ${getFundingSourceLabel(sourceId)}.`,
      metadata: {
        funding_source_id: sourceId,
        funding_source_name: getFundingSourceLabel(sourceId),
      },
    });

    setSuccessMessage("Funding source reactivated.");
    setSaving(false);
    await loadFundingSources();
  };

  const handleDeleteFundingSource = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (usedFundingSourceIds.includes(sourceId)) {
      setErrorMessage(
        "This funding source is linked to payment records and should be finished instead of deleted.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this unused funding source? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("funding_sources")
      .delete()
      .eq("id", sourceId);

    if (error) {
      setErrorMessage(
        "This funding source is linked to payment records and should be finished instead of deleted.",
      );
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "delete_funding_source",
      entityType: "funding_source",
      entityId: sourceId,
      summary: `Deleted unused Funding Source: ${getFundingSourceLabel(
        sourceId,
      )}.`,
      metadata: {
        funding_source_id: sourceId,
        funding_source_name: getFundingSourceLabel(sourceId),
      },
    });

    setSuccessMessage("Unused funding source deleted.");
    setSaving(false);
    await loadFundingSources();
  };

  const handleSaveMerchantName = async (merchantId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const name = merchantDrafts[merchantId]?.trim();

    if (!name) {
      setErrorMessage("Merchant name is required.");
      return;
    }

    const normalizedName = normalizeMerchantName(name);

    if (!normalizedName) {
      setErrorMessage("Merchant name must include at least one letter or number.");
      return;
    }

    const currentMerchant = merchantReviews.find(
      (merchant) => merchant.id === merchantId,
    );

    setSaving(true);

    const { data: existingMerchant, error: lookupError } = await supabase
      .from("merchants")
      .select("id")
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (lookupError) {
      setErrorMessage(lookupError.message);
      setSaving(false);
      return;
    }

    if (existingMerchant && (existingMerchant as { id: string }).id !== merchantId) {
      setErrorMessage("A merchant with this normalized name already exists.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("merchants")
      .update({
        name,
        normalized_name: normalizedName,
      })
      .eq("id", merchantId);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setErrorMessage("A merchant with this normalized name already exists.");
      } else {
        setErrorMessage(error.message);
      }
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "edit_merchant_name",
      entityType: "merchant",
      entityId: merchantId,
      summary: `Edited merchant name from ${
        currentMerchant?.name ?? "Merchant"
      } to ${name}.`,
      metadata: {
        merchant_id: merchantId,
        previous_name: currentMerchant?.name ?? null,
        previous_normalized_name: currentMerchant?.normalized_name ?? null,
        new_name: name,
        new_normalized_name: normalizedName,
      },
    });

    setSuccessMessage("Merchant name and normalized name updated.");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleMarkMerchantReviewed = async (merchantId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .update({ needs_review: false })
      .eq("id", merchantId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Merchant marked as reviewed.");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleDeactivateMerchant = async (merchantId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this merchant? It will no longer appear in the Purchase Request selector, but linked purchase requests will remain.",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .update({ is_active: false })
      .eq("id", merchantId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "deactivate_merchant",
      entityType: "merchant",
      entityId: merchantId,
      summary: `Deactivated merchant: ${getMerchantLabel(merchantId)}.`,
      metadata: {
        merchant_id: merchantId,
        merchant_name: getMerchantLabel(merchantId),
      },
    });

    setSuccessMessage("Merchant deactivated.");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleReactivateMerchant = async (merchantId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .update({ is_active: true })
      .eq("id", merchantId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "reactivate_merchant",
      entityType: "merchant",
      entityId: merchantId,
      summary: `Reactivated merchant: ${getMerchantLabel(merchantId)}.`,
      metadata: {
        merchant_id: merchantId,
        merchant_name: getMerchantLabel(merchantId),
      },
    });

    setSuccessMessage("Merchant reactivated.");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleDeleteMerchant = async (merchantId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (usedMerchantIds.includes(merchantId)) {
      setErrorMessage(
        "This merchant is linked to purchase records and should remain deactivated instead of deleted.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this inactive unused merchant? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .delete()
      .eq("id", merchantId);

    if (error) {
      setErrorMessage(
        "This merchant is linked to purchase records and should remain deactivated instead of deleted.",
      );
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "delete_merchant",
      entityType: "merchant",
      entityId: merchantId,
      summary: `Deleted inactive unused merchant: ${getMerchantLabel(
        merchantId,
      )}.`,
      metadata: {
        merchant_id: merchantId,
        merchant_name: getMerchantLabel(merchantId),
      },
    });

    setSuccessMessage("Inactive unused merchant deleted.");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleMergeMerchants = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!mergeSourceMerchant || !mergeTargetMerchant) {
      setErrorMessage("Select both a source merchant and a target merchant.");
      return;
    }

    if (mergeSourceMerchant.id === mergeTargetMerchant.id) {
      setErrorMessage("Source merchant and target merchant cannot be the same.");
      return;
    }

    if (mergeTargetMerchant.is_active === false) {
      setErrorMessage("Target merchant must be active before merging.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to merge this merchant? Linked purchase requests will move from ${mergeSourceMerchant.name} to ${mergeTargetMerchant.name}. This cannot be automatically undone.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error: requestError } = await supabase
      .from("purchase_requests")
      .update({
        merchant_id: mergeTargetMerchant.id,
        merchant: mergeTargetMerchant.name,
      })
      .eq("merchant_id", mergeSourceMerchant.id);

    if (requestError) {
      setErrorMessage(requestError.message);
      setSaving(false);
      return;
    }

    const mergeMessage = `Merged into ${mergeTargetMerchant.name}`;
    const nextNote = mergeSourceMerchant.note
      ? `${mergeSourceMerchant.note}\n${mergeMessage}`
      : mergeMessage;

    const { error: sourceError } = await supabase
      .from("merchants")
      .update({
        is_active: false,
        needs_review: false,
        note: nextNote,
      })
      .eq("id", mergeSourceMerchant.id);

    if (sourceError) {
      setErrorMessage(sourceError.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "merge_merchant",
      entityType: "merchant",
      entityId: mergeSourceMerchant.id,
      summary: `Merged ${mergeSourceMerchant.name} into ${mergeTargetMerchant.name}.`,
      metadata: {
        source_merchant_id: mergeSourceMerchant.id,
        source_merchant_name: mergeSourceMerchant.name,
        target_merchant_id: mergeTargetMerchant.id,
        target_merchant_name: mergeTargetMerchant.name,
        source_note: nextNote,
      },
    });

    setSuccessMessage(
      `${mergeSourceMerchant.name} was merged into ${mergeTargetMerchant.name}.`,
    );
    setMergeSourceMerchantId("");
    setMergeTargetMerchantId("");
    setMergeSourceSearch("");
    setMergeTargetSearch("");
    setSaving(false);
    await loadMerchantReviews();
  };

  const handleSaveActivityGroup = async (groupId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    const draft = activityGroupDrafts[groupId];

    if (!draft) {
      return;
    }

    const name = draft.name.trim();
    const activityType = draft.activityType.trim().toLowerCase() || "other";
    const normalizedName = normalizeActivityGroupName(name);
    const currentGroup = activityGroupReviews.find((group) => group.id === groupId);

    if (!name) {
      setErrorMessage("Activity group name is required.");
      return;
    }

    if (!normalizedName) {
      setErrorMessage(
        "Activity group name must include at least one letter or number.",
      );
      return;
    }

    setSaving(true);

    const { data: existingGroup, error: lookupError } = await supabase
      .from("activity_groups")
      .select("id")
      .eq("activity_type", activityType)
      .eq("normalized_name", normalizedName)
      .maybeSingle();

    if (lookupError) {
      setErrorMessage(lookupError.message);
      setSaving(false);
      return;
    }

    if (existingGroup && (existingGroup as { id: string }).id !== groupId) {
      setErrorMessage(
        "An activity group with this normalized name and activity type already exists.",
      );
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("activity_groups")
      .update({
        name,
        normalized_name: normalizedName,
        activity_type: activityType,
        note: draft.note.trim() || null,
      })
      .eq("id", groupId);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setErrorMessage(
          "An activity group with this normalized name and activity type already exists.",
        );
      } else {
        setErrorMessage(error.message);
      }
      setSaving(false);
      return;
    }

    await supabase
      .from("purchase_requests")
      .update({
        activity_group_name: name,
        activity_type: activityType,
      })
      .eq("activity_group_id", groupId);

    await logPortalActivity({
      action: "edit_activity_group",
      entityType: "activity_group",
      entityId: groupId,
      summary: `Edited Activity Group from ${
        currentGroup?.name ?? "Activity Group"
      } to ${name}.`,
      metadata: {
        activity_group_id: groupId,
        previous_name: currentGroup?.name ?? null,
        previous_activity_type: currentGroup?.activity_type ?? null,
        previous_normalized_name: currentGroup?.normalized_name ?? null,
        new_name: name,
        new_activity_type: activityType,
        new_normalized_name: normalizedName,
      },
    });

    setSuccessMessage("Activity group updated.");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const handleMarkActivityGroupReviewed = async (groupId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("activity_groups")
      .update({ needs_review: false })
      .eq("id", groupId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Activity group marked as reviewed.");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const handleDeactivateActivityGroup = async (groupId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this activity group? It will no longer appear in Activity Request selection, but linked purchase requests will remain.",
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("activity_groups")
      .update({ is_active: false })
      .eq("id", groupId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "deactivate_activity_group",
      entityType: "activity_group",
      entityId: groupId,
      summary: `Deactivated Activity Group: ${getActivityGroupLabel(groupId)}.`,
      metadata: {
        activity_group_id: groupId,
        activity_group_name: getActivityGroupLabel(groupId),
      },
    });

    setSuccessMessage("Activity group deactivated.");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const handleReactivateActivityGroup = async (groupId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("activity_groups")
      .update({ is_active: true })
      .eq("id", groupId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "reactivate_activity_group",
      entityType: "activity_group",
      entityId: groupId,
      summary: `Reactivated Activity Group: ${getActivityGroupLabel(groupId)}.`,
      metadata: {
        activity_group_id: groupId,
        activity_group_name: getActivityGroupLabel(groupId),
      },
    });

    setSuccessMessage("Activity group reactivated.");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const handleDeleteActivityGroup = async (groupId: string) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (usedActivityGroupIds.includes(groupId)) {
      setErrorMessage(
        "This activity group is linked to purchase records and should remain deactivated instead of deleted.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this inactive unused activity group? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("activity_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      setErrorMessage(
        "This activity group is linked to purchase records and should remain deactivated instead of deleted.",
      );
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "delete_activity_group",
      entityType: "activity_group",
      entityId: groupId,
      summary: `Deleted inactive unused Activity Group: ${getActivityGroupLabel(
        groupId,
      )}.`,
      metadata: {
        activity_group_id: groupId,
        activity_group_name: getActivityGroupLabel(groupId),
      },
    });

    setSuccessMessage("Inactive unused activity group deleted.");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const handleMergeActivityGroups = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!activityMergeSourceGroup || !activityMergeTargetGroup) {
      setErrorMessage("Select both a source and target activity group.");
      return;
    }

    if (activityMergeSourceGroup.id === activityMergeTargetGroup.id) {
      setErrorMessage("Source and target activity groups cannot be the same.");
      return;
    }

    if (activityMergeTargetGroup.is_active === false) {
      setErrorMessage("Target activity group must be active before merging.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to merge this activity group? Linked purchase requests will move from ${activityMergeSourceGroup.name} to ${activityMergeTargetGroup.name}. This cannot be automatically undone.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    const { error: requestError } = await supabase
      .from("purchase_requests")
      .update({
        activity_group_id: activityMergeTargetGroup.id,
        activity_group_name: activityMergeTargetGroup.name,
        activity_type: activityMergeTargetGroup.activity_type ?? "other",
      })
      .eq("activity_group_id", activityMergeSourceGroup.id);

    if (requestError) {
      setErrorMessage(requestError.message);
      setSaving(false);
      return;
    }

    const mergeMessage = `Merged into ${activityMergeTargetGroup.name}`;
    const nextNote = activityMergeSourceGroup.note
      ? `${activityMergeSourceGroup.note}\n${mergeMessage}`
      : mergeMessage;

    const { error: sourceError } = await supabase
      .from("activity_groups")
      .update({
        is_active: false,
        needs_review: false,
        note: nextNote,
      })
      .eq("id", activityMergeSourceGroup.id);

    if (sourceError) {
      setErrorMessage(sourceError.message);
      setSaving(false);
      return;
    }

    await logPortalActivity({
      action: "merge_activity_group",
      entityType: "activity_group",
      entityId: activityMergeSourceGroup.id,
      summary: `Merged ${activityMergeSourceGroup.name} into ${activityMergeTargetGroup.name}.`,
      metadata: {
        source_activity_group_id: activityMergeSourceGroup.id,
        source_activity_group_name: activityMergeSourceGroup.name,
        target_activity_group_id: activityMergeTargetGroup.id,
        target_activity_group_name: activityMergeTargetGroup.name,
        target_activity_type: activityMergeTargetGroup.activity_type,
        source_note: nextNote,
      },
    });

    setSuccessMessage(
      `${activityMergeSourceGroup.name} was merged into ${activityMergeTargetGroup.name}.`,
    );
    setActivityMergeSourceId("");
    setActivityMergeTargetId("");
    setActivityMergeSourceSearch("");
    setActivityMergeTargetSearch("");
    setSaving(false);
    await loadActivityGroupReviews();
  };

  const renderUserManagement = () => (
    <section
      id="user-management"
      className="order-1 scroll-mt-28 portal-card rounded-lg border border-line p-6 shadow-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            User Management
          </p>
          <h3 className="mt-3 text-2xl font-semibold">Portal users</h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Edit profile labels and portal roles, and approve or reject new
            access requests. Account creation from Admin and email invitations
            are intentionally not implemented yet.
          </p>
          <div className="mt-3 grid gap-1 text-xs leading-6 text-muted">
            <p>
              <span className="font-semibold text-foreground">professor:</span>{" "}
              Full owner. Can manage users, project admins, funding sources,
              merchants, and all payments.
            </p>
            <p>
              <span className="font-semibold text-foreground">admin:</span>{" "}
              Global lab administrator. Can manage portal operations, but
              professor should remain the final owner.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                Lab Manager:
              </span>{" "}
              Can manage public website content, but cannot manage payments,
              budgets, users, funding sources, or merchants.
            </p>
            <p>
              <span className="font-semibold text-foreground">student:</span>{" "}
              Can submit purchase requests and manage their own pending
              requests.
            </p>
            <p>
              Project-specific admins are assigned under each Funding Source.
              Project admin assignment does not require changing the user role
              to admin.
            </p>
            <p>
              New sign-ups stay pending until approved. If Supabase email
              confirmation is enabled, users must also confirm their email
              before they can log in.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={approvalFilter}
            onChange={(event) => setApprovalFilter(event.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-muted outline-none transition focus:border-brand"
          >
            <option value="all">All approvals</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={() => void loadProfiles()}
            className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
          >
            Refresh Users
          </button>
        </div>
      </div>

      {sortedProfiles.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
          No profiles are available.
        </div>
      ) : null}

      {sortedProfiles.length > 0 && filteredProfiles.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
          No profiles match this approval filter.
        </div>
      ) : null}

      {filteredProfiles.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
          <div className="min-w-[1180px] divide-y divide-line">
            <div className="grid grid-cols-[1.05fr_1.15fr_0.75fr_0.9fr_0.95fr_0.95fr_0.75fr_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Approval</span>
              <span>Affiliation</span>
              <span>Position</span>
              <span>Created</span>
              <span className="text-right">Actions</span>
            </div>
            {filteredProfiles.map((profile) => {
              const draft = profileDrafts[profile.id] ?? toProfileForm(profile);
              const approvalStatus = getApprovalStatus(profile);

              return (
                <div
                  key={profile.id}
                  className="grid grid-cols-[1.05fr_1.15fr_0.75fr_0.9fr_0.95fr_0.95fr_0.75fr_auto] gap-3 px-3 py-2 text-sm"
                >
                  <input
                    value={draft.fullName}
                    onChange={(event) =>
                      updateProfileDraft(
                        profile.id,
                        "fullName",
                        event.target.value,
                      )
                    }
                    className="min-w-0 rounded-md border border-line bg-white px-2 py-1.5 text-sm outline-none transition focus:border-brand"
                    placeholder="Full name"
                  />
                  <p className="truncate py-1.5 text-xs text-muted">
                    {profile.email ?? "TBD"}
                  </p>
                  <select
                    value={draft.role}
                    onChange={(event) =>
                      updateProfileDraft(profile.id, "role", event.target.value)
                    }
                    className="rounded-md border border-line bg-white px-2 py-1.5 text-sm outline-none transition focus:border-brand"
                  >
                    <option value="student">student</option>
                    <option value="professor">professor</option>
                    <option value="admin">admin</option>
                    <option value="lab_manager">Lab Manager</option>
                  </select>
                  <div className="space-y-1 py-1">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] ${getApprovalBadgeClass(
                        approvalStatus,
                      )}`}
                    >
                      {approvalStatus}
                    </span>
                    {profile.signup_note ? (
                      <p
                        className="line-clamp-2 text-[0.68rem] leading-4 text-muted"
                        title={profile.signup_note}
                      >
                        {profile.signup_note}
                      </p>
                    ) : null}
                  </div>
                  <input
                    value={draft.affiliation}
                    onChange={(event) =>
                      updateProfileDraft(
                        profile.id,
                        "affiliation",
                        event.target.value,
                      )
                    }
                    className="min-w-0 rounded-md border border-line bg-white px-2 py-1.5 text-sm outline-none transition focus:border-brand"
                    placeholder="Affiliation"
                  />
                  <input
                    value={draft.position}
                    onChange={(event) =>
                      updateProfileDraft(
                        profile.id,
                        "position",
                        event.target.value,
                      )
                    }
                    className="min-w-0 rounded-md border border-line bg-white px-2 py-1.5 text-sm outline-none transition focus:border-brand"
                    placeholder="Position"
                  />
                  <p className="py-1.5 text-xs text-muted">
                    {formatDate(profile.created_at)}
                  </p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleUpdateProfile(profile)}
                      className="rounded-md border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                    >
                      Save
                    </button>
                    {approvalStatus !== "approved" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleUpdateApprovalStatus(profile, "approved")
                        }
                        className="rounded-md border border-brand/30 bg-white px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft disabled:opacity-60"
                      >
                        Approve
                      </button>
                    ) : null}
                    {approvalStatus !== "rejected" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleUpdateApprovalStatus(profile, "rejected")
                        }
                        className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderFundingMetadata = (source: FundingSource) => {
    const metadata = [
      source.funding_agency ? `Agency: ${source.funding_agency}` : "",
      source.project_code ? `Code: ${source.project_code}` : "",
      source.project_title ? `Project: ${source.project_title}` : "",
    ].filter(Boolean);

    if (metadata.length === 0) {
      return null;
    }

    return (
      <p className="mt-2 text-xs leading-5 text-muted">{metadata.join(" / ")}</p>
    );
  };

  const renderMerchantList = (
    title: string,
    merchants: MerchantReview[],
    variant: "review" | "active" | "inactive",
  ) => (
    <div className="rounded-md border border-line bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {title}
        </p>
        <span className="text-xs font-semibold text-muted">
          {merchants.length}
        </span>
      </div>

      {merchants.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No merchants in this section.</p>
      ) : null}

      <div className="divide-y divide-line">
        {merchants.map((merchant) => {
          const draftName = merchantDrafts[merchant.id] ?? merchant.name;
          const normalizedPreview = normalizeMerchantName(draftName);

          return (
            <div
              key={merchant.id}
              className="grid gap-2 px-3 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={draftName}
                    onChange={(event) =>
                      setMerchantDrafts((current) => ({
                        ...current,
                        [merchant.id]: event.target.value,
                      }))
                    }
                    className="min-w-0 flex-1 rounded-md border border-line bg-white px-2 py-1.5 text-sm font-semibold outline-none transition focus:border-brand"
                    aria-label={`Edit ${merchant.name}`}
                  />
                  {merchant.needs_review ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                      Needs review
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">
                  normalized: {merchant.normalized_name}
                </p>
                {normalizedPreview !== merchant.normalized_name ? (
                  <p className="mt-0.5 text-xs text-muted">
                    new normalized: {normalizedPreview || "TBD"}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                {variant !== "inactive" ? (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveMerchantName(merchant.id)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                    >
                      Edit name
                    </button>
                    {merchant.needs_review ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleMarkMerchantReviewed(merchant.id)
                        }
                        className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                      >
                        Mark reviewed
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDeactivateMerchant(merchant.id)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleReactivateMerchant(merchant.id)}
                      className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                    >
                      Reactivate
                    </button>
                    {!usedMerchantIds.includes(merchant.id) ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDeleteMerchant(merchant.id)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderActivityGroupList = (
    title: string,
    groups: ActivityGroupReview[],
    variant: "review" | "active" | "inactive",
  ) => (
    <div className="rounded-md border border-line bg-white/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          {title}
        </p>
        <span className="text-xs font-semibold text-muted">{groups.length}</span>
      </div>

      {groups.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">
          No activity groups in this section.
        </p>
      ) : null}

      <div className="divide-y divide-line">
        {groups.map((group) => {
          const draft = activityGroupDrafts[group.id] ?? {
            name: group.name,
            activityType: group.activity_type ?? "other",
            note: group.note ?? "",
          };
          const normalizedPreview = normalizeActivityGroupName(draft.name);

          return (
            <div
              key={group.id}
              className="grid gap-2 px-3 py-2 text-sm xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
            >
              <div className="min-w-0">
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_0.35fr]">
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setActivityGroupDrafts((current) => ({
                        ...current,
                        [group.id]: {
                          ...draft,
                          name: event.target.value,
                        },
                      }))
                    }
                    className="min-w-0 rounded-md border border-line bg-white px-2 py-1.5 text-sm font-semibold outline-none transition focus:border-brand"
                    aria-label={`Edit ${group.name}`}
                  />
                  <select
                    value={draft.activityType}
                    onChange={(event) =>
                      setActivityGroupDrafts((current) => ({
                        ...current,
                        [group.id]: {
                          ...draft,
                          activityType: event.target.value,
                        },
                      }))
                    }
                    className="rounded-md border border-line bg-white px-2 py-1.5 text-sm capitalize outline-none transition focus:border-brand"
                  >
                    <option value="conference">Conference</option>
                    <option value="analysis">Analysis</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span>normalized: {group.normalized_name}</span>
                  <span>type: {formatActivityType(group.activity_type)}</span>
                  {group.needs_review ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">
                      Needs review
                    </span>
                  ) : null}
                </div>
                {normalizedPreview !== group.normalized_name ? (
                  <p className="mt-0.5 text-xs text-muted">
                    new normalized: {normalizedPreview || "TBD"}
                  </p>
                ) : null}
                <input
                  value={draft.note}
                  onChange={(event) =>
                    setActivityGroupDrafts((current) => ({
                      ...current,
                      [group.id]: {
                        ...draft,
                        note: event.target.value,
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-line bg-white px-2 py-1.5 text-xs outline-none transition focus:border-brand"
                  placeholder="Optional note"
                />
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {variant !== "inactive" ? (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleSaveActivityGroup(group.id)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                    >
                      Save
                    </button>
                    {group.needs_review ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleMarkActivityGroupReviewed(group.id)
                        }
                        className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                      >
                        Mark reviewed
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDeactivateActivityGroup(group.id)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleReactivateActivityGroup(group.id)}
                      className="rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                    >
                      Reactivate
                    </button>
                    {!usedActivityGroupIds.includes(group.id) ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleDeleteActivityGroup(group.id)}
                        className="rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                      >
                        Delete
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <PortalShell
      title="Admin"
      description="Manage funding sources, project admins, users, and merchant records."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Admin
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Lab portal operations</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Manage the lightweight operational records used by payment tracking.
        Publication records now live in the dedicated Publications portal page;
        file uploads and notifications are still intentionally out of scope.
      </p>
      <p className="mt-2 max-w-2xl text-xs leading-6 text-muted">
        profiles.role controls global student/professor/admin/Lab Manager
        access. funding_source_managers controls project-specific admin
        assignment; do not make student project admins global admins unless they
        need global access.
      </p>

      {!loading && userCanUseAdmin ? (
        <nav className="sticky top-3 z-10 mt-6 overflow-x-auto rounded-full border border-line bg-white/90 p-2 shadow-panel backdrop-blur">
          <div className="flex min-w-max gap-2">
            {userIsGlobalManager ? (
              <>
                <a
                  href="#user-management"
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                >
                  User Management
                </a>
                <a
                  href="#funding-sources"
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                >
                  Funding Sources
                </a>
                <a
                  href="#project-admins"
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
                >
                  Project Admins
                </a>
              </>
            ) : null}
            <a
              href="#merchant-management"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
            >
              Materials / Merchants
            </a>
            <a
              href="#activity-group-management"
              className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
            >
              Activities / Activity Groups
            </a>
          </div>
        </nav>
      ) : null}

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading admin tools...
        </div>
      ) : null}

      {!loading && !userCanUseAdmin ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage Admin tools.
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

      {!loading && userCanUseAdmin ? (
        <div className="mt-8 grid gap-8">
          {userIsGlobalManager ? renderUserManagement() : null}

          {userIsGlobalManager ? (
          <section
            id="funding-sources"
            className="order-2 scroll-mt-28 portal-card rounded-lg border border-line p-6 shadow-panel"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Funding Sources
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Add a funding source
            </h3>
            <form
              onSubmit={handleAddFundingSource}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <input
                value={fundingForm.name}
                onChange={(event) => updateFundingForm("name", event.target.value)}
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Funding source name"
              />
              <input
                value={fundingForm.fundingAgency}
                onChange={(event) =>
                  updateFundingForm("fundingAgency", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Funding agency"
              />
              <input
                value={fundingForm.projectCode}
                onChange={(event) =>
                  updateFundingForm("projectCode", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Project code"
              />
              <input
                value={fundingForm.projectTitle}
                onChange={(event) =>
                  updateFundingForm("projectTitle", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Project title"
              />
              <input
                value={fundingForm.currency}
                onChange={(event) =>
                  updateFundingForm("currency", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-brand"
                placeholder="KRW"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={fundingForm.materialsBudget}
                onChange={(event) =>
                  updateFundingForm("materialsBudget", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Materials budget"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={fundingForm.activitiesBudget}
                onChange={(event) =>
                  updateFundingForm("activitiesBudget", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
                placeholder="Activities budget"
              />
              <input
                type="date"
                value={fundingForm.startDate}
                onChange={(event) =>
                  updateFundingForm("startDate", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
              />
              <input
                type="date"
                value={fundingForm.endDate}
                onChange={(event) =>
                  updateFundingForm("endDate", event.target.value)
                }
                className="rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand"
              />
              <textarea
                value={fundingForm.description}
                onChange={(event) =>
                  updateFundingForm("description", event.target.value)
                }
                className="min-h-20 rounded-md border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-brand md:col-span-2"
                placeholder="Description"
              />
              <div className="flex justify-end md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="action-button action-button-primary rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Funding Source
                </button>
              </div>
            </form>

            <div className="mt-8 grid gap-4">
              <div id="project-admins" className="scroll-mt-28">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Active Funding Sources
                </p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  Project Admins are assigned inside each active Funding Source
                  and can manage payment workflows only for their assigned
                  sources.
                </p>
                <div className="mt-4 grid gap-4">
                  {activeFundingSources.length === 0 ? (
                    <div className="rounded-md border border-dashed border-line p-6 text-sm text-muted">
                      No active funding sources.
                    </div>
                  ) : null}

                  {activeFundingSources.map((source) => {
                    const draft =
                      fundingDrafts[source.id] ?? toFundingForm(source);
                    const assignedManagers = fundingSourceManagers.filter(
                      (manager) => manager.funding_source_id === source.id,
                    );

                    return (
                      <article
                        key={source.id}
                        className="rounded-md border border-line bg-white/75 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                              Active
                            </p>
                            <h4 className="mt-1 text-lg font-semibold">
                              {source.name}
                            </h4>
                            {renderFundingMetadata(source)}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void handleFinishFundingSource(source.id)
                              }
                              className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                            >
                              Mark as Finished
                            </button>
                            {!usedFundingSourceIds.includes(source.id) ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void handleDeleteFundingSource(source.id)
                                }
                                className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 rounded-md border border-line/70 bg-white/70 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                                Project Admins
                              </p>
                              <p className="mt-1 text-xs text-muted">
                                Assigned here through funding_source_managers,
                                separate from profiles.role.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <select
                                value={managerUserDrafts[source.id] ?? ""}
                                onChange={(event) =>
                                  setManagerUserDrafts((current) => ({
                                    ...current,
                                    [source.id]: event.target.value,
                                  }))
                                }
                                className="rounded-md border border-line bg-white px-3 py-2 text-xs outline-none transition focus:border-brand"
                              >
                                <option value="">Select user</option>
                                {sortedProfiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.full_name ||
                                      profile.email ||
                                      profile.id.slice(0, 8)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() =>
                                  void handleAssignFundingSourceManager(
                                    source.id,
                                  )
                                }
                                className="rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                              >
                                Assign
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {assignedManagers.length === 0 ? (
                              <span className="text-xs text-muted">
                                No project admins assigned.
                              </span>
                            ) : null}
                            {assignedManagers.map((manager) => {
                              const managerProfile =
                                profileMap[manager.user_id];

                              return (
                                <span
                                  key={`${manager.funding_source_id}-${manager.user_id}`}
                                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs text-muted"
                                >
                                  {managerProfile?.full_name ||
                                    managerProfile?.email ||
                                    manager.user_id.slice(0, 8)}
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                      void handleRemoveFundingSourceManager(
                                        source.id,
                                        manager.user_id,
                                      )
                                    }
                                    className="font-semibold text-accent transition hover:text-foreground disabled:opacity-60"
                                    aria-label="Remove project admin"
                                  >
                                    x
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <input
                            value={draft.name}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "name",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          <input
                            value={draft.fundingAgency}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "fundingAgency",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            placeholder="Funding agency"
                          />
                          <input
                            value={draft.projectCode}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "projectCode",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            placeholder="Project code"
                          />
                          <input
                            value={draft.projectTitle}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "projectTitle",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            placeholder="Project title"
                          />
                          <input
                            value={draft.currency}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "currency",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm uppercase outline-none focus:border-brand"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.materialsBudget}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "materialsBudget",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            placeholder="Materials budget"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.activitiesBudget}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "activitiesBudget",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                            placeholder="Activities budget"
                          />
                          <input
                            type="date"
                            value={draft.startDate}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "startDate",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          <input
                            type="date"
                            value={draft.endDate}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "endDate",
                                event.target.value,
                              )
                            }
                            className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                          />
                          <textarea
                            value={draft.description}
                            onChange={(event) =>
                              updateFundingDraft(
                                source.id,
                                "description",
                                event.target.value,
                              )
                            }
                            className="min-h-20 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand md:col-span-2"
                          />
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleUpdateFundingSource(source.id)
                            }
                            className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                          >
                            Save Funding Source
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
                  Finished / Inactive Funding Sources
                </p>
                <div className="mt-4 grid gap-2">
                  {inactiveFundingSources.length === 0 ? (
                    <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                      No finished or inactive funding sources.
                    </div>
                  ) : null}

                  {inactiveFundingSources.map((source) => (
                    <div
                      key={source.id}
                      className="grid gap-3 rounded-md border border-line bg-white/55 px-3 py-2 text-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{source.name}</p>
                        {renderFundingMetadata(source)}
                        <p className="mt-1 text-xs text-muted">
                          Finished: {formatDate(source.finished_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            void handleReactivateFundingSource(source.id)
                          }
                          className="rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                        >
                          Reactivate
                        </button>
                        {!usedFundingSourceIds.includes(source.id) ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              void handleDeleteFundingSource(source.id)
                            }
                            className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
          ) : null}

          <section className="order-4 portal-card rounded-lg border border-line p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Materials / Merchant Merge
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Move duplicate merchant history
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Merge a typo or duplicate merchant into an existing active
              merchant. Purchase requests move to the target merchant, while
              the source merchant remains inactive for history.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Source merchant
                </span>
                <input
                  value={mergeSourceSearch}
                  onChange={(event) => setMergeSourceSearch(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                  placeholder="Search source merchant"
                />
                <select
                  value={mergeSourceMerchantId}
                  onChange={(event) =>
                    setMergeSourceMerchantId(event.target.value)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="">Select source merchant</option>
                  {sourceMerchantOptions.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name}
                      {merchant.is_active === false ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Target merchant
                </span>
                <input
                  value={mergeTargetSearch}
                  onChange={(event) => setMergeTargetSearch(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                  placeholder="Search active target merchant"
                />
                <select
                  value={mergeTargetMerchantId}
                  onChange={(event) =>
                    setMergeTargetMerchantId(event.target.value)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="">Select active target merchant</option>
                  {targetMerchantOptions.map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleMergeMerchants()}
                className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
              >
                Merge Merchant
              </button>
            </div>

            <div className="mt-4 grid gap-2 rounded-md border border-line bg-white/60 p-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Source
                </p>
                <p className="mt-1 font-semibold">
                  {mergeSourceMerchant?.name ?? "Not selected"}
                </p>
                {mergeSourceMerchant ? (
                  <p className="mt-1 text-xs text-muted">
                    normalized: {mergeSourceMerchant.normalized_name}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Target
                </p>
                <p className="mt-1 font-semibold">
                  {mergeTargetMerchant?.name ?? "Not selected"}
                </p>
                {mergeTargetMerchant ? (
                  <p className="mt-1 text-xs text-muted">
                    normalized: {mergeTargetMerchant.normalized_name}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="order-6 portal-card rounded-lg border border-line p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Activities / Activity Group Merge
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Move duplicate activity history
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Merge a typo or duplicate conference, analysis, or other activity
              group into an active target. Linked activity purchase requests
              move to the target group.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Source activity group
                </span>
                <input
                  value={activityMergeSourceSearch}
                  onChange={(event) =>
                    setActivityMergeSourceSearch(event.target.value)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                  placeholder="Search source activity group"
                />
                <select
                  value={activityMergeSourceId}
                  onChange={(event) => setActivityMergeSourceId(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="">Select source activity group</option>
                  {activitySourceOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {formatActivityType(group.activity_type)} - {group.name}
                      {group.is_active === false ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Target activity group
                </span>
                <input
                  value={activityMergeTargetSearch}
                  onChange={(event) =>
                    setActivityMergeTargetSearch(event.target.value)
                  }
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                  placeholder="Search active target activity group"
                />
                <select
                  value={activityMergeTargetId}
                  onChange={(event) => setActivityMergeTargetId(event.target.value)}
                  className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-brand"
                >
                  <option value="">Select active target activity group</option>
                  {activityTargetOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {formatActivityType(group.activity_type)} - {group.name}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={saving}
                onClick={() => void handleMergeActivityGroups()}
                className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
              >
                Merge Activity Group
              </button>
            </div>

            <div className="mt-4 grid gap-2 rounded-md border border-line bg-white/60 p-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Source
                </p>
                <p className="mt-1 font-semibold">
                  {activityMergeSourceGroup
                    ? `${formatActivityType(
                        activityMergeSourceGroup.activity_type,
                      )} - ${activityMergeSourceGroup.name}`
                    : "Not selected"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Target
                </p>
                <p className="mt-1 font-semibold">
                  {activityMergeTargetGroup
                    ? `${formatActivityType(
                        activityMergeTargetGroup.activity_type,
                      )} - ${activityMergeTargetGroup.name}`
                    : "Not selected"}
                </p>
              </div>
            </div>
          </section>

          <section
            id="activity-group-management"
            className="order-5 scroll-mt-28 portal-card rounded-lg border border-line p-6 shadow-panel"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Activities / Activity Group Management
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Conference, analysis, and activity groups
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Activity Groups are used for conference, analysis, and other
              activity requests. Review, edit, deactivate, and merge Activity
              Groups without changing material merchant records.
            </p>

            <div className="mt-6 grid gap-4">
              {renderActivityGroupList(
                "Needs Review Activity Groups",
                needsReviewActivityGroups,
                "review",
              )}
              {renderActivityGroupList(
                "Active Activity Groups",
                activeActivityGroups,
                "active",
              )}
              {renderActivityGroupList(
                "Inactive Activity Groups",
                inactiveActivityGroups,
                "inactive",
              )}
            </div>
          </section>

          <section
            id="merchant-management"
            className="order-3 scroll-mt-28 portal-card rounded-lg border border-line p-6 shadow-panel"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Materials / Merchant Management
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Compact merchant list
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Merchants are used for materials requests. Edit merchant display
              names, review newly added merchants, and deactivate incorrect
              entries without deleting merchant history.
            </p>

            <div className="mt-6 grid gap-4">
              {renderMerchantList(
                "Needs Review Merchants",
                needsReviewMerchants,
                "review",
              )}
              {renderMerchantList("Active Merchants", activeMerchants, "active")}
              {renderMerchantList(
                "Inactive Merchants",
                inactiveMerchants,
                "inactive",
              )}
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
