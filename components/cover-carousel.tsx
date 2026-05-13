"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FullImagePreview } from "@/components/full-image-preview";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchCoverPublications } from "@/lib/publications";
import type { PublicationItem } from "@/lib/site-data";

function CoverPublicationCard({
  publication,
}: {
  publication: PublicationItem;
}) {
  return (
    <article className="flex min-w-[7.5rem] snap-start flex-col overflow-hidden rounded-md border border-line bg-white shadow-sm sm:min-w-[8.5rem] lg:min-w-[9.5rem]">
      {publication.imageUrl ? (
        <FullImagePreview
          src={publication.imageUrl}
          alt={publication.imageLabel}
          className="shrink-0"
        >
          <div
            className="aspect-[210/297] shrink-0 bg-contain bg-top bg-no-repeat"
            style={{ backgroundImage: `url(${publication.imageUrl})` }}
            role="img"
            aria-label={publication.imageLabel}
          />
        </FullImagePreview>
      ) : (
        <VisualPlaceholder
          label="Cover publication placeholder"
          className="aspect-[210/297] min-h-0 shrink-0 rounded-none"
        />
      )}
      <div className="mt-auto flex min-h-8 items-center border-t border-line/70 px-2 py-1.5">
        {publication.coverLabel ? (
          <span className="line-clamp-1 text-[0.65rem] font-semibold text-brand">
            {publication.coverLabel}
          </span>
        ) : (
          <span className="sr-only">No cover label</span>
        )}
      </div>
    </article>
  );
}

export function CoverCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [items, setItems] = useState<PublicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadCoverPublications = async () => {
      try {
        const publications = await fetchCoverPublications();

        if (mounted) {
          setItems(publications);
        }
      } catch {
        if (mounted) {
          setItems([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCoverPublications();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (items.length < 3) {
      return;
    }

    const timer = window.setInterval(() => {
      const scroller = scrollerRef.current;

      if (!scroller || pausedRef.current) {
        return;
      }

      const nextLeft = scroller.scrollLeft + 160;
      const reachedEnd =
        nextLeft + scroller.clientWidth >= scroller.scrollWidth - 8;

      scroller.scrollTo({
        left: reachedEnd ? 0 : nextLeft,
        behavior: "smooth",
      });
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [items.length]);

  const scroll = (direction: "left" | "right") => {
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
    <div
      className="rounded-lg border border-line bg-white p-3 shadow-panel sm:p-4"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Cover Publications
          </p>
          <p className="mt-1 text-xs text-muted">
            Compact visual strip of journal cover records.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous cover publications"
            onClick={() => scroll("left")}
            className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next cover publications"
            onClick={() => scroll("right")}
            className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
          Loading cover publications...
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
          No cover publications are available yet.
        </div>
      ) : null}

      {items.length > 0 ? (
        <div ref={scrollerRef} className="flex snap-x gap-3 overflow-x-auto pb-1">
          {items.map((publication) => (
            <CoverPublicationCard
              key={publication.id}
              publication={publication}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
