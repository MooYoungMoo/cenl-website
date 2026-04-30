import type { ReactNode } from "react";

const contributionLabels: Record<string, string> = {
  none: "",
  lab_author: "Lab author",
  first_author: "Lab first author",
  corresponding_author: "Lab corresponding author",
  first_and_corresponding_author: "Lab first & corresponding author",
};

type HighlightedAuthorsProps = {
  authors: string;
  highlightedAuthors?: string[];
};

export function getContributionLabel(value?: string | null) {
  return contributionLabels[value || "none"] ?? "";
}

export function ContributionBadge({
  contribution,
}: {
  contribution?: string | null;
}) {
  const label = getContributionLabel(contribution);

  if (!label) {
    return null;
  }

  return (
    <span className="rounded-md bg-brand-soft px-2 py-1 text-xs font-semibold text-brand">
      {label}
    </span>
  );
}

export function HighlightedAuthors({
  authors,
  highlightedAuthors = [],
}: HighlightedAuthorsProps) {
  const highlights = highlightedAuthors
    .map((author) => author.trim())
    .filter(Boolean)
    .sort((first, second) => second.length - first.length);

  if (highlights.length === 0) {
    return <>{authors}</>;
  }

  const lowerAuthors = authors.toLowerCase();
  const segments: ReactNode[] = [];
  let cursor = 0;

  while (cursor < authors.length) {
    let nextStart = -1;
    let nextHighlight = "";

    for (const highlight of highlights) {
      const matchIndex = lowerAuthors.indexOf(highlight.toLowerCase(), cursor);

      if (
        matchIndex !== -1 &&
        (nextStart === -1 || matchIndex < nextStart)
      ) {
        nextStart = matchIndex;
        nextHighlight = highlight;
      }
    }

    if (nextStart === -1) {
      segments.push(authors.slice(cursor));
      break;
    }

    if (nextStart > cursor) {
      segments.push(authors.slice(cursor, nextStart));
    }

    const end = nextStart + nextHighlight.length;
    segments.push(
      <strong key={`${nextStart}-${end}`} className="font-semibold text-foreground">
        {authors.slice(nextStart, end)}
      </strong>,
    );
    cursor = end;
  }

  return <>{segments}</>;
}
