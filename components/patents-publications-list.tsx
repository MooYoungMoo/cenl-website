"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { fetchVisiblePatents } from "@/lib/patents";
import { patents as fallbackPatents, type PatentItem } from "@/lib/site-data";

function formatDate(value?: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function PatentCard({ patent }: { patent: PatentItem }) {
  const dateItems = [
    patent.filingDate ? `Filed: ${formatDate(patent.filingDate)}` : "",
    patent.publicationDate
      ? `Published: ${formatDate(patent.publicationDate)}`
      : "",
    patent.registrationDate
      ? `Registered: ${formatDate(patent.registrationDate)}`
      : "",
  ].filter(Boolean);

  return (
    <article className="elevated-card border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex rounded-md bg-brand-soft p-2 text-brand">
            <ScrollText className="h-4 w-4" />
          </span>
          <h2 className="mt-4 break-words text-xl font-semibold">
            {patent.title}
          </h2>
          <p className="mt-3 break-words text-sm leading-7 text-muted">
            {patent.inventors}
          </p>
        </div>
        <span className="rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
          {patent.status}
        </span>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
        {patent.country ? <p>Country: {patent.country}</p> : null}
        {patent.patentNumber ? (
          <p>Patent No.: {patent.patentNumber}</p>
        ) : null}
        {patent.applicationNumber ? (
          <p>Application No.: {patent.applicationNumber}</p>
        ) : null}
        {patent.assignee ? <p>Assignee: {patent.assignee}</p> : null}
      </div>

      {dateItems.length > 0 ? (
        <p className="mt-3 text-sm text-muted">{dateItems.join(" / ")}</p>
      ) : null}

      {patent.description ? (
        <p className="mt-4 break-words text-sm leading-7 text-muted">
          {patent.description}
        </p>
      ) : null}
    </article>
  );
}

export function PatentsPublicationsList() {
  const [items, setItems] = useState<PatentItem[]>(fallbackPatents);

  useEffect(() => {
    let mounted = true;

    const loadPatents = async () => {
      try {
        const patents = await fetchVisiblePatents();

        if (mounted && patents.length > 0) {
          setItems(patents);
        }
      } catch {
        if (mounted) {
          setItems(fallbackPatents);
        }
      }
    };

    void loadPatents();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-6">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No patent records are available yet.
        </div>
      ) : null}

      <div className="space-y-5">
        {items.map((patent) => (
          <PatentCard key={patent.id} patent={patent} />
        ))}
      </div>
    </section>
  );
}
