"use client";

import { useEffect, useState } from "react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchVisibleResearchTopics } from "@/lib/research";
import { researchTopics, type ResearchTopic } from "@/lib/site-data";

export function ResearchTopicsSection() {
  const [items, setItems] = useState<ResearchTopic[]>(researchTopics);

  useEffect(() => {
    let mounted = true;

    const loadResearchTopics = async () => {
      try {
        const topics = await fetchVisibleResearchTopics();

        if (mounted && topics.length > 0) {
          setItems(topics);
        }
      } catch {
        if (mounted) {
          setItems(researchTopics);
        }
      }
    };

    void loadResearchTopics();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="space-y-10">
        {items.map((topic, index) => {
          const Icon = topic.icon;
          const reversed = index % 2 === 1;

          return (
            <article
              key={topic.slug}
              className="grid gap-8 border-b border-line pb-10 lg:grid-cols-2 lg:items-center"
            >
              <div className={reversed ? "lg:order-2" : ""}>
                {topic.imageUrl ? (
                  <div
                    className="min-h-[340px] rounded-lg bg-cover bg-center"
                    style={{ backgroundImage: `url(${topic.imageUrl})` }}
                    role="img"
                    aria-label={topic.imageLabel}
                  />
                ) : (
                  <VisualPlaceholder
                    label={topic.imageLabel}
                    className="min-h-[340px]"
                  />
                )}
              </div>
              <div>
                <span className="inline-flex rounded-md bg-brand-soft p-3 text-brand">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-3xl font-semibold">{topic.title}</h2>
                {topic.subtitle ? (
                  <p className="mt-3 text-lg font-medium text-brand">
                    {topic.subtitle}
                  </p>
                ) : null}
                <p className="mt-4 text-base leading-8 text-muted">
                  {topic.description}
                </p>
                {topic.points.length > 0 ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {topic.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-md border border-line bg-white px-4 py-3 text-sm"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
