import type { Metadata } from "next";
import { OngoingProjectsSection } from "@/components/ongoing-projects-section";
import { PageHero } from "@/components/page-hero";
import { ResearchTopicsSection } from "@/components/research-topics-section";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Research at CENL on chemoelectronic nanomaterials, gas sensors, electronic nose systems, and sensing platforms.",
};

export default function ResearchPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Research"
        title="Intelligent Chemical Perception"
      />
      <OngoingProjectsSection />
      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Research Directions
        </p>
        <h2 className="mt-3 max-w-4xl break-words text-2xl font-bold leading-tight sm:text-3xl">
          Core directions in chemoelectronic sensing
        </h2>
      </section>
      <ResearchTopicsSection />
    </div>
  );
}
