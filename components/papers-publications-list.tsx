"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchVisiblePublications } from "@/lib/publications";
import { papers, type PublicationItem } from "@/lib/site-data";

function PublicationCard({ paper }: { paper: PublicationItem }) {
  return (
    <article className="elevated-card border border-line bg-white p-6">
      <div className="grid gap-5 md:grid-cols-[140px_1fr]">
        {paper.imageUrl ? (
          <div
            className="min-h-32 rounded-md bg-cover bg-center"
            style={{ backgroundImage: `url(${paper.imageUrl})` }}
            role="img"
            aria-label={paper.imageLabel}
          />
        ) : (
          <VisualPlaceholder
            label={paper.imageLabel}
            className="min-h-32 rounded-md"
          />
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-soft p-2 text-brand">
              <FileText className="h-4 w-4" />
            </span>
            <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
              {paper.label}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-semibold">{paper.title}</h2>
          <p className="mt-3 text-sm leading-7 text-muted">{paper.authors}</p>
          <p className="mt-1 text-sm text-muted">
            {paper.journal} | {paper.year}
          </p>
          {paper.doiUrl ? (
            <a
              href={paper.doiUrl}
              className="mt-4 inline-flex text-sm font-medium text-brand transition hover:text-foreground"
            >
              DOI: {paper.doi}
            </a>
          ) : (
            <p className="mt-4 text-sm font-medium text-muted">
              DOI: {paper.doi}
            </p>
          )}
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Citations placeholder ready
          </p>
        </div>
      </div>
    </article>
  );
}

export function PapersPublicationsList() {
  const [items, setItems] = useState<PublicationItem[]>(papers);

  useEffect(() => {
    let mounted = true;

    const loadPublications = async () => {
      try {
        const publications = await fetchVisiblePublications();

        if (mounted && publications.length > 0) {
          setItems(publications);
        }
      } catch {
        if (mounted) {
          setItems(papers);
        }
      }
    };

    void loadPublications();

    return () => {
      mounted = false;
    };
  }, []);

  const papersByYear = useMemo(
    () =>
      items.reduce<Record<string, PublicationItem[]>>((groups, paper) => {
        groups[paper.year] = [...(groups[paper.year] ?? []), paper];
        return groups;
      }, {}),
    [items],
  );

  const years = useMemo(
    () => Object.keys(papersByYear).sort((a, b) => Number(b) - Number(a)),
    [papersByYear],
  );

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-3 hidden text-sm font-semibold uppercase tracking-[0.16em] text-brand lg:block">
            Years
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:gap-2 lg:overflow-visible lg:pb-0">
            {years.map((year) => (
              <a
                key={year}
                href={`#year-${year}`}
                className="shrink-0 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-brand/40 hover:bg-brand-soft"
              >
                {year}
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-12">
          {years.map((year) => (
            <section key={year} id={`year-${year}`} className="scroll-mt-28">
              <div className="mb-5 flex items-end justify-between border-b border-line pb-3">
                <h2 className="text-3xl font-semibold">{year}</h2>
                <p className="text-sm text-muted">
                  {papersByYear[year].length} publication
                  {papersByYear[year].length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-5">
                {papersByYear[year].map((paper) => (
                  <PublicationCard key={paper.id} paper={paper} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
