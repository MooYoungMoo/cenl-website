"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, Mail } from "lucide-react";
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
import { homeFeatureLinks, quickStats } from "@/lib/site-data";

const researchIdentityCards = [
  {
    title: "Conductive Frameworks",
    description:
      "Conductive MOFs and porous materials for molecular recognition and charge transport.",
  },
  {
    title: "Nanostructured Oxides",
    description:
      "Porous, hollow, and hierarchical oxide materials for high-reactivity sensing films.",
  },
  {
    title: "Light-Activated Sensors",
    description:
      "Band-structure and photoactivation strategies for room-temperature gas sensing.",
  },
  {
    title: "Gas Fingerprints",
    description:
      "Sensor arrays and pattern recognition for information-rich chemical sensing.",
  },
];

type HomeResearchCard = {
  title: string;
  description: string;
};

function trimResearchDescription(value: string) {
  const trimmed = value.trim();

  if (trimmed.length <= 150) {
    return trimmed;
  }

  return `${trimmed.slice(0, 147).trim()}...`;
}

export function HomePageContentSection() {
  const [content, setContent] =
    useState<HomePageContent>(fallbackHomeContent);
  const [metrics, setMetrics] = useState(quickStats);
  const [researchCards, setResearchCards] =
    useState<HomeResearchCard[]>(researchIdentityCards);

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
        const nextCards = topics.slice(0, 4).map((topic) => ({
          title: topic.title,
          description: trimResearchDescription(
            topic.subtitle || topic.summary || topic.description,
          ),
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

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">
        <div className="rounded-xl border border-line/70 bg-white/75 p-5 shadow-panel sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Research Directions
              </p>
              <h2 className="mt-3 break-words text-2xl font-semibold sm:text-3xl">
                From Molecules to Gas Fingerprints
              </h2>
            </div>
            <Link
              href="/research"
              className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
            >
              Explore research
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {researchCards.map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-line/70 bg-surface/85 p-4"
              >
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
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
