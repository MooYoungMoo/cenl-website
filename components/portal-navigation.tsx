"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import {
  filterPortalNavigationSections,
  getEnabledWebsiteSectionsFromRows,
  normalizePortalRole,
} from "@/lib/portal-permissions";
import { portalNavigationSections } from "@/lib/site-data";
import { supabase } from "@/lib/supabase/client";

type Profile = {
  role: string | null;
};

type FundingSourceManager = {
  funding_source_id: string;
};

type WebsitePermission = {
  section: string | null;
  is_enabled: boolean | null;
};

export function PortalNavigation() {
  const [role, setRole] = useState<string | null>(null);
  const [isProjectAdmin, setIsProjectAdmin] = useState(false);
  const [enabledWebsiteSections, setEnabledWebsiteSections] = useState<string[]>(
    [],
  );

  useEffect(() => {
    let mounted = true;

    const loadNavigationAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) {
        return;
      }

      const [profileResult, managersResult, permissionsResult] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
        supabase
          .from("funding_source_managers")
          .select("funding_source_id")
          .eq("user_id", user.id),
        supabase
          .from("website_management_permissions")
          .select("section, is_enabled")
          .eq("user_id", user.id),
      ]);

      if (!mounted) {
        return;
      }

      setRole(
        normalizePortalRole((profileResult.data as Profile | null)?.role ?? null),
      );
      setIsProjectAdmin(
        ((managersResult.data ?? []) as FundingSourceManager[]).length > 0,
      );
      setEnabledWebsiteSections(
        getEnabledWebsiteSectionsFromRows(
          (permissionsResult.data ?? []) as WebsitePermission[],
        ),
      );
    };

    void loadNavigationAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleSections = useMemo(
    () =>
      filterPortalNavigationSections({
        sections: portalNavigationSections,
        role,
        isProjectAdmin,
        enabledWebsiteSections,
      }),
    [enabledWebsiteSections, isProjectAdmin, role],
  );

  return (
    <nav className="mt-6 grid gap-4 lg:mt-7 lg:gap-5">
      {visibleSections.map((section) => (
        <div key={section.title}>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
            {section.title}
          </p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1 lg:gap-1.5">
            {section.links.map((link) => {
              const Icon = link.icon;
              return link.locked ? (
                <div
                  key={link.href}
                  className="rounded-md border border-dashed border-line/70 px-3 py-2 text-muted opacity-80"
                  aria-disabled="true"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-line/60 p-1.5 text-muted">
                      <LockKeyhole className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 text-sm font-semibold">
                      {link.label}
                    </span>
                    <span className="ml-auto rounded-full bg-line/70 px-2 py-0.5 text-[0.65rem] font-semibold">
                      Locked
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 pl-8 text-xs leading-5 text-muted">
                    Additional permissions are required.
                  </p>
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group rounded-md border border-transparent px-3 py-2 transition hover:border-line/70 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md bg-brand/10 p-1.5 text-brand transition group-hover:bg-brand-soft">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 text-sm font-semibold">
                      {link.label}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 pl-8 text-xs leading-5 text-muted">
                    {link.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
