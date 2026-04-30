"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  ContributionBadge,
  HighlightedAuthors,
} from "@/components/publication-author-tools";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import type { PublicationItem } from "@/lib/site-data";

type PublicationCarouselProps = {
  items: PublicationItem[];
};

export function PublicationCarousel({ items }: PublicationCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction === "left" ? -scroller.clientWidth : scroller.clientWidth,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div className="mb-5 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Previous publications"
          onClick={() => scrollByCard("left")}
          className="action-button action-button-secondary inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next publications"
          onClick={() => scrollByCard("right")}
          className="action-button action-button-secondary inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No featured publications are available yet.
        </div>
      ) : null}
      <div ref={scrollerRef} className="flex snap-x gap-5 overflow-x-auto pb-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="elevated-card min-w-[90%] snap-start overflow-hidden border border-line bg-white sm:min-w-[58%] lg:min-w-[calc((100%_-_1.25rem)/2)]"
          >
            {item.imageUrl ? (
              <div
                className="aspect-square rounded-none bg-cover bg-center"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
                role="img"
                aria-label={item.imageLabel}
              />
            ) : (
              <VisualPlaceholder
                label={item.imageLabel}
                className="aspect-square min-h-0 rounded-none"
              />
            )}
            <div className="min-w-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                  {item.label}
                </span>
                <ContributionBadge contribution={item.labContribution} />
              </div>
              <h3 className="mt-4 break-words text-lg font-semibold leading-snug">
                {item.title}
              </h3>
              <p className="mt-3 break-words text-sm leading-6 text-muted">
                <HighlightedAuthors
                  authors={item.authors}
                  highlightedAuthors={item.highlightedAuthors}
                />
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {item.journal} | {item.year}
              </p>
              {item.doiUrl ? (
                <a
                  href={item.doiUrl}
                  className="mt-3 inline-flex text-sm font-medium text-brand transition hover:text-foreground"
                >
                  DOI
                </a>
              ) : (
                <p className="mt-3 text-sm font-medium text-muted">
                  DOI: {item.doi}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
