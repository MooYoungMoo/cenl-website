"use client";

import { useEffect, useState } from "react";
import { PublicationCarousel } from "@/components/publication-carousel";
import { SectionHeading } from "@/components/section-heading";
import { fetchFeaturedPublications } from "@/lib/publications";
import { latestPublications, type PublicationItem } from "@/lib/site-data";

type LatestPublicationsSectionProps = {
  title?: string;
};

export function LatestPublicationsSection({
  title = "Our Latest Publications",
}: LatestPublicationsSectionProps) {
  const [items, setItems] = useState<PublicationItem[]>(latestPublications);

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
    <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 md:py-12">
      <SectionHeading
        eyebrow="Publications"
        title={title}
        description="A compact carousel highlights recent CENL papers while keeping journal information easy to scan."
      />
      <div className="mt-5">
        <PublicationCarousel items={items} />
      </div>
    </section>
  );
}
