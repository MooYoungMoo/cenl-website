"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      <div
        ref={scrollerRef}
        className="flex snap-x gap-5 overflow-x-auto pb-4"
      >
        {items.map((item) => (
          <article
            key={item.id}
            className="elevated-card min-w-[82%] snap-start overflow-hidden border border-line bg-white sm:min-w-[48%] lg:min-w-[calc((100%_-_2.5rem)/3)]"
          >
            <VisualPlaceholder
              label={item.imageLabel}
              className="min-h-40 rounded-none"
            />
            <div className="p-6">
              <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                {item.label}
              </span>
              <h3 className="mt-4 text-lg font-semibold leading-snug">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">{item.authors}</p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {item.journal} · {item.year}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
