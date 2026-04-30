"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  newsCategoryOptions,
  type NewsCategoryFilter,
  type NewsItem,
} from "@/lib/site-data";

type NewsListProps = {
  items: NewsItem[];
};

export function NewsList({ items }: NewsListProps) {
  const [activeCategory, setActiveCategory] =
    useState<NewsCategoryFilter>("all");

  const visibleItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory);

  return (
    <div>
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 sm:mb-8">
        {newsCategoryOptions.map((option) => {
          const active = activeCategory === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveCategory(option.value)}
              className={`shrink-0 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-white text-muted hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No news posts are available in this category yet.
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => (
          <Link
            key={item.slug}
            href={`/news/${item.slug}`}
            className="elevated-card overflow-hidden border border-line bg-white"
          >
            {item.imageUrl ? (
              <div
                className="min-h-44 rounded-none bg-cover bg-center sm:min-h-48"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
                role="img"
                aria-label={item.representativeImage}
              />
            ) : (
              <VisualPlaceholder
                label={item.representativeImage}
                className="min-h-48 rounded-none"
              />
            )}
            <div className="min-w-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-brand">{item.date}</span>
                <span className="rounded-md bg-accent-soft px-2 py-1 text-accent">
                  {item.category}
                </span>
              </div>
              <h2 className="mt-4 break-words text-lg font-semibold leading-7 sm:text-xl">
                {item.title}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-muted">
                {item.summary}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                Read more
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
