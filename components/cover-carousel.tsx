"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";

type CoverCarouselProps = {
  covers: string[];
};

export function CoverCarousel({ covers }: CoverCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
          Featured Visuals
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous covers"
            onClick={() => scroll("left")}
            className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next covers"
            onClick={() => scroll("right")}
            className="action-button action-button-secondary inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto pb-2">
        {covers.map((cover) => (
          <VisualPlaceholder
            key={cover}
            label={cover}
            className="min-h-48 min-w-72 rounded-lg"
          />
        ))}
      </div>
    </div>
  );
}
