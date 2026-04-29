import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
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
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {newsItems.map((item) => (
            <Link
              key={item.slug}
              href={`/news/${item.slug}`}
              className="elevated-card overflow-hidden border border-line bg-white"
            >
              <VisualPlaceholder label={item.imageLabel} className="min-h-48 rounded-none" />
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-brand">{item.date}</span>
                  <span className="rounded-md bg-accent-soft px-2 py-1 text-accent">
                    {item.category}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                  Read more
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
