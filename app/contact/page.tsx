import { PageHero } from "@/components/page-hero";
import { VisualPlaceholder } from "@/components/visual-placeholder";
import { contactHighlights } from "@/lib/site-data";

export default function ContactPage() {
  return (
    <div className="pb-16">
      <PageHero
        eyebrow="Contact"
        title="Join CENL or start a research conversation"
        description="Contact information and student recruiting details are organized here as editable frontend content."
      />
      <section className="mx-auto max-w-7xl px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {contactHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="elevated-card border border-line bg-white p-7"
              >
                <Icon className="h-6 w-6 text-brand" />
                <h2 className="mt-4 text-2xl font-semibold">{item.title}</h2>
                {item.description ? (
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {item.description}
                  </p>
                ) : null}
                <div className="mt-6 space-y-5">
                  {item.fields?.map((field) => (
                    <div key={field.label}>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                        {field.label}
                      </p>
                      <div className="mt-2 space-y-2 text-sm leading-7 text-muted">
                        {field.values.map((value) =>
                          field.type === "email" && value !== "TBD" ? (
                            <a
                              key={value}
                              href={`mailto:${value}`}
                              className="block w-fit font-medium text-brand transition hover:text-foreground"
                            >
                              {value}
                            </a>
                          ) : (
                            <p key={value}>{value}</p>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-brand">
            Campus Map
          </p>
          <VisualPlaceholder label="Campus Map" className="min-h-[360px]" />
        </div>
      </section>
    </div>
  );
}
