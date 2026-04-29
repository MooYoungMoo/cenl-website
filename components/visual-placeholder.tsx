type VisualPlaceholderProps = {
  label: string;
  className?: string;
};

export function VisualPlaceholder({
  label,
  className = "",
}: VisualPlaceholderProps) {
  return (
    <div
      className={`lab-image flex min-h-56 items-end rounded-lg p-5 text-white ${className}`}
      aria-label={label}
      role="img"
    >
      <span className="relative z-10 rounded-md border border-white/15 bg-black/30 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur">
        {label}
      </span>
    </div>
  );
}
