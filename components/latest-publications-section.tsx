"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { PublicationCarousel } from "@/components/publication-carousel";
import { fetchFeaturedPublications } from "@/lib/publications";
import { latestPublications, type PublicationItem } from "@/lib/site-data";

type LatestPublicationsSectionProps = {
  title?: string;
};

export function LatestPublicationsSection({
  title = "Latest Publications",
}: LatestPublicationsSectionProps) {
  const [items, setItems] = useState<PublicationItem[]>(latestPublications);
  const displayTitle =
    title.trim().replace(/^our\s+/i, "") || "Latest Publications";

  useEffect(() => {
    let mounted = true;

    const loadPublications = async () => {
      try {
        const publications = await fetchFeaturedPublications();

        if (mounted && publications.length > 0) {
          setItems(publications);
        }
      } catch {
        if (mounted) {
          setItems(latestPublications);
        }
      }
    };

    void loadPublications();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-brand">
          <BookOpen className="h-4 w-4" />
        </span>
        <h2 className="break-words text-2xl font-semibold text-foreground sm:text-3xl">
          {displayTitle}
        </h2>
      </div>
      <div className="mt-3">
        <PublicationCarousel items={items} />
      </div>
    </section>
  );
}
