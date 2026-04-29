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
    <section className="mx-auto max-w-7xl px-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {items.map((member) => (
          <article
            key={member.id}
            className="elevated-card overflow-hidden border border-line bg-white"
          >
            {member.photoUrl ? (
              <div
                className="min-h-56 rounded-none bg-cover bg-center"
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
            <div className="p-6">
              <h2 className="text-xl font-semibold">{member.name}</h2>
              {member.role ? (
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {member.role}
                </p>
              ) : null}
              <p className="mt-2 text-sm font-medium text-brand">
                {member.degree}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted">
                {member.biography}
              </p>
              {member.email && member.email !== "TBD" ? (
                <a
                  href={`mailto:${member.email}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"
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
