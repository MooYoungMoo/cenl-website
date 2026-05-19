type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 md:pb-10 md:pt-16">
      <div className="border-b border-line/70 pb-8 md:pb-10">
        <div className="page-hero-copy">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-5xl break-words text-3xl font-semibold leading-[1.08] sm:text-4xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-4xl break-words text-base leading-8 text-muted md:text-lg md:leading-9">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
