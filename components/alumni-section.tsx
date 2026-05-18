"use client";

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { FullImagePreview } from "@/components/full-image-preview";
import { fetchAlumniMembers } from "@/lib/members";
import { alumni, type AlumniProfile } from "@/lib/site-data";

type AlumniGroupKey =
  | "graduate_student"
  | "postdoc"
  | "undergraduate_intern"
  | "other";

const alumniGroups: { key: AlumniGroupKey; label: string }[] = [
  { key: "graduate_student", label: "Graduate Students" },
  { key: "postdoc", label: "Postdocs" },
  { key: "undergraduate_intern", label: "Undergraduate Interns" },
  { key: "other", label: "Other Alumni" },
];

function getAlumniGroup(member: AlumniProfile): AlumniGroupKey {
  if (
    member.alumniCategory === "graduate_student" ||
    member.alumniCategory === "postdoc" ||
    member.alumniCategory === "undergraduate_intern"
  ) {
    return member.alumniCategory;
  }

  const role = member.role.toLowerCase();

  if (role.includes("postdoc")) {
    return "postdoc";
  }

  if (role.includes("undergraduate")) {
    return "undergraduate_intern";
  }

  if (role.includes("m.s.") || role.includes("ph.d.")) {
    return "graduate_student";
  }

  return "other";
}

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

  const groupedItems = alumniGroups.map((group) => ({
    ...group,
    members: items.filter((member) => getAlumniGroup(member) === group.key),
  }));

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-6 text-sm text-muted">
          No alumni profiles are available yet.
        </div>
      ) : null}

      <div className="space-y-5">
        {groupedItems.map((group) =>
          group.members.length > 0 ? (
            <section
              key={group.key}
              className="rounded-lg border border-line bg-white/80 p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{group.label}</h2>
              <div className="mt-3 divide-y divide-line">
                {group.members.map((member) => (
                  <article
                    key={member.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">
                        {member.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-muted">
                        {member.currentPosition || member.affiliation}
                      </p>
                    </div>
                    {member.photoUrl ? (
                      <FullImagePreview
                        src={member.photoUrl}
                        alt={`${member.name} alumni photo`}
                      >
                        <div
                          className="h-12 w-9 shrink-0 rounded-md border border-line bg-cover bg-top"
                          style={{
                            backgroundImage: `url(${member.photoUrl})`,
                          }}
                          role="img"
                          aria-label={`${member.name} alumni photo preview`}
                        />
                      </FullImagePreview>
                    ) : (
                      <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-muted">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ) : null,
        )}
      </div>
    </section>
  );
}
