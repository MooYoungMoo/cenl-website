import { PortalAuthGuard } from "@/components/portal-auth-guard";
import { PortalLogoutButton } from "@/components/portal-logout-button";
import { PortalNavigation } from "@/components/portal-navigation";

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
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 lg:pb-16 lg:pt-16">
        <aside className="h-fit rounded-lg border border-line/70 bg-[#f9fbfc] p-4 shadow-panel sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Lab Portal
          </p>
          <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
          <PortalNavigation />
          <PortalLogoutButton />
        </aside>
        <div className="min-w-0 rounded-lg border border-line/70 bg-surface p-4 shadow-panel sm:p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </section>
    </PortalAuthGuard>
  );
}
