import type { Metadata } from "next";
import { PageHero } from "@/components/page-hero";
import { PatentsPublicationsList } from "@/components/patents-publications-list";

export const metadata: Metadata = {
  title: "Patents",
  description:
    "Patent and invention disclosure records from the ChemoElectronic Nanomaterials Lab.",
};

export default function PatentsPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Patents"
        title="Patent and invention disclosure records"
      />
      <PatentsPublicationsList />
    </div>
  );
}
