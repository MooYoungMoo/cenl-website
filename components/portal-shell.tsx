import Link from "next/link";
import { PortalAuthGuard } from "@/components/portal-auth-guard";
import { PortalLogoutButton } from "@/components/portal-logout-button";
import { portalNavigationSections } from "@/lib/site-data";

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
    <PortalAuthGuard>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-lg border border-line/70 bg-[#f9fbfc] p-6 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Lab Portal
          </p>
          <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
          <nav className="mt-7 grid gap-5">
            {portalNavigationSections.map((section) => (
              <div key={section.title}>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  {section.title}
                </p>
                <div className="mt-2 grid gap-1.5">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="group rounded-md border border-transparent px-3 py-2 transition hover:border-line/70 hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-md bg-brand/10 p-1.5 text-brand transition group-hover:bg-brand-soft">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-sm font-semibold">
                            {link.label}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 pl-8 text-xs leading-5 text-muted">
                          {link.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <PortalLogoutButton />
        </aside>
        <div className="rounded-lg border border-line/70 bg-surface p-8 shadow-panel md:p-10">
          {children}
        </div>
      </section>
    </PortalAuthGuard>
  );
}
