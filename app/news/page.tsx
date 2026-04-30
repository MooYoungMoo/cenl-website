import type { Metadata } from "next";
import { NewsListSection } from "@/components/news-list-section";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "News",
  description:
    "News, awards, group events, and research updates from the ChemoElectronic Nanomaterials Lab.",
};

export default function NewsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="News"
        title="Lab news, awards, events, and research updates"
        description="The news page supports student awards, PI awards, group events, research updates, and general lab news with detail pages for every item."
      />
      <section className="mx-auto max-w-7xl px-6">
        <NewsListSection />
      </section>
    </div>
  );
}
