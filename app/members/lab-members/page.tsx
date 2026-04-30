import type { Metadata } from "next";
import { LabMembersSection } from "@/components/lab-members-section";
import { PageHero } from "@/components/page-hero";

export const metadata: Metadata = {
  title: "Lab Members",
  description:
    "Current student and researcher profiles for the ChemoElectronic Nanomaterials Lab.",
};

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
