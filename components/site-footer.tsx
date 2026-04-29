"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { contactDetails, navigation } from "@/lib/site-data";
import {
  fallbackSiteSettings,
  fetchSiteSettings,
  type SiteSettingsContent,
} from "@/lib/site-settings";

export function SiteFooter() {
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
    <footer className="border-t border-line/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_0.8fr_1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand">
            {settings.footerText}
          </p>
          <p className="max-w-md text-sm leading-7 text-muted">
            Advancing chemoelectronic nanomaterials, sensor platforms, and
            chemical data intelligence through careful experimental research.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
            Explore
          </p>
          <div className="grid gap-2 text-sm text-muted">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">
            Contact
          </p>
          <div className="grid gap-1 text-sm leading-7 text-muted">
            <p>{contactDetails.lab}</p>
            <p>Contact person: {contactDetails.contactPerson}</p>
            <p>Role: {contactDetails.role}</p>
            <p>Email: {contactDetails.emails[0]}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
