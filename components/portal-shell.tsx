import Link from "next/link";
import { portalLinks } from "@/lib/site-data";

type PortalShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PortalShell({
  title,
  description,
  children,
}: PortalShellProps) {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit rounded-lg border border-line/70 bg-[#f9fbfc] p-6 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
          Lab Portal
        </p>
        <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        <nav className="mt-8 grid gap-3">
          {portalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="elevated-card portal-card border border-line/60 px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-brand/10 p-2 text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-medium">{link.label}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {link.description}
                </p>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="rounded-lg border border-line/70 bg-surface p-8 shadow-panel md:p-10">
        {children}
      </div>
    </section>
  );
}
