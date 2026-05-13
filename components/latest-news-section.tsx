"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { fetchVisibleNewsPosts } from "@/lib/news";
import { newsItems, type NewsItem } from "@/lib/site-data";

type LatestNewsSectionProps = {
  title?: string;
};

export function LatestNewsSection({
  title = "Latest News",
}: LatestNewsSectionProps) {
  const [items, setItems] = useState<NewsItem[]>(newsItems.slice(0, 15));
  const displayTitle =
    title.trim().toLowerCase() === "recent activity from cenl"
      ? "Latest News"
      : title.trim() || "Latest News";

  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      try {
        const posts = await fetchVisibleNewsPosts();

        if (mounted && posts.length > 0) {
          setItems(posts.slice(0, 15));
        }
      } catch {
        if (mounted) {
          setItems(newsItems.slice(0, 15));
        }
      }
    };

    void loadNews();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="bg-[#eef3f6]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
            <Newspaper className="h-5 w-5" />
          </span>
          <h2 className="break-words text-3xl font-semibold text-foreground sm:text-4xl">
            {displayTitle}
          </h2>
        </div>
        {items.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
            No news posts are available yet.
          </div>
        ) : null}
        <div className="mt-5 max-h-[430px] overflow-y-auto rounded-lg border border-line/70 bg-white/80 shadow-sm">
          {items.map((item) => (
            <article
              key={item.slug}
              className="grid gap-2 border-b border-line/70 px-3 py-3 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-center sm:px-4"
            >
              <p className="text-sm font-semibold text-brand">{item.date}</p>
              <h3 className="min-w-0 truncate text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <Link
                href={`/news/${item.slug}`}
                className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand transition hover:text-foreground"
              >
                Read More
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
