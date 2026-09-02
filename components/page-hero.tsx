type PageHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      <div className="border-b border-line/60 pb-6 text-center md:pb-7">
        <div className="page-hero-copy mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand sm:text-sm">
            {eyebrow}
          </p>
          <h1 className="mx-auto mt-3 max-w-4xl break-words text-3xl font-bold leading-[1.08] text-foreground sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mx-auto mt-4 max-w-3xl break-words text-sm leading-7 text-muted sm:text-base md:leading-8">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
