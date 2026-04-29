type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-[650] leading-tight text-foreground md:text-4xl">
        {title}
      </h2>
      <p className="text-base leading-8 text-muted md:text-lg">{description}</p>
    </div>
  );
}
