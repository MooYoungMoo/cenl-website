"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    const reason = new URLSearchParams(window.location.search).get("reason");

    return reason === "timeout"
      ? "You were signed out due to inactivity."
      : "";
  });
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

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
          Lab members can sign in with an email and password managed by Supabase
          Auth. Database-backed portal workflows are not connected yet.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-[#16242d] p-8 text-white shadow-panel md:p-10">
        <div className="mx-auto max-w-md">
          <LockKeyhole className="h-8 w-8 text-brand-soft" />
          <h2 className="mt-6 text-3xl font-semibold">CENL Member Login</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Enter your lab portal email and password.
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
          </form>
        </div>
      </div>
    </section>
  );
}
