"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical, Mail } from "lucide-react";
import { LatestNewsSection } from "@/components/latest-news-section";
import { LatestPublicationsSection } from "@/components/latest-publications-section";
import { SectionHeading } from "@/components/section-heading";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  fallbackHomeContent,
  fetchHomeContent,
  type HomePageContent,
} from "@/lib/home";
import {
  homeFeatureLinks,
  quickStats,
  researchTopics,
} from "@/lib/site-data";

export function HomePageContentSection() {
  const [content, setContent] =
    useState<HomePageContent>(fallbackHomeContent);

  useEffect(() => {
    let mounted = true;

    const loadHomeContent = async () => {
      try {
        const nextContent = await fetchHomeContent();

        if (mounted && nextContent) {
          setContent(nextContent);
        }
      } catch {
        if (mounted) {
          setContent(fallbackHomeContent);
        }
      }
    };

    void loadHomeContent();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 md:pb-14 md:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            {content.heroSubtitle}
          </p>
          <h1 className="mt-5 max-w-4xl break-words text-4xl font-semibold leading-tight sm:text-5xl md:text-7xl">
            {content.heroTitle}
          </h1>
          <p className="mt-6 max-w-2xl break-words text-base leading-8 text-muted sm:text-lg">
            {content.heroDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={content.primaryButtonHref}
              className="action-button action-button-primary inline-flex max-w-full items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white"
            >
              <FlaskConical className="h-4 w-4" />
              {content.primaryButtonLabel}
            </Link>
            <Link
              href={content.secondaryButtonHref}
              className="action-button action-button-secondary inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-white px-5 py-3 text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              {content.secondaryButtonLabel}
            </Link>
          </div>
        </div>
        {content.heroImageUrl ? (
          <div
            className="min-h-[280px] rounded-lg bg-cover bg-center sm:min-h-[360px] lg:min-h-[420px]"
            style={{ backgroundImage: `url(${content.heroImageUrl})` }}
            role="img"
            aria-label="Homepage hero image"
          />
        ) : (
          <VisualPlaceholder
            label="Chemoelectronic nanomaterials placeholder"
            className="min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]"
          />
        )}
      </section>

      <section className="border-y border-line/70 bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-7 sm:px-6 md:grid-cols-3 md:py-8">
          {quickStats.map((stat) => (
            <div key={stat.label} className="border-l border-line pl-5">
              <p className="text-3xl font-semibold text-brand">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <LatestPublicationsSection title={content.latestPublicationsTitle} />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16">
        <SectionHeading
          eyebrow="Research Highlights"
          title={content.researchHighlightTitle}
          description={content.researchHighlightDescription}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {researchTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <article
                key={topic.slug}
                className="elevated-card overflow-hidden border border-line bg-surface-strong"
              >
                <VisualPlaceholder
                  label={topic.imageLabel}
                  className="min-h-52 rounded-none"
                />
                <div className="min-w-0 p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-brand-soft p-2 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="break-words text-xl font-semibold">
                      {topic.title}
                    </h3>
                  </div>
                  <p className="mt-4 break-words text-sm leading-7 text-muted">
                    {topic.summary}
                  </p>
                  <Link
                    href="/research"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"
                  >
                    View topic
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <LatestNewsSection title={content.latestNewsTitle} />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:px-6 md:grid-cols-3 md:py-16">
        {homeFeatureLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="elevated-card min-w-0 border border-line bg-surface p-5 sm:p-6"
            >
              <Icon className="h-6 w-6 text-brand" />
              <h2 className="mt-5 break-words text-xl font-semibold">
                {item.title}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-muted">
                {item.description}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
