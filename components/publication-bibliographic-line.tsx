type PublicationBibliographicLineProps = {
  journal: string;
  bibliographicDetails?: string | null;
  year: string;
  separator?: "|" | "·";
  tone?: "surface" | "overlay";
  className?: string;
};

export function PublicationBibliographicLine({
  journal,
  bibliographicDetails,
  year,
  separator = "|",
  tone = "surface",
  className = "",
}: PublicationBibliographicLineProps) {
  const journalName = journal.trim();
  const details = bibliographicDetails?.trim() ?? "";
  const displayYear = year.trim();
  const journalColor = tone === "overlay" ? "text-cyan-200" : "text-brand";
  const metadataColor =
    tone === "overlay" ? "text-white/80" : "text-foreground/75";
  const hasBibliographicText = Boolean(journalName || details);

  return (
    <p
      className={[className, "font-semibold", metadataColor]
        .filter(Boolean)
        .join(" ")}
    >
      {journalName ? <span className={journalColor}>{journalName}</span> : null}
      {details ? (
        <span>
          {journalName ? " " : ""}
          {details}
        </span>
      ) : null}
      {displayYear ? (
        <span>
          {hasBibliographicText ? " " + separator + " " : ""}
          {displayYear}
        </span>
      ) : null}
    </p>
  );
}
