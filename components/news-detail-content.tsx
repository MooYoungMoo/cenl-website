"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchVisibleNewsPostBySlug } from "@/lib/news";
import { newsItems, type NewsItem } from "@/lib/site-data";

type NewsDetailContentProps = {
  slug: string;
};

export function NewsDetailContent({ slug }: NewsDetailContentProps) {
  const fallbackItem =
    newsItems.find((newsItem) => newsItem.slug === slug) ?? null;
  const [item, setItem] = useState<NewsItem | null>(fallbackItem);

  useEffect(() => {
    let mounted = true;

    const loadNewsPost = async () => {
      try {
        const post = await fetchVisibleNewsPostBySlug(slug);

        if (mounted && post) {
          setItem(post);
        }
      } catch {
        if (mounted) {
          setItem(fallbackItem);
        }
      }
    };

    void loadNewsPost();

    return () => {
      mounted = false;
    };
  }, [fallbackItem, slug]);

  if (!item) {
    return (
      <article className="mx-auto max-w-5xl px-6 pb-16 pt-14">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to news
        </Link>
        <div className="mt-8 rounded-lg border border-line bg-white p-8 text-sm text-muted shadow-panel">
          This news post is not available.
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-5xl px-6 pb-16 pt-14">
      <Link
        href="/news"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to news
      </Link>
      <div className="mt-8">
        <p className="text-sm font-medium text-brand">{item.date}</p>
        <p className="mt-3 inline-flex rounded-md bg-accent-soft px-3 py-2 text-sm font-medium text-accent">
          {item.category}
        </p>
        <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
          {item.title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted">{item.summary}</p>
      </div>
      {item.imageUrl ? (
        <div
          className="mt-10 min-h-[420px] rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
          role="img"
          aria-label={item.representativeImage}
        />
      ) : (
        <VisualPlaceholder
          label={item.representativeImage}
          className="mt-10 min-h-[420px]"
        />
      )}
      <section className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5 text-base leading-8 text-muted">
          {item.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <aside className="rounded-lg border border-line bg-white p-5 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Photo Gallery
          </p>
          <div className="mt-4 grid gap-3">
            {item.galleryImages.length === 0 ? (
              <p className="text-sm text-muted">No gallery images yet.</p>
            ) : null}
            {item.galleryImages.map((image) => (
              <div key={`${image.label}-${image.url ?? image.caption ?? ""}`}>
                {image.url ? (
                  <div
                    className="min-h-32 rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${image.url})` }}
                    role="img"
                    aria-label={image.label}
                  />
                ) : (
                  <VisualPlaceholder
                    label={image.label}
                    className="min-h-32 rounded-md"
                  />
                )}
                {image.caption ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {image.caption}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </article>
  );
}
