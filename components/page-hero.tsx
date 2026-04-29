type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 md:pt-22">
      <div className="border-b border-line/70 pb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-4xl text-4xl font-semibold md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-base leading-8 text-muted md:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
