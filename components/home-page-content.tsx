"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Mail, Network } from "lucide-react";
import { LatestNewsSection } from "@/components/latest-news-section";
import { LatestPublicationsSection } from "@/components/latest-publications-section";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  fallbackHomeContent,
  fetchHomeContent,
  type HomePageContent,
} from "@/lib/home";
import { fetchHomeMetrics } from "@/lib/home-metrics";
import { fetchVisibleResearchTopics } from "@/lib/research";
import { quickStats } from "@/lib/site-data";

const researchIdentityCards = [
  {
    title: "Conductive Frameworks",
  },
  {
    title: "Nanostructured Oxides",
  },
  {
    title: "Light-Activated Sensors",
  },
  {
    title: "Gas Fingerprints",
  },
];

type HomeResearchCard = {
  title: string;
};

export function HomePageContentSection() {
  const [content, setContent] =
    useState<HomePageContent>(fallbackHomeContent);
  const [metrics, setMetrics] = useState(quickStats);
  const [researchCards, setResearchCards] =
    useState<HomeResearchCard[]>(researchIdentityCards);
  const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);
  const heroImages =
    content.heroGalleryImages.length > 0
      ? content.heroGalleryImages
      : content.heroImageUrl.trim()
        ? [{ url: content.heroImageUrl.trim(), alt: "Homepage hero image" }]
        : [];
  const heroImageCount = heroImages.length;
  const activeHeroImageIndex = Math.min(
    currentHeroImageIndex,
    Math.max(heroImageCount - 1, 0),
  );

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

    const loadHomeMetrics = async () => {
      try {
        const nextMetrics = await fetchHomeMetrics();

        if (mounted) {
          setMetrics(nextMetrics);
        }
      } catch {
        if (mounted) {
          setMetrics(quickStats);
        }
      }
    };

    void loadHomeMetrics();

    const loadResearchCards = async () => {
      try {
        const topics = await fetchVisibleResearchTopics();
        const nextCards = topics.map((topic) => ({
          title: topic.title,
        }));

        if (mounted && nextCards.length > 0) {
          setResearchCards(nextCards);
        }
      } catch {
        if (mounted) {
          setResearchCards(researchIdentityCards);
        }
      }
    };

    void loadResearchCards();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (heroImageCount <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentHeroImageIndex((current) => (current + 1) % heroImageCount);
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [content.heroGalleryImages, content.heroImageUrl, heroImageCount]);

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
        {heroImageCount > 0 ? (
          <div
            className="relative min-h-[280px] overflow-hidden rounded-lg bg-brand-soft shadow-panel sm:min-h-[360px] lg:min-h-[420px]"
            role="img"
            aria-label={
              heroImages[activeHeroImageIndex]?.alt || "Homepage hero image"
            }
          >
            {heroImages.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
                  index === activeHeroImageIndex ? "opacity-100" : "opacity-0"
                }`}
                style={{ backgroundImage: `url(${image.url})` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0f2741]/18 via-transparent to-cyan-200/10" />
            {heroImageCount > 1 ? (
              <div className="absolute bottom-4 left-4 flex gap-1.5">
                {heroImages.map((image, index) => (
                  <span
                    key={`${image.url}-dot-${index}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeHeroImageIndex
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/55"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <VisualPlaceholder
            label="Chemoelectronic nanomaterials placeholder"
            className="min-h-[280px] sm:min-h-[360px] lg:min-h-[420px]"
          />
        )}
      </section>

      <section className="border-y border-line/70 bg-white/70">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 py-5 sm:px-6 md:grid-cols-4 md:py-6">
          {metrics.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-line/70 bg-white/75 px-4 py-3 shadow-sm"
            >
              <p className="text-2xl font-semibold leading-none text-brand sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <LatestPublicationsSection title={content.latestPublicationsTitle} />

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand-soft text-brand">
              <Network className="h-5 w-5" />
            </span>
            <h2 className="break-words text-3xl font-semibold text-foreground sm:text-4xl">
              Research Directions
            </h2>
          </div>
          <Link
            href="/research"
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
          >
            Explore research
          </Link>
        </div>
        <div className="mt-5 w-full overflow-x-auto pb-3">
          <div className="flex min-w-max flex-nowrap gap-4">
            {researchCards.map((card, index) => (
              <Link
                key={`${card.title}-${index}`}
                href="/research"
                className="flex min-h-[150px] w-[220px] shrink-0 flex-col items-start justify-start rounded-lg border border-brand/15 bg-white/85 p-4 shadow-sm transition hover:border-brand/35 hover:bg-brand-soft/40 sm:w-[240px] md:w-[260px]"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 line-clamp-3 text-lg font-semibold leading-snug text-foreground">
                  {card.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LatestNewsSection title={content.latestNewsTitle} />
    </div>
  );
}
