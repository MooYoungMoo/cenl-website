import { NewsList } from "@/components/news-list";
import { PageHero } from "@/components/page-hero";
import { newsItems } from "@/lib/site-data";

export default function NewsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="News"
        title="Lab news, awards, events, and research updates"
        description="The news page supports student awards, PI awards, group events, research updates, and general lab news with detail pages for every item."
      />
      <section className="mx-auto max-w-7xl px-6">
        <NewsList items={newsItems} />
      </section>
    </div>
  );
}
