import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { researchTopics } from "@/lib/site-data";

export default function ResearchPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Research"
        title="Chemoelectronic nanomaterials for intelligent chemical perception"
        description="CENL's research page is organized around expandable topic sections so new materials, devices, and sensing applications can be added as the lab grows."
      />
      <section className="mx-auto max-w-7xl px-6">
        <div className="space-y-10">
          {researchTopics.map((topic, index) => {
            const Icon = topic.icon;
            const reversed = index % 2 === 1;

            return (
              <article
                key={topic.slug}
                className="grid gap-8 border-b border-line pb-10 lg:grid-cols-2 lg:items-center"
              >
                <div className={reversed ? "lg:order-2" : ""}>
                  <VisualPlaceholder label={topic.imageLabel} className="min-h-[340px]" />
                </div>
                <div>
                  <span className="inline-flex rounded-md bg-brand-soft p-3 text-brand">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-5 text-3xl font-semibold">{topic.title}</h2>
                  <p className="mt-4 text-base leading-8 text-muted">
                    {topic.description}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {topic.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-md border border-line bg-white px-4 py-3 text-sm"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
