import {
  BriefcaseBusiness,
  ExternalLink,
  Mail,
  Medal,
  School,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { piProfile, type TimelineEntry } from "@/lib/site-data";

function TimelineDate({ period }: { period: string }) {
  const normalizedPeriod = period.replace("–", " – ");
  const [start, end] = normalizedPeriod.split(" – ");

  if (!end) {
    return <span>{period}</span>;
  }

  return (
    <>
      <span className="block">{start.trim()}</span>
      <span className="block">– {end.trim()}</span>
    </>
  );
}

function TimelineList({ items, wide = false }: { items: TimelineEntry[]; wide?: boolean }) {
  return (
    <div className="mt-8 space-y-7">
      {items.map((item) => (
        <div
          key={`${item.period}-${item.title}`}
          className={`grid gap-5 border-l border-line pl-5 ${
            wide ? "md:grid-cols-[150px_1fr]" : "md:grid-cols-[170px_1fr]"
          }`}
        >
          <p className="text-sm font-semibold leading-6 text-brand">
            <TimelineDate period={item.period} />
          </p>
          <div>
            <h3 className="font-semibold leading-7">{item.title}</h3>
            {item.location ? (
              <p className="mt-1 text-sm font-medium text-muted">{item.location}</p>
            ) : null}
            {item.description ? (
              <p className="mt-2 text-sm leading-7 text-muted">{item.description}</p>
            ) : null}
            {item.advisors ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.advisors.map((advisor) => (
                  <span
                    key={advisor}
                    className="rounded-md border border-line bg-surface-strong px-3 py-2 text-xs font-medium text-muted"
                  >
                    Advisor: {advisor}
                  </span>
                ))}
              </div>
            ) : null}
            {item.details ? (
              <div className="mt-3 space-y-2">
                {item.details.map((detail) => (
                  <p
                    key={detail}
                    className="rounded-md border border-line bg-surface-strong px-3 py-2 text-sm leading-6 text-muted"
                  >
                    {detail}
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PiPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Principal Investigator"
        title={piProfile.name}
        description={piProfile.summary}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[420px_1fr]">
        <VisualPlaceholder label="PI profile photo placeholder" className="min-h-[420px]" />
        <div className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            {piProfile.position}
          </p>
          <div className="mt-4 space-y-2">
            {piProfile.affiliation.map((line) => (
              <p key={line} className="text-xl font-semibold leading-7">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-7 space-y-3">
            {piProfile.emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="flex w-fit items-center gap-2 text-sm font-medium text-brand transition hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {email}
              </a>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {piProfile.externalProfiles.map((profile) => (
              <span
                key={profile}
                className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-strong px-4 py-3 text-sm font-semibold text-foreground"
              >
                <ExternalLink className="h-4 w-4 text-brand" />
                {profile}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-12">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <School className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Education & Career</h2>
          </div>
          <TimelineList items={piProfile.educationCareer} />
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-6">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Professional Experiences</h2>
          </div>
          <TimelineList items={piProfile.professionalExperiences} wide />
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-6">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <Medal className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Awards and Honors</h2>
          </div>
          <TimelineList items={piProfile.awardsHonors} />
        </article>
      </section>
    </div>
  );
}
