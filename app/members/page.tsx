import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { memberSections } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Members",
  description:
    "Meet the principal investigator, current members, and alumni of the ChemoElectronic Nanomaterials Lab.",
};

export default function MembersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Members"
        title="People behind CENL's materials and sensing research"
        description="The members area is split into a PI detail page and a lab member directory so the structure can scale cleanly."
      />
      <section className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
        {memberSections.map((section) => {
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
                Open page
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
