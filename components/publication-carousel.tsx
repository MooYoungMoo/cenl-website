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

function getCompactAuthors(authors: string) {
  const authorParts = authors
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);

  if (authorParts.length === 0) {
    return authors;
  }

  const firstAuthors = authorParts.filter((author) => author.includes("†"));
  const correspondingAuthors = authorParts.filter((author) =>
    author.includes("*"),
  );
  const compactParts = [
    ...(firstAuthors.length > 0 ? firstAuthors : [authorParts[0]]),
    ...(correspondingAuthors.length > 0 ? correspondingAuthors : []),
  ];
  const uniqueParts = Array.from(new Set(compactParts));

  if (firstAuthors.length === 0 && correspondingAuthors.length === 0) {
    return `${authorParts[0]} et al.`;
  }

  if (uniqueParts.length === 1) {
    return uniqueParts[0];
  }

  return `${uniqueParts[0]} ... ${uniqueParts.slice(1).join(", ")}`;
}

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
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Previous publications"
          onClick={() => scrollByCard("left")}
          className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next publications"
          onClick={() => scrollByCard("right")}
          className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No featured publications are available yet.
        </div>
      ) : null}
      <div ref={scrollerRef} className="flex snap-x gap-4 overflow-x-auto pb-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="elevated-card min-w-[78%] snap-start overflow-hidden border border-line bg-white sm:min-w-[42%] lg:min-w-[calc((100%_-_2rem)/3)]"
          >
            {item.imageUrl ? (
              <div
                className="aspect-[4/3] rounded-none bg-cover bg-center"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
                role="img"
                aria-label={item.imageLabel}
              />
            ) : (
              <VisualPlaceholder
                label={item.imageLabel}
                className="aspect-[4/3] min-h-0 rounded-none"
              />
            )}
            <div className="min-w-0 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                  {item.label}
                </span>
                <ContributionBadge contribution={item.labContribution} />
              </div>
              <h3 className="mt-3 line-clamp-2 break-words text-base font-semibold leading-snug">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-1 break-words text-xs leading-5 text-muted">
                <HighlightedAuthors
                  authors={getCompactAuthors(item.authors)}
                  highlightedAuthors={item.highlightedAuthors}
                />
              </p>
              <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                {item.journal} | {item.year}
              </p>
              {item.doiUrl ? (
                <a
                  href={item.doiUrl}
                  className="mt-2 inline-flex text-xs font-semibold text-brand transition hover:text-foreground"
                >
                  DOI
                </a>
              ) : (
                <p className="mt-2 text-xs font-medium text-muted">
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
