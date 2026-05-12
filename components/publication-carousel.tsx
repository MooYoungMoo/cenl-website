"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import type { PublicationItem } from "@/lib/site-data";

type PublicationCarouselProps = {
  items: PublicationItem[];
};

function PublicationCard({ item }: { item: PublicationItem }) {
  const content = (
    <>
      {item.imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
          role="img"
          aria-label={item.imageLabel}
        />
      ) : (
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.34),transparent_28%),radial-gradient(circle_at_72%_18%,rgba(59,130,246,0.3),transparent_26%),linear-gradient(135deg,#0f2741,#164e63_52%,#dff7fb)]"
          role="img"
          aria-label={item.imageLabel}
        >
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(60deg,rgba(255,255,255,0.24)_1px,transparent_1px)] [background-size:34px_34px]" />
          <FileText className="absolute right-4 top-4 h-5 w-5 text-white/70" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-slate-950/92 via-slate-950/62 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-5 sm:text-base sm:leading-6">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-cyan-100 sm:text-sm">
          {item.journal} · {item.year}
        </p>
      </div>
    </>
  );

  const className =
    "group relative block aspect-square min-w-[78%] overflow-hidden rounded-lg border border-line/70 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-panel sm:min-w-[46%] lg:min-w-[31%]";

  if (item.doiUrl) {
    return (
      <a href={item.doiUrl} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

export function PublicationCarousel({ items }: PublicationCarouselProps) {
  const previewItems = items.slice(0, 6);

  if (previewItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-white/70 p-5 text-sm text-muted">
        No featured publications are available yet.
      </div>
    );
  }

  return (
    <div>
      <div className="flex snap-x gap-3 overflow-x-auto pb-3">
        {previewItems.map((item) => (
          <PublicationCard key={item.id} item={item} />
        ))}
      </div>
      <Link
        href="/publications/papers"
        className="inline-flex rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
      >
        More publications
      </Link>
    </div>
  );
}
