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
      <h2 className="break-words text-2xl font-[650] leading-tight text-foreground sm:text-3xl md:text-4xl">
        {title}
      </h2>
      <p className="break-words text-base leading-8 text-muted md:text-lg">
        {description}
      </p>
    </div>
  );
}
