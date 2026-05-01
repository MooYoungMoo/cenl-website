"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type PortalAuthGuardProps = {
  children: React.ReactNode;
};

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
    return null;
  }

  return (
    ((data as ApprovalProfile | null)?.approval_status ?? null)?.toLowerCase() ??
    null
  );
}

export function PortalAuthGuard({ children }: PortalAuthGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let approvalRedirecting = false;

    const resolveSession = async (currentSession: Session | null) => {
      if (!mounted) {
        return;
      }

      if (!currentSession) {
        setSession(null);
        setLoading(false);
        if (!approvalRedirecting) {
          router.replace("/portal/login");
        }
        return;
      }

      const approvalStatus = await getApprovalStatus(currentSession.user.id);

      if (!mounted) {
        return;
      }

      if (approvalStatus === "pending" || approvalStatus === "rejected") {
        approvalRedirecting = true;
        await supabase.auth.signOut();

        if (!mounted) {
          return;
        }

        setSession(null);
        setLoading(false);
        router.replace(`/portal/login?reason=${approvalStatus}`);
        return;
      }

      setSession(currentSession);
      setLoading(false);
    };

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      await resolveSession(currentSession);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setLoading(true);
      void resolveSession(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading || !session) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-lg border border-line bg-white p-8 text-sm text-muted shadow-panel">
          Checking lab portal session...
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
