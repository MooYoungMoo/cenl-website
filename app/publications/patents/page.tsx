import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { patents } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Patents",
  description:
    "Patent and invention disclosure records from the ChemoElectronic Nanomaterials Lab.",
};

export default function PatentsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Patents"
        title="Patent and invention disclosure placeholders"
        description="This page is ready for future filed patents, pending applications, and technology disclosure records."
      />
      <section className="mx-auto max-w-5xl px-6">
        <div className="space-y-5">
          {patents.map((patent) => (
            <article
              key={patent.id}
              className="elevated-card border border-line bg-white p-6"
            >
              <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                <VisualPlaceholder
                  label="Patent figure placeholder"
                  className="min-h-32 rounded-md"
                />
                <div>
                  <span className="inline-flex rounded-md bg-brand-soft p-2 text-brand">
                    <ScrollText className="h-4 w-4" />
                  </span>
                  <h2 className="text-xl font-semibold">{patent.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{patent.inventors}</p>
                  <p className="mt-4 inline-flex rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
                    {patent.status}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
