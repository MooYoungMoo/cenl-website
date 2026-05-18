"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Mail, X } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchCurrentLabMembers } from "@/lib/members";
import { labMembers, type LabMember } from "@/lib/site-data";

function splitLines(value: string | undefined) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeComparableText(value: string | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function LabMembersSection() {
  const [items, setItems] = useState<LabMember[]>(labMembers);
  const [selectedPublicationMember, setSelectedPublicationMember] =
    useState<LabMember | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      try {
        const members = await fetchCurrentLabMembers();

        if (mounted && members.length > 0) {
          setItems(members);
        }
      } catch {
        if (mounted) {
          setItems(labMembers);
        }
      }
    };

    void loadMembers();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPublicationMember) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPublicationMember(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPublicationMember]);

  const selectedPublicationLines = splitLines(
    selectedPublicationMember?.selectedPublications,
  );

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No lab members are available yet.
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((member) => {
          const researchText = member.research || member.biography;
          const educationLines = splitLines(member.education);
          const publicationLines = splitLines(member.selectedPublications);
          const degreeMatchesEducation =
            normalizeComparableText(member.degree) ===
            normalizeComparableText(member.education);
          const visibleEducationLines = degreeMatchesEducation
            ? []
            : educationLines;

          return (
            <article
              key={member.id}
              className="elevated-card overflow-hidden border border-line bg-white"
            >
            {member.photoUrl ? (
              <div
                className="aspect-[3/4] rounded-none bg-cover bg-top"
                style={{ backgroundImage: `url(${member.photoUrl})` }}
                role="img"
                aria-label={`${member.name} profile photo`}
              />
            ) : (
              <VisualPlaceholder
                label="Profile photo placeholder"
                className="aspect-[3/4] rounded-none"
              />
            )}
            <div className="min-w-0 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-lg font-semibold">
                  {member.name}
                </h2>
                {member.isLabManager ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand-soft px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                    <BadgeCheck className="h-3 w-3" />
                    Lab Manager
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  Degree / Program
                </p>
                <p className="mt-1 break-words text-sm font-semibold leading-5 text-brand">
                  {member.degree}
                </p>
              </div>
              {visibleEducationLines.length > 0 ? (
                <div className="mt-2.5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    Education
                  </p>
                  <div className="mt-1 space-y-0.5">
                    {visibleEducationLines.map((line) => (
                      <p
                        key={line}
                        className="break-words text-sm leading-5 text-muted"
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {researchText ? (
                <div className="mt-2.5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    Research
                  </p>
                  <p className="mt-1 line-clamp-3 break-words text-sm font-medium leading-5 text-foreground">
                    {researchText}
                  </p>
                </div>
              ) : null}
              {publicationLines.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedPublicationMember(member)}
                  className="mt-2.5 inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-brand transition hover:border-brand/35 hover:bg-brand-soft"
                >
                  Selected publications ({publicationLines.length})
                </button>
              ) : null}
              {member.email && member.email !== "TBD" ? (
                <a
                  href={`mailto:${member.email}`}
                  className="mt-3.5 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-brand"
                >
                  <Mail className="h-4 w-4" />
                  {member.email}
                </a>
              ) : (
                <p className="mt-3.5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                  <Mail className="h-4 w-4" />
                  TBD
                </p>
              )}
            </div>
            </article>
          );
        })}
      </div>

      {selectedPublicationMember ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Selected publications for ${selectedPublicationMember.name}`}
          onMouseDown={() => setSelectedPublicationMember(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-panel"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Selected Publications
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {selectedPublicationMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPublicationMember(null)}
                className="rounded-full border border-line p-1.5 text-muted transition hover:border-brand/35 hover:text-foreground"
                aria-label="Close selected publications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {selectedPublicationLines.map((publication) => (
                <p
                  key={publication}
                  className="rounded-md bg-surface px-3 py-2 text-sm leading-5 text-foreground"
                >
                  {publication}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
