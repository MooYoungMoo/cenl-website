import { AlumniSection } from "@/components/alumni-section";
import { PageHero } from "@/components/page-hero";

export default function AlumniPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Alumni"
        title="CENL alumni and former lab members"
        description="This page is prepared for former student and researcher profiles with current affiliation placeholders."
      />
      <AlumniSection />
    </div>
  );
}
