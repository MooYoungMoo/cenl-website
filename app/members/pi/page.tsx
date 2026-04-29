import { BriefcaseBusiness, Mail, Medal, School } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { piProfile } from "@/lib/site-data";

export default function PiPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Principal Investigator"
        title={piProfile.name}
        description={piProfile.biography}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[420px_1fr]">
        <VisualPlaceholder label="PI profile photo placeholder" className="min-h-[420px]" />
        <div className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <p className="text-sm font-medium text-brand">{piProfile.title}</p>
          <h2 className="mt-2 text-3xl font-semibold">{piProfile.degree}</h2>
          <a
            href={`mailto:${piProfile.email}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand transition hover:text-foreground"
          >
            <Mail className="h-4 w-4" />
            {piProfile.email}
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pt-12 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <School className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Education & Career</h2>
          </div>
          <div className="mt-8 space-y-6">
            {piProfile.educationCareer.map((item) => (
              <div key={`${item.period}-${item.title}`} className="grid gap-4 border-l border-line pl-5 md:grid-cols-[120px_1fr]">
                <p className="text-sm font-semibold text-brand">{item.period}</p>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-5 w-5 text-brand" />
              <h2 className="text-2xl font-semibold">Professional Experiences</h2>
            </div>
            <div className="mt-6 space-y-3">
              {piProfile.professionalExperiences.map((item) => (
                <p
                  key={item}
                  className="rounded-md border border-line bg-surface-strong px-4 py-3 text-sm leading-6 text-muted"
                >
                  {item}
                </p>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
            <div className="flex items-center gap-3">
              <Medal className="h-5 w-5 text-brand" />
              <h2 className="text-2xl font-semibold">Awards and Honors</h2>
            </div>
            <div className="mt-6 space-y-3">
              {piProfile.awardsHonors.map((item) => (
                <p
                  key={item}
                  className="rounded-md border border-line bg-surface-strong px-4 py-3 text-sm leading-6 text-muted"
                >
                  {item}
                </p>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
