import type { Metadata } from "next";
import { HomePageContentSection } from "@/components/home-page-content";

export const metadata: Metadata = {
  title: {
    absolute: "ChemoElectronic Nanomaterials Lab",
  },
};

export default function HomePage() {
  return <HomePageContentSection />;
}
