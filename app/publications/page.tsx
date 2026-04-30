import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CoverCarousel } from "@/components/cover-carousel";
import { PageHero } from "@/components/page-hero";
import { publicationCovers, publicationSections } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Publications",
  description:
    "Papers and patents from the ChemoElectronic Nanomaterials Lab.",
};

export default function PublicationsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Publications"
        title="Papers and patents from CENL"
        description="The publications section is prepared as two subpages, keeping scholarly papers and intellectual property entries easy to maintain."
      />
      <section className="mx-auto max-w-7xl px-6">
        <CoverCarousel covers={publicationCovers} />
      </section>
      <section className="mx-auto grid max-w-5xl gap-6 px-6 pt-10 md:grid-cols-2">
        {publicationSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className="elevated-card border border-line bg-white p-7"
            >
              <Icon className="h-7 w-7 text-brand" />
              <h2 className="mt-5 text-2xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{section.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                Browse {section.title.toLowerCase()}
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
