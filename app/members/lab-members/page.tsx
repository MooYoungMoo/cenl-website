import { Mail } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { labMembers } from "@/lib/site-data";

export default function LabMembersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Lab Members"
        title="Students and researchers in CENL"
        description="Each member card is ready for a real profile photo, degree or program, short biography, and email address."
      />
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {labMembers.map((member) => (
            <article
              key={member.id}
              className="elevated-card overflow-hidden border border-line bg-white"
            >
              <VisualPlaceholder
                label="Profile photo placeholder"
                className="min-h-56 rounded-none"
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold">{member.name}</h2>
                <p className="mt-2 text-sm font-medium text-brand">{member.degree}</p>
                <p className="mt-4 text-sm leading-7 text-muted">{member.biography}</p>
                <a
                  href={`mailto:${member.email}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand"
                >
                  <Mail className="h-4 w-4" />
                  {member.email}
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
