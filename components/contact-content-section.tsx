"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Mail } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  fallbackContactContent,
  fetchContactContent,
  type ContactPageContent,
} from "@/lib/contact";

function emailLink(email: string) {
  return email && email !== "TBD" ? (
    <a
      key={email}
      href={`mailto:${email}`}
      className="block w-fit max-w-full break-all font-medium text-brand transition hover:text-foreground"
    >
      {email}
    </a>
  ) : (
    <p key={email || "TBD"}>TBD</p>
  );
}

export function ContactContentSection() {
  const [content, setContent] =
    useState<ContactPageContent>(fallbackContactContent);

  useEffect(() => {
    let mounted = true;

    const loadContactContent = async () => {
      try {
        const nextContent = await fetchContactContent();

        if (mounted && nextContent) {
          setContent(nextContent);
        }
      } catch {
        if (mounted) {
          setContent(fallbackContactContent);
        }
      }
    };

    void loadContactContent();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <article className="elevated-card min-w-0 border border-line bg-white p-5 sm:p-7">
          <GraduationCap className="h-6 w-6 text-brand" />
          <h2 className="mt-4 break-words text-2xl font-semibold">
            {content.recruitingTitle}
          </h2>
          <p className="mt-3 break-words text-sm leading-7 text-muted">
            {content.recruitingDescription}
          </p>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Recruiting areas
              </p>
              <div className="mt-2 space-y-2 text-sm leading-7 text-muted">
                {content.recruitingAreas.map((area) => (
                  <p key={area}>{area}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Application contact
              </p>
              <div className="mt-2 space-y-2 text-sm leading-7 text-muted">
                {content.applicationEmails.map(emailLink)}
              </div>
            </div>
          </div>
        </article>

        <article className="elevated-card min-w-0 border border-line bg-white p-5 sm:p-7">
          <Mail className="h-6 w-6 text-brand" />
          <h2 className="mt-4 break-words text-2xl font-semibold">
            Lab Contact
          </h2>
          <div className="mt-6 space-y-5">
            {[
              ["Lab", content.labName],
              ["Contact person", content.contactPerson],
              ["Role", content.contactRole],
              ["Address", content.address],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  {label}
                </p>
                <div className="mt-2 break-words text-sm leading-7 text-muted">
                  <p>{value}</p>
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                Email
              </p>
              <div className="mt-2 text-sm leading-7 text-muted">
                {emailLink(content.contactEmail)}
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Campus Map
          </p>
          {content.mapUrl ? (
            <a
              href={content.mapUrl}
              className="text-sm font-semibold text-brand transition hover:text-foreground"
            >
              Open map
            </a>
          ) : null}
        </div>
        {content.mapEmbedUrl ? (
          <iframe
            src={content.mapEmbedUrl}
            title="Campus Map"
            className="min-h-[280px] w-full rounded-lg border border-line bg-white shadow-panel sm:min-h-[360px]"
            loading="lazy"
          />
        ) : (
          <VisualPlaceholder
            label="Campus Map"
            className="min-h-[280px] sm:min-h-[360px]"
          />
        )}
      </div>
    </section>
  );
}
