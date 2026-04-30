import type { Metadata } from "next";
import { PiProfileContentSection } from "@/components/pi-profile-content";

export const metadata: Metadata = {
  title: "Principal Investigator",
  description:
    "Principal investigator profile for the ChemoElectronic Nanomaterials Lab.",
};

export default function PiPage() {
  return <PiProfileContentSection />;
}
