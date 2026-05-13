"use client";

import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Mail,
  Medal,
  Phone,
  School,
} from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import {
  fallbackPiProfileContent,
  fetchPiProfileContent,
  type PiProfileContent,
  type PiTimelineItem,
} from "@/lib/pi-profile";

function TimelineDate({ item }: { item: PiTimelineItem }) {
  if (item.startDate && item.endDate) {
    return (
      <>
        <span className="block">{item.startDate}</span>
        <span className="block">- {item.endDate}</span>
      </>
    );
  }

  return <span>{item.startDate || item.endDate || "TBD"}</span>;
}

function splitTimelineNotes(note: string) {
  const notes = note
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const advisors = notes
    .filter((item) => item.toLowerCase().startsWith("advisor:"))
    .map((item) => item.replace(/^advisor:\s*/i, "").trim())
    .filter(Boolean);
  const details = notes.filter(
    (item) => !item.toLowerCase().startsWith("advisor:"),
  );

  return { advisors, details };
}

function TimelineList({
  items,
  wide = false,
}: {
  items: PiTimelineItem[];
  wide?: boolean;
}) {
  return (
    <div className="mt-8 space-y-7">
      {items.map((item, index) => {
        const { advisors, details } = splitTimelineNotes(item.note);

        return (
          <div
            key={`${item.startDate}-${item.title}-${index}`}
            className={`grid gap-5 border-l border-line pl-5 ${
              wide ? "md:grid-cols-[150px_1fr]" : "md:grid-cols-[170px_1fr]"
            }`}
          >
            <p className="text-sm font-semibold leading-6 text-brand">
              <TimelineDate item={item} />
            </p>
            <div>
              <h3 className="font-semibold leading-7">
                {item.title}
                {advisors.length > 0 ? (
                  <span className="ml-1 text-sm font-normal text-muted">
                    - Advisor: {advisors.join("; ")}
                  </span>
                ) : null}
              </h3>
              {item.organization ? (
                <p className="mt-1 text-sm font-medium text-foreground">
                  {item.organization}
                </p>
              ) : null}
              {item.location ? (
                <p className="mt-1 text-sm font-medium text-muted">
                  {item.location}
                </p>
              ) : null}
              {item.description ? (
                <p className="mt-2 text-sm leading-7 text-muted">
                  {item.description}
                </p>
              ) : null}
              {details.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {details.map((note) => (
                    <p
                      key={note}
                      className="text-sm leading-6 text-muted"
                    >
                      {note}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PiProfileContentSection() {
  const [profile, setProfile] = useState<PiProfileContent>(
    fallbackPiProfileContent,
  );

  useEffect(() => {
    let mounted = true;

    const loadPiProfile = async () => {
      try {
        const nextProfile = await fetchPiProfileContent();

        if (mounted && nextProfile) {
          setProfile(nextProfile);
        }
      } catch {
        if (mounted) {
          setProfile(fallbackPiProfileContent);
        }
      }
    };

    void loadPiProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const affiliationLines = profile.affiliation
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Principal Investigator"
        title={profile.name}
        description={profile.summary}
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[420px_1fr]">
        {profile.photoUrl ? (
          <div
            className="min-h-[420px] rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.photoUrl})` }}
            role="img"
            aria-label={`${profile.name} profile photo`}
          />
        ) : (
          <VisualPlaceholder
            label="PI profile photo placeholder"
            className="min-h-[420px]"
          />
        )}
        <div className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            {profile.position}
          </p>
          <div className="mt-4 space-y-2">
            {affiliationLines.map((line) => (
              <p key={line} className="text-xl font-semibold leading-7">
                {line}
              </p>
            ))}
          </div>
          <div className="mt-7 space-y-3">
            {profile.emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="flex w-fit items-center gap-2 text-sm font-medium text-brand transition hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {email}
              </a>
            ))}
            {profile.office ? (
              <p className="flex w-fit flex-wrap items-center gap-2 text-sm font-medium text-muted">
                <Building2 className="h-4 w-4 text-brand" />
                <span className="font-semibold text-foreground">Office:</span>
                {profile.office}
              </p>
            ) : null}
            {profile.phone ? (
              <p className="flex w-fit flex-wrap items-center gap-2 text-sm font-medium text-muted">
                <Phone className="h-4 w-4 text-brand" />
                <span className="font-semibold text-foreground">Phone:</span>
                {profile.phone}
              </p>
            ) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {profile.externalLinks.map((externalLink) =>
              externalLink.url ? (
                <a
                  key={externalLink.label}
                  href={externalLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-strong px-4 py-3 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand"
                >
                  <ExternalLink className="h-4 w-4 text-brand" />
                  {externalLink.label}
                </a>
              ) : (
                <span
                  key={externalLink.label}
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-surface-strong px-4 py-3 text-sm font-semibold text-foreground"
                >
                  <ExternalLink className="h-4 w-4 text-brand" />
                  {externalLink.label}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-12">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <School className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Education & Career</h2>
          </div>
          <TimelineList items={profile.educationCareer} />
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-6">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <BriefcaseBusiness className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">
              Professional Experiences
            </h2>
          </div>
          <TimelineList items={profile.professionalExperiences} wide />
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-6">
        <article className="rounded-lg border border-line bg-white p-8 shadow-panel">
          <div className="flex items-center gap-3">
            <Medal className="h-5 w-5 text-brand" />
            <h2 className="text-2xl font-semibold">Awards and Honors</h2>
          </div>
          <TimelineList items={profile.awardsHonors} />
        </article>
      </section>
    </div>
  );
}
