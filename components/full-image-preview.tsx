"use client";

import { useEffect, useState } from "react";

type FullImagePreviewProps = {
  src: string;
  alt: string;
  children: React.ReactNode;
  className?: string;
};

export function FullImagePreview({
  src,
  alt,
  children,
  className = "",
}: FullImagePreviewProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block text-left ${className}`}
        aria-label={`View full image: ${alt}`}
      >
        {children}
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[0.68rem] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          View full image
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-6xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-white"
            >
              Close
            </button>
            <div
              className="h-[92vh] w-full rounded-lg bg-contain bg-center bg-no-repeat shadow-panel"
              style={{ backgroundImage: `url(${src})` }}
              role="img"
              aria-label={alt}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
