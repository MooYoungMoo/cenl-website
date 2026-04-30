"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { fetchAlumniMembers } from "@/lib/members";
import { alumni, type AlumniProfile } from "@/lib/site-data";

export function AlumniSection() {
  const [items, setItems] = useState<AlumniProfile[]>(alumni);

  useEffect(() => {
    let mounted = true;

    const loadAlumni = async () => {
      try {
        const members = await fetchAlumniMembers();

        if (mounted && members.length > 0) {
          setItems(members);
        }
      } catch {
        if (mounted) {
          setItems(alumni);
        }
      }
    };

    void loadAlumni();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No alumni profiles are available yet.
        </div>
      ) : null}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((member) => (
          <article
            key={member.id}
            className="elevated-card overflow-hidden border border-line bg-white"
          >
            {member.photoUrl ? (
              <div
                className="min-h-48 rounded-none bg-cover bg-center sm:min-h-52"
                style={{ backgroundImage: `url(${member.photoUrl})` }}
                role="img"
                aria-label={`${member.name} alumni photo`}
              />
            ) : (
              <VisualPlaceholder
                label="Alumni photo placeholder"
                className="min-h-52 rounded-none"
              />
            )}
            <div className="min-w-0 p-5 sm:p-6">
              <h2 className="break-words text-xl font-semibold">{member.name}</h2>
              <p className="mt-2 break-words text-sm font-medium text-brand">
                {member.role}
              </p>
              <p className="mt-4 break-words text-sm leading-7 text-muted">
                {member.affiliation}
              </p>
              {member.biography ? (
                <p className="mt-3 break-words text-sm leading-7 text-muted">
                  {member.biography}
                </p>
              ) : null}
              {member.contact.includes("@") ? (
                <a
                  href={`mailto:${member.contact}`}
                  className="mt-5 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-brand"
                >
                  <Mail className="h-4 w-4" />
                  {member.contact}
                </a>
              ) : (
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                  <Mail className="h-4 w-4" />
                  {member.contact}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
