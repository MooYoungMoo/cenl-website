import { Mail } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { contactDetails, contactHighlights, siteMeta } from "@/lib/site-data";

export default function ContactPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Contact"
        title="Join CENL or start a research conversation"
        description="This page gathers student recruiting information, research direction, lab contact details, and a map placeholder without connecting forms or databases yet."
      />
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {contactHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="elevated-card border border-line bg-white p-6"
              >
                <Icon className="h-6 w-6 text-brand" />
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">{item.description}</p>
              </article>
            );
          })}
        </div>
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-line bg-white p-8 shadow-panel">
            <Mail className="h-6 w-6 text-brand" />
            <h2 className="mt-4 text-2xl font-semibold">Lab Contact Information</h2>
            <div className="mt-5 space-y-2 text-sm leading-7 text-muted">
              {contactDetails.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a href={`mailto:${siteMeta.email}`} className="font-medium text-brand">
                {siteMeta.email}
              </a>
            </div>
          </div>
          <div>
            <VisualPlaceholder label="Campus map placeholder" className="min-h-[360px]" />
          </div>
        </div>
      </section>
    </div>
  );
}
