"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ShieldCheck, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type SignupForm = {
  fullName: string;
  email: string;
  password: string;
  affiliation: string;
  position: string;
  signupNote: string;
};

type ExistingProfile = {
  role: string | null;
  approval_status: string | null;
};

const emptyForm: SignupForm = {
  fullName: "",
  email: "",
  password: "",
  affiliation: "",
  position: "",
  signupNote: "",
};

function isEmailConfirmationMessage(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email") &&
    (normalized.includes("confirm") || normalized.includes("confirmation"))
  );
}

export default function PortalSignupPage() {
  const [form, setForm] = useState<SignupForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field: keyof SignupForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName || !email || !form.password) {
      setError("Full name, email, and password are required.");
      return;
    }

    setLoading(true);
    const requestedAt = new Date().toISOString();

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          affiliation: form.affiliation.trim() || null,
          position: form.position.trim() || null,
          role: "student",
          approval_status: "pending",
          requested_at: requestedAt,
          approved_at: null,
          approved_by: null,
          rejected_at: null,
          rejected_by: null,
          signup_note: form.signupNote.trim() || null,
        },
      },
    });

    if (signupError) {
      setError(
        isEmailConfirmationMessage(signupError.message)
          ? "Email confirmation may be required. Please confirm your email address, then wait for professor/admin approval."
          : signupError.message,
      );
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError(
        "Your account was created, but the profile request could not be prepared. Please contact the lab administrator.",
      );
      setLoading(false);
      return;
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role, approval_status")
      .eq("id", data.user.id)
      .maybeSingle();

    const existingRole =
      ((existingProfile as ExistingProfile | null)?.role ?? "")
        .trim()
        .toLowerCase();
    const existingApproval =
      (
        (existingProfile as ExistingProfile | null)?.approval_status ?? ""
      )
        .trim()
        .toLowerCase();
    const isProtectedExistingProfile =
      (existingRole === "professor" || existingRole === "admin") &&
      existingApproval === "approved";

    if (isProtectedExistingProfile) {
      setError(
        "This account already has protected portal access. Please sign in instead.",
      );
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        affiliation: form.affiliation.trim() || null,
        position: form.position.trim() || null,
        role: "student",
        approval_status: "pending",
        requested_at: requestedAt,
        approved_at: null,
        approved_by: null,
        rejected_at: null,
        rejected_by: null,
        signup_note: form.signupNote.trim() || null,
      },
      { onConflict: "id" },
    );

    if (profileError && data.session) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (profileError) {
      console.warn("Profile access request will rely on auth metadata:", profileError.message);
    }

    await supabase.auth.signOut();
    setForm(emptyForm);
    setSuccess(
      data.session
        ? "Your access request has been submitted. You can log in after a professor/admin approves your account."
        : "Your access request was submitted. If email confirmation is enabled, please confirm your email first. You can access the Lab Portal after professor/admin approval.",
    );
    setLoading(false);
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Access Request
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
          Request CENL Lab Portal access
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
          New lab members can request a portal account here. Access remains
          locked until a professor/admin reviews and approves the request.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-[#16242d] p-8 text-white shadow-panel md:p-10">
        <div className="mx-auto max-w-md">
          <UserPlus className="h-8 w-8 text-brand-soft" />
          <h2 className="mt-6 text-3xl font-semibold">Member Sign-Up</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Sign-up requests are created as student accounts and reviewed before
            portal access is enabled.
          </p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {success ? (
              <div className="rounded-md border border-brand-soft/40 bg-white/10 px-4 py-3 text-sm text-brand-soft">
                {success}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-md border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm text-white/75">
                Full Name
              </label>
              <input
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                placeholder="Young-Moo Jo"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/75">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                placeholder="name@university.edu"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/75">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                placeholder="Choose a secure password"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-white/75">
                  Affiliation
                </label>
                <input
                  value={form.affiliation}
                  onChange={(event) =>
                    updateField("affiliation", event.target.value)
                  }
                  className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                  placeholder="TBD"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/75">
                  Position
                </label>
                <input
                  value={form.position}
                  onChange={(event) =>
                    updateField("position", event.target.value)
                  }
                  className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                  placeholder="Graduate student"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/75">
                Sign-up Note / Reason
              </label>
              <textarea
                value={form.signupNote}
                onChange={(event) =>
                  updateField("signupNote", event.target.value)
                }
                rows={4}
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
                placeholder="Briefly describe your lab role or reason for access."
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="action-button action-button-secondary flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Submitting..." : "Submit Access Request"}
            </button>
            <p className="text-center text-sm text-white/70">
              Already approved?{" "}
              <Link
                href="/portal/login"
                className="font-semibold text-brand-soft underline-offset-4 transition hover:text-white hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
