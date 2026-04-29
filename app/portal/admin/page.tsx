"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { PortalShell } from "@/components/portal-shell";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSource = {
  id: string;
  name: string;
  description: string | null;
  currency: string | null;
  materials_budget: number | null;
  activities_budget: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
};

type FundingSourceForm = {
  name: string;
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
  needs_review: boolean | null;
  is_active: boolean | null;
};

const emptyFundingForm: FundingSourceForm = {
  name: "",
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

function toFundingForm(source: FundingSource): FundingSourceForm {
  return {
    name: source.name ?? "",
    description: source.description ?? "",
    currency: source.currency ?? "KRW",
    materialsBudget: String(source.materials_budget ?? ""),
    activitiesBudget: String(source.activities_budget ?? ""),
    startDate: source.start_date ?? "",
    endDate: source.end_date ?? "",
  };
}

function parseBudget(value: string) {
  return value.trim() ? Number(value) : 0;
}

export default function AdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [fundingSources, setFundingSources] = useState<FundingSource[]>([]);
  const [merchantReviews, setMerchantReviews] = useState<MerchantReview[]>([]);
  const [fundingForm, setFundingForm] =
    useState<FundingSourceForm>(emptyFundingForm);
  const [fundingDrafts, setFundingDrafts] = useState<
    Record<string, FundingSourceForm>
  >({});
  const [merchantDrafts, setMerchantDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const userCanManage = canManage(role);

  const loadFundingSources = useCallback(async () => {
    const { data, error } = await supabase
      .from("funding_sources")
      .select(
        "id, name, description, currency, materials_budget, activities_budget, start_date, end_date, is_active",
      )
      .order("name", { ascending: true });

    if (error) {
      setFundingSources([]);
      setErrorMessage(error.message);
      return;
    }

    const nextSources = (data ?? []) as FundingSource[];
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
  }, []);

  const loadMerchantReviews = useCallback(async () => {
    const { data, error } = await supabase
      .from("merchants")
      .select("id, name, normalized_name, needs_review, is_active")
      .eq("needs_review", true)
      .order("created_at", { ascending: false });

    if (error) {
      setMerchantReviews([]);
      setErrorMessage(error.message);
      return;
    }

    const nextMerchants = (data ?? []) as MerchantReview[];
    setMerchantReviews(nextMerchants);
    setMerchantDrafts(
      nextMerchants.reduce<Record<string, string>>((accumulator, merchant) => {
        accumulator[merchant.id] = merchant.name;
        return accumulator;
      }, {}),
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
      setErrorMessage("Please sign in again before using Admin tools.");
      setLoading(false);
      return;
    }

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
      await Promise.all([loadFundingSources(), loadMerchantReviews()]);
    }

    setLoading(false);
  }, [loadFundingSources, loadMerchantReviews]);

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

  const getFundingPayload = (form: FundingSourceForm) => ({
    name: form.name.trim(),
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

  const handleToggleFundingSource = async (
    sourceId: string,
    nextActive: boolean,
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("funding_sources")
      .update({ is_active: nextActive })
      .eq("id", sourceId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage(
      nextActive ? "Funding source reactivated." : "Funding source deactivated.",
    );
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

    setSaving(true);

    const { error } = await supabase
      .from("merchants")
      .update({ name })
      .eq("id", merchantId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccessMessage("Merchant name updated.");
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
              {fundingSources.length === 0 ? (
                <div className="rounded-md border border-dashed border-line p-6 text-sm text-muted">
                  No funding sources have been created yet.
                </div>
              ) : null}

              {fundingSources.map((source) => {
                const draft = fundingDrafts[source.id] ?? toFundingForm(source);

                return (
                  <article
                    key={source.id}
                    className="rounded-md border border-line bg-white/75 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand">
                        {source.is_active === false ? "Inactive" : "Active"}
                      </p>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleToggleFundingSource(
                            source.id,
                            source.is_active === false,
                          )
                        }
                        className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                      >
                        {source.is_active === false ? "Reactivate" : "Deactivate"}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input
                        value={draft.name}
                        onChange={(event) =>
                          updateFundingDraft(source.id, "name", event.target.value)
                        }
                        className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
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
                        onClick={() => void handleUpdateFundingSource(source.id)}
                        className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                      >
                        Save Funding Source
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="portal-card rounded-lg border border-line p-6 shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Merchant Review
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              New merchants needing review
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Review display names for newly added merchants. Deactivate
              obvious duplicates or incorrect entries; merging can be added
              later.
            </p>

            <div className="mt-6 grid gap-3">
              {merchantReviews.length === 0 ? (
                <div className="rounded-md border border-dashed border-line p-6 text-sm text-muted">
                  No merchants need review.
                </div>
              ) : null}

              {merchantReviews.map((merchant) => (
                <article
                  key={merchant.id}
                  className="rounded-md border border-line bg-white/75 p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <input
                        value={merchantDrafts[merchant.id] ?? merchant.name}
                        onChange={(event) =>
                          setMerchantDrafts((current) => ({
                            ...current,
                            [merchant.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
                      />
                      <p className="mt-2 text-xs text-muted">
                        Normalized: {merchant.normalized_name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Status:{" "}
                        {merchant.is_active === false ? "inactive" : "active"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleSaveMerchantName(merchant.id)}
                        className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-60"
                      >
                        Save Name
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          void handleMarkMerchantReviewed(merchant.id)
                        }
                        className="rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:bg-white disabled:opacity-60"
                      >
                        Mark Reviewed
                      </button>
                      <button
                        type="button"
                        disabled={saving || merchant.is_active === false}
                        onClick={() => void handleDeactivateMerchant(merchant.id)}
                        className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent disabled:opacity-60"
                      >
                        Deactivate
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
