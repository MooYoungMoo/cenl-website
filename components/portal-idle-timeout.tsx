"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const idleTimeoutMs = 30 * 60 * 1000;
const warningTimeoutMs = 28 * 60 * 1000;
const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];

export function PortalIdleTimeout() {
  const pathname = usePathname();
  const router = useRouter();
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const portalTimerIsActive =
    pathname.startsWith("/portal") && pathname !== "/portal/login";

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }

    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await supabase.auth.signOut();
    router.replace("/portal/login?reason=timeout");
    router.refresh();
  }, [clearTimers, router]);

  const resetIdleTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    if (!portalTimerIsActive) {
      return;
    }

    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true);
    }, warningTimeoutMs);

    logoutTimerRef.current = window.setTimeout(() => {
      void handleTimeout();
    }, idleTimeoutMs);
  }, [clearTimers, handleTimeout, portalTimerIsActive]);

  useEffect(() => {
    if (!portalTimerIsActive) {
      clearTimers();
      const clearWarningTimer = window.setTimeout(() => {
        setShowWarning(false);
      }, 0);

      return () => {
        window.clearTimeout(clearWarningTimer);
      };
    }

    const listenerOptions: AddEventListenerOptions = { passive: true };
    const handleActivity = () => {
      resetIdleTimers();
    };
    const startTimer = window.setTimeout(() => {
      resetIdleTimers();
    }, 0);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, listenerOptions);
    });

    return () => {
      window.clearTimeout(startTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, listenerOptions);
      });
      clearTimers();
    };
  }, [clearTimers, portalTimerIsActive, resetIdleTimers]);

  if (!portalTimerIsActive || !showWarning) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] max-w-sm rounded-lg border border-accent/20 bg-white px-4 py-3 text-sm font-medium text-accent shadow-panel">
      You will be signed out soon due to inactivity.
    </div>
  );
}
