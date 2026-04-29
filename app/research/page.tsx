import { PageHero } from "@/components/page-hero";
import { ResearchTopicsSection } from "@/components/research-topics-section";

export default function ResearchPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Research"
        title="Chemoelectronic nanomaterials for intelligent chemical perception"
        description="CENL's research page is organized around expandable topic sections so new materials, devices, and sensing applications can be added as the lab grows."
      />
      <ResearchTopicsSection />
    </div>
  );
}
