"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ApprovalProfile = {
  approval_status: string | null;
};

async function getApprovalStatus(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Unable to check portal approval status:", error.message);
    return "pending";
  }

  if (!data) {
    return "pending";
  }

  return ((data as ApprovalProfile).approval_status ?? "approved")
    .trim()
    .toLowerCase();
}

function isEmailNotConfirmedError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("email") &&
    (normalized.includes("not confirmed") ||
      normalized.includes("confirm your email") ||
      normalized.includes("email confirmation"))
  );
}

function getLoginNotice() {
  if (typeof window === "undefined") {
    return "";
  }

  const reason = new URLSearchParams(window.location.search).get("reason");

  if (reason === "timeout") {
    return "You were signed out due to inactivity.";
  }

  if (reason === "pending") {
    return "Your account is waiting for professor/admin approval.";
  }

  if (reason === "rejected") {
    return "Your access request was not approved. Please contact the lab administrator.";
  }

  return "";
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice] = useState(getLoginNotice);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (session) {
        const approvalStatus = await getApprovalStatus(session.user.id);

        if (approvalStatus === "pending" || approvalStatus === "rejected") {
          await supabase.auth.signOut();
          router.replace(`/portal/login?reason=${approvalStatus}`);
          return;
        }

        router.replace("/portal");
        return;
      }

      setCheckingSession(false);
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      setError(
        isEmailNotConfirmedError(signInError.message)
          ? "Please confirm your email address first, then wait for professor/admin approval."
          : signInError.message,
      );
      return;
    }

    if (data.user) {
      const approvalStatus = await getApprovalStatus(data.user.id);

      if (approvalStatus === "pending" || approvalStatus === "rejected") {
        await supabase.auth.signOut();
        setLoading(false);
        router.replace(`/portal/login?reason=${approvalStatus}`);
        return;
      }
    }

    setLoading(false);
    router.replace("/portal");
    router.refresh();
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Portal Access
        </p>
        <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
          Sign in to the CENL Lab Portal
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-muted">
          Lab members can sign in with an approved email and password managed by
          Supabase Auth. New access requests are reviewed by a professor/admin.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-[#16242d] p-8 text-white shadow-panel md:p-10">
        <div className="mx-auto max-w-md">
          <LockKeyhole className="h-8 w-8 text-brand-soft" />
          <h2 className="mt-6 text-3xl font-semibold">CENL Member Login</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Enter your lab portal email and password. New members can request
            access for professor/admin approval.
          </p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {notice ? (
              <div className="rounded-md border border-brand-soft/40 bg-white/10 px-4 py-3 text-sm text-brand-soft">
                {notice}
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm text-white/75">
                Institutional Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="name@university.edu"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/75">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="password"
                className="w-full rounded-md border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40"
              />
            </div>
            {error ? (
              <div className="rounded-md border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading || checkingSession}
              className="action-button action-button-secondary flex w-full items-center justify-center gap-2 rounded-md bg-white px-4 py-3 font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-70"
            >
              <ShieldCheck className="h-4 w-4" />
              {loading || checkingSession ? "Checking..." : "Sign In"}
            </button>
            <p className="text-center text-sm text-white/70">
              Need portal access?{" "}
              <Link
                href="/portal/signup"
                className="font-semibold text-brand-soft underline-offset-4 transition hover:text-white hover:underline"
              >
                Request access
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
