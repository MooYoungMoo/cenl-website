"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PortalShell } from "@/components/portal-shell";
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

type FundingUsage = {
  funding_source_id: string | null;
};

type MerchantUsage = {
  merchant_id: string | null;
};

type ManagedProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  affiliation: string | null;
  position: string | null;
  created_at: string | null;
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

function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
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
  const [usedMerchantIds, setUsedMerchantIds] = useState<string[]>([]);
  const [merchantReviews, setMerchantReviews] = useState<MerchantReview[]>([]);
  const [profiles, setProfiles] = useState<ManagedProfile[]>([]);
  const [profileDrafts, setProfileDrafts] = useState<
    Record<string, ManagedProfileForm>
  >({});
  const [fundingForm, setFundingForm] =
    useState<FundingSourceForm>(emptyFundingForm);
  const [fundingDrafts, setFundingDrafts] = useState<
    Record<string, FundingSourceForm>
  >({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>(
    {},
  );
  const [mergeSourceSearch, setMergeSourceSearch] = useState("");
  const [mergeTargetSearch, setMergeTargetSearch] = useState("");
  const [mergeSourceMerchantId, setMergeSourceMerchantId] = useState("");
  const [mergeTargetMerchantId, setMergeTargetMerchantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManage = canManage(role);

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

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((first, second) =>
        (first.full_name || first.email || "").localeCompare(
          second.full_name || second.email || "",
        ),
      ),
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

  const loadProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, affiliation, position, created_at")
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

    if (canManage(nextRole)) {
      await Promise.all([
        loadFundingSources(),
        loadMerchantReviews(),
        loadProfiles(),
      ]);
    }

    setLoading(false);
  }, [loadFundingSources, loadMerchantReviews, loadProfiles]);

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

    if (!userCanManage) {
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

    if (!["student", "professor", "admin"].includes(nextRole)) {
      setErrorMessage("Role must be student, professor, or admin.");
      return;
    }

    const currentRole = (profile.role ?? "").toLowerCase();
    const isSelfDowngrade =
      profile.id === currentUserId &&
      (currentRole === "professor" || currentRole === "admin") &&
      nextRole === "student";

    if (isSelfDowngrade) {
      const confirmed = window.confirm(
        "You are changing your own role from professor/admin to student. You may lose access to Admin tools. Continue?",
      );

      if (!confirmed) {
        return;
      }
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

    setSuccessMessage("User profile updated.");
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

    setSuccessMessage("Funding source updated.");
    setSaving(false);
    await loadFundingSources();
  };

  const handleFinishFundingSource = async (sourceId: string) => {
    setErrorMessage("");
    setSuccessMessage("");
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
      "Delete this unused funding source? This cannot be undone.",
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
      "Deactivate this merchant? Existing purchase requests will remain unchanged.",
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
      "Delete this inactive unused merchant? This cannot be undone.",
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
      `This will move all purchase requests from ${mergeSourceMerchant.name} to ${mergeTargetMerchant.name}. This cannot be automatically undone.`,
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

  const renderUserManagement = () => (
    <section className="portal-card rounded-lg border border-line p-6 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            User Management
          </p>
          <h3 className="mt-3 text-2xl font-semibold">Portal users</h3>
          <p className="mt-3 text-sm leading-7 text-muted">
            Edit profile labels and portal roles. Account creation and email
            invitations are intentionally not implemented yet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadProfiles()}
          className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
        >
          Refresh Users
        </button>
      </div>

      {sortedProfiles.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-line p-5 text-sm text-muted">
          No profiles are available.
        </div>
      ) : null}

      {sortedProfiles.length > 0 ? (
        <div className="mt-5 overflow-x-auto rounded-md border border-line bg-white/60">
          <div className="min-w-[980px] divide-y divide-line">
            <div className="grid grid-cols-[1.1fr_1.2fr_0.8fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Affiliation</span>
              <span>Position</span>
              <span>Created</span>
              <span className="text-right">Action</span>
            </div>
            {sortedProfiles.map((profile) => {
              const draft = profileDrafts[profile.id] ?? toProfileForm(profile);

              return (
                <div
                  key={profile.id}
                  className="grid grid-cols-[1.1fr_1.2fr_0.8fr_1fr_1fr_0.8fr_auto] gap-3 px-3 py-2 text-sm"
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
                  </select>
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
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleUpdateProfile(profile)}
                    className="rounded-md border border-brand/30 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                  >
                    Save
                  </button>
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

  return (
    <PortalShell
      title="Admin"
      description="Manage funding sources and review new merchant records."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Admin
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Lab portal operations</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Manage the lightweight operational records used by payment tracking.
        Full content management, file uploads, and notifications are still
        intentionally out of scope.
      </p>

      {loading ? (
        <div className="portal-card mt-8 rounded-md border border-line p-5 text-sm text-muted">
          Loading admin tools...
        </div>
      ) : null}

      {!loading && !userCanManage ? (
        <div className="mt-8 rounded-md bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
          You do not have permission to manage funding sources or merchants.
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

      {!loading && userCanManage ? (
        <div className="mt-8 grid gap-8">
          {renderUserManagement()}

          <section className="portal-card rounded-lg border border-line p-6 shadow-panel">
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
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Active Funding Sources
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

          <section className="portal-card rounded-lg border border-line p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Merge Merchants
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

          <section className="portal-card rounded-lg border border-line p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Merchant Management
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Compact merchant list
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Edit merchant display names, review newly added merchants, and
              deactivate incorrect entries without deleting merchant history.
              Deactivated merchants remain visible here but no longer appear in
              the purchase request selector.
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
