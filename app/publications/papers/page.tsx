import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { PapersPublicationsList } from "@/components/papers-publications-list";

export const metadata: Metadata = {
  title: "Papers",
  description:
    "Journal papers and manuscript records from the ChemoElectronic Nanomaterials Lab.",
};

export default function PapersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Papers"
        title="Selected papers and manuscript records"
      />
      <PapersPublicationsList />
    </div>
  );
}
