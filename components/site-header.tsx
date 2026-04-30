"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigation, siteMeta } from "@/lib/site-data";
import {
  fallbackSiteSettings,
  fetchSiteSettings,
  type SiteSettingsContent,
} from "@/lib/site-settings";

export function SiteHeader() {
  const pathname = usePathname();
  const [settings, setSettings] =
    useState<SiteSettingsContent>(fallbackSiteSettings);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const nextSettings = await fetchSiteSettings();

        if (mounted && nextSettings) {
          setSettings(nextSettings);
        }
      } catch {
        if (mounted) {
          setSettings(fallbackSiteSettings);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-surface/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between md:py-4">
        <Link
          href="/"
          className="brand-mark flex h-10 w-fit max-w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-brand/20 bg-brand px-3 text-sm font-semibold text-white md:h-11"
          aria-label={settings.siteName || siteMeta.fullName}
        >
          {settings.logoUrl ? (
            <span
              className="h-6 w-6 rounded-md bg-white/95 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${settings.logoUrl})` }}
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{settings.headerLabel || siteMeta.shortName}</span>
        </Link>
        <nav
          className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 text-sm font-semibold md:justify-end md:gap-2 md:pb-0"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link shrink-0 rounded-md px-2.5 py-2 md:px-3 ${
                  active ? "nav-link-active" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
