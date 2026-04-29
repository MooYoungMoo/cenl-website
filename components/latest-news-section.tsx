"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { fetchFeaturedNewsPosts } from "@/lib/news";
import { newsItems, type NewsItem } from "@/lib/site-data";

export function LatestNewsSection() {
  const [items, setItems] = useState<NewsItem[]>(newsItems.slice(0, 3));

  useEffect(() => {
    let mounted = true;

    const loadNews = async () => {
      try {
        const posts = await fetchFeaturedNewsPosts(3);

        if (mounted && posts.length > 0) {
          setItems(posts);
        }
      } catch {
        if (mounted) {
          setItems(newsItems.slice(0, 3));
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
      <div className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeading
          eyebrow="Latest News"
          title="Recent activity from CENL"
          description="News cards highlight featured lab updates from awards, events, research, and general lab activity."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.slug}
              className="elevated-card border border-line bg-white p-6"
            >
              <p className="text-sm font-medium text-brand">{item.date}</p>
              <h3 className="mt-3 text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted">{item.summary}</p>
              <Link
                href={`/news/${item.slug}`}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"
              >
                Read more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
