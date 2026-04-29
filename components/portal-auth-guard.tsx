"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type PortalAuthGuardProps = {
  children: React.ReactNode;
};

export function PortalAuthGuard({ children }: PortalAuthGuardProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(currentSession);
      setLoading(false);

      if (!currentSession) {
        router.replace("/portal/login");
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);

      if (!currentSession) {
        router.replace("/portal/login");
      }
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
