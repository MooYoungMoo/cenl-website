"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchCurrentLabMembers } from "@/lib/members";
import { labMembers, type LabMember } from "@/lib/site-data";

export function LabMembersSection() {
  const [items, setItems] = useState<LabMember[]>(labMembers);

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

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No lab members are available yet.
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((member) => (
          <article
            key={member.id}
            className="elevated-card overflow-hidden border border-line bg-white"
          >
            {member.photoUrl ? (
              <div
                className="min-h-52 rounded-none bg-cover bg-center sm:min-h-56"
                style={{ backgroundImage: `url(${member.photoUrl})` }}
                role="img"
                aria-label={`${member.name} profile photo`}
              />
            ) : (
              <VisualPlaceholder
                label="Profile photo placeholder"
                className="min-h-56 rounded-none"
              />
            )}
            <div className="min-w-0 p-5 sm:p-6">
              <h2 className="break-words text-xl font-semibold">{member.name}</h2>
              {member.role ? (
                <p className="mt-2 break-words text-sm font-semibold text-foreground">
                  {member.role}
                </p>
              ) : null}
              <p className="mt-2 break-words text-sm font-medium text-brand">
                {member.degree}
              </p>
              <p className="mt-4 break-words text-sm leading-7 text-muted">
                {member.biography}
              </p>
              {member.email && member.email !== "TBD" ? (
                <a
                  href={`mailto:${member.email}`}
                  className="mt-5 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-brand"
                >
                  <Mail className="h-4 w-4" />
                  {member.email}
                </a>
              ) : (
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                  <Mail className="h-4 w-4" />
                  TBD
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
