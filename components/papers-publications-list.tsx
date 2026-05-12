"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  ContributionBadge,
  HighlightedAuthors,
} from "@/components/publication-author-tools";
import { fetchVisiblePublications } from "@/lib/publications";
import { papers, type PublicationItem } from "@/lib/site-data";

function PublicationCard({ paper }: { paper: PublicationItem }) {
  return (
    <article className="elevated-card border border-line bg-white p-3 sm:p-4">
      <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-3 sm:grid-cols-[88px_minmax(0,1fr)] md:grid-cols-[132px_minmax(0,1fr)] lg:grid-cols-[152px_minmax(0,1fr)]">
        {paper.imageUrl ? (
          <div
            className="aspect-square w-full rounded-md bg-cover bg-center"
            style={{ backgroundImage: `url(${paper.imageUrl})` }}
            role="img"
            aria-label={paper.imageLabel}
          />
        ) : (
          <div
            className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-line bg-brand-soft text-brand"
            role="img"
            aria-label={paper.imageLabel}
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="hidden rounded-md bg-brand-soft p-1.5 text-brand sm:inline-flex">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-accent sm:text-xs">
              {paper.label}
            </span>
            <ContributionBadge contribution={paper.labContribution} />
          </div>
          <h2 className="mt-2 break-words text-base font-semibold leading-6 sm:text-lg sm:leading-7">
            {paper.doiUrl ? (
              <a
                href={paper.doiUrl}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-brand hover:underline hover:underline-offset-4"
              >
                {paper.title}
              </a>
            ) : (
              paper.title
            )}
          </h2>
          <p className="mt-1.5 break-words text-xs leading-5 text-muted sm:text-sm sm:leading-6">
            <HighlightedAuthors
              authors={paper.authors}
              highlightedAuthors={paper.highlightedAuthors}
            />
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground/75 sm:text-sm">
            {paper.journal} | {paper.year}
          </p>
          <p className="mt-2 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-muted sm:text-xs">
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
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[160px_1fr] lg:gap-8">
        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <p className="mb-3 hidden text-sm font-semibold uppercase tracking-[0.16em] text-brand lg:block">
            Years
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:grid lg:gap-2 lg:overflow-visible lg:pb-0">
            {years.map((year) => (
              <a
                key={year}
                href={`#year-${year}`}
                className="shrink-0 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:border-brand/40 hover:bg-brand-soft sm:text-sm lg:px-4"
              >
                {year}
              </a>
            ))}
          </nav>
        </aside>

        {years.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
            No publications are available yet.
          </div>
        ) : null}

        <div className="space-y-8 sm:space-y-10">
          {years.map((year) => (
            <section key={year} id={`year-${year}`} className="scroll-mt-28">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2 sm:mb-4">
                <h2 className="text-xl font-semibold sm:text-2xl">{year}</h2>
                <p className="text-sm text-muted">
                  {papersByYear[year].length} publication
                  {papersByYear[year].length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="space-y-3 sm:space-y-4">
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
