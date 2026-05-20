"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fallbackContactContent,
  fetchContactContent,
  type ContactPageContent,
} from "@/lib/contact";
import { navigation } from "@/lib/site-data";
import {
  fallbackSiteSettings,
  fetchSiteSettings,
  type SiteSettingsContent,
} from "@/lib/site-settings";

function isVisibleContactValue(value: string) {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized) && normalized !== "tbd";
}

function normalizeFooterText(value: string) {
  return value.replace(/\bCENT@KNU\b/g, "CENL");
}

export function SiteFooter() {
  const [settings, setSettings] =
    useState<SiteSettingsContent>(fallbackSiteSettings);
  const [contact, setContact] =
    useState<ContactPageContent>(fallbackContactContent);

  useEffect(() => {
    let mounted = true;

    const loadFooterData = async () => {
      const [settingsResult, contactResult] = await Promise.allSettled([
        fetchSiteSettings(),
        fetchContactContent(),
      ]);

      if (!mounted) {
        return;
      }

      setSettings(
        settingsResult.status === "fulfilled" && settingsResult.value
          ? settingsResult.value
          : fallbackSiteSettings,
      );
      setContact(
        contactResult.status === "fulfilled" && contactResult.value
          ? contactResult.value
          : fallbackContactContent,
      );
    };

    void loadFooterData();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <footer className="border-t border-line/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_0.8fr_1fr] md:py-14">
        <div className="space-y-4">
          <p className="break-words text-sm font-semibold uppercase tracking-[0.18em] text-brand sm:tracking-[0.28em]">
            {normalizeFooterText(settings.footerText)}
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
            {isVisibleContactValue(contact.labName) ? (
              <p>{contact.labName}</p>
            ) : null}
            {isVisibleContactValue(contact.contactPerson) ? (
              <p>Contact person: {contact.contactPerson}</p>
            ) : null}
            {isVisibleContactValue(contact.contactRole) ? (
              <p>Role: {contact.contactRole}</p>
            ) : null}
            {isVisibleContactValue(contact.contactEmail) ? (
              <a
                href={`mailto:${contact.contactEmail}`}
                className="w-fit break-all text-brand transition hover:text-foreground"
              >
                {contact.contactEmail}
              </a>
            ) : null}
            {isVisibleContactValue(contact.address) ? (
              <p>{contact.address}</p>
            ) : null}
            {isVisibleContactValue(contact.mapUrl) ? (
              <a
                href={contact.mapUrl.trim()}
                target="_blank"
                rel="noreferrer"
                className="w-fit text-brand transition hover:text-foreground"
              >
                Open campus map
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
