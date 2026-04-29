import { PageHero } from "@/components/page-hero";
import { PapersPublicationsList } from "@/components/papers-publications-list";

export default function PapersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Papers"
        title="Selected papers and manuscript records"
        description="Paper entries load from managed publication records with static CENL fallback data kept in place for resilience."
      />
      <PapersPublicationsList />
    </div>
  );
}
