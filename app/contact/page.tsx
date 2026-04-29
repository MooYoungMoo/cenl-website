import { ContactContentSection } from "@/components/contact-content-section";
import { PageHero } from "@/components/page-hero";

export default function ContactPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Contact"
        title="Join CENL or start a research conversation"
        description="Contact information and student recruiting details are organized here as editable frontend content."
      />
      <ContactContentSection />
    </div>
  );
}
