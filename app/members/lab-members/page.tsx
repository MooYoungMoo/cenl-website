import { LabMembersSection } from "@/components/lab-members-section";
import { PageHero } from "@/components/page-hero";

export default function LabMembersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Lab Members"
        title="Students and researchers in CENL"
        description="Each member card is ready for a real profile photo, degree or program, short biography, and email address."
      />
      <LabMembersSection />
    </div>
  );
}
