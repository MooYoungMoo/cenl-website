import { Mail } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { alumni } from "@/lib/site-data";

export default function AlumniPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Alumni"
        title="CENL alumni and former lab members"
        description="This page is prepared for former student and researcher profiles with current affiliation placeholders."
      />
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {alumni.map((member) => (
            <article
              key={member.id}
              className="elevated-card overflow-hidden border border-line bg-white"
            >
              <VisualPlaceholder
                label="Alumni photo placeholder"
                className="min-h-52 rounded-none"
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold">{member.name}</h2>
                <p className="mt-2 text-sm font-medium text-brand">{member.role}</p>
                <p className="mt-4 text-sm leading-7 text-muted">
                  {member.affiliation}
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand">
                  <Mail className="h-4 w-4" />
                  {member.contact}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
