import { FileText } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { papers } from "@/lib/site-data";

export default function PapersPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Papers"
        title="Selected papers and manuscript placeholders"
        description="Paper entries are frontend-only placeholders that can later be connected to a publication database or managed content source."
      />
      <section className="mx-auto max-w-5xl px-6">
        <div className="space-y-5">
          {papers.map((paper) => (
            <article
              key={paper.id}
              className="elevated-card border border-line bg-white p-6"
            >
              <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                <VisualPlaceholder
                  label={paper.imageLabel}
                  className="min-h-32 rounded-md"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-soft p-2 text-brand">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
                      {paper.label}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">{paper.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">{paper.authors}</p>
                  <p className="mt-1 text-sm text-muted">
                    {paper.journal} | {paper.year}
                  </p>
                  {paper.doiUrl ? (
                    <a
                      href={paper.doiUrl}
                      className="mt-4 inline-flex text-sm font-medium text-brand transition hover:text-foreground"
                    >
                      DOI: {paper.doi}
                    </a>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-muted">
                      DOI: {paper.doi}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-muted">
                    Citations placeholder ready
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
