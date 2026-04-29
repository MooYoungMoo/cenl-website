import Link from "next/link";
import { ArrowRight, FlaskConical, Mail } from "lucide-react";
import { LatestPublicationsSection } from "@/components/latest-publications-section";
import { SectionHeading } from "@/components/section-heading";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  homeFeatureLinks,
  newsItems,
  quickStats,
  researchTopics,
  siteMeta,
} from "@/lib/site-data";

export default function HomePage() {
  const latestNews = newsItems.slice(0, 3);

  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-14 pt-14 lg:grid-cols-[1fr_520px] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            {siteMeta.shortName}
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-tight md:text-7xl">
            {siteMeta.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            {siteMeta.tagline}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/research"
              className="action-button action-button-primary inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white"
            >
              <FlaskConical className="h-4 w-4" />
              Our Research
            </Link>
            <Link
              href="/contact"
              className="action-button action-button-secondary inline-flex items-center gap-2 rounded-md border border-line bg-white px-5 py-3 text-sm font-medium"
            >
              <Mail className="h-4 w-4" />
              Join Us
            </Link>
          </div>
        </div>
        <VisualPlaceholder
          label="Chemoelectronic nanomaterials placeholder"
          className="min-h-[420px]"
        />
      </section>

      <section className="border-y border-line/70 bg-white/70">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-3">
          {quickStats.map((stat) => (
            <div key={stat.label} className="border-l border-line pl-5">
              <p className="text-3xl font-semibold text-brand">{stat.value}</p>
              <p className="mt-1 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <LatestPublicationsSection />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeading
          eyebrow="Research Highlights"
          title="Chemical sensing from material interface to intelligent system"
          description="CENL studies how nanomaterials, electronics, and data analysis can work together to detect and interpret chemical signals."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {researchTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <article
                key={topic.slug}
                className="elevated-card overflow-hidden border border-line bg-surface-strong"
              >
                <VisualPlaceholder label={topic.imageLabel} className="min-h-52 rounded-none" />
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-brand-soft p-2 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-xl font-semibold">{topic.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-muted">{topic.summary}</p>
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

      <section className="bg-[#eef3f6]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <SectionHeading
            eyebrow="Latest News"
            title="Recent activity from CENL"
            description="News cards are static placeholders for now, with detail pages already wired into the frontend routing."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {latestNews.map((item) => (
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

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-16 md:grid-cols-3">
        {homeFeatureLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="elevated-card border border-line bg-surface p-6"
            >
              <Icon className="h-6 w-6 text-brand" />
              <h2 className="mt-5 text-xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
