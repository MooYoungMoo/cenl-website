import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { PortalAuthGuard } from "@/components/portal-auth-guard";
import { PortalLogoutButton } from "@/components/portal-logout-button";
import { portalNavigationSections } from "@/lib/site-data";

export default function PortalPage() {
  const paymentLinks =
    portalNavigationSections.find((section) => section.title === "Payment & Budget")
      ?.links ?? [];
  const websiteLinks =
    portalNavigationSections.find(
      (section) => section.title === "Website Management",
    )?.links ?? [];
  const systemAdminItems = [
    "User Management",
    "Funding Sources",
    "Project Admins",
    "Merchants",
  ];
  const studentWorkflow = [
    "Submit a purchase request",
    "Select or add a Merchant",
    "Track Pending Payment and Paid status",
  ];
  const managerWorkflow = [
    "Review Pending Payment items by Merchant",
    "Assign a Funding Source when payment is made",
    "Mark as Paid",
    "Monitor budgets",
    "Manage Merchants and Funding Sources in Admin",
  ];

  return (
    <PortalAuthGuard>
      <section className="mx-auto grid max-w-7xl gap-5 px-6 pb-10 pt-10 lg:grid-cols-[0.86fr_1.14fr]">
        <div className="rounded-lg border border-line bg-[#16242d] p-5 text-white shadow-panel md:p-6">
          <LockKeyhole className="h-6 w-6 text-brand-soft" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-soft">
            Portal Home
          </p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
            CENL payment tracking workspace
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/75">
            Students submit purchase requests without choosing a Funding Source.
            Professor/admin users assign Funding Sources when payments are made
            and keep Merchant records tidy.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-xs text-white/75">
              <ShieldCheck className="h-4 w-4" />
              Signed in
            </span>
          </div>
          <div className="mt-5 grid gap-4 text-xs leading-6 text-white/75 md:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="font-semibold uppercase tracking-[0.16em] text-brand-soft">
                Student workflow
              </p>
              <ol className="mt-2 grid gap-1">
                {studentWorkflow.map((item, index) => (
                  <li key={item}>
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[0.16em] text-brand-soft">
                Professor/admin workflow
              </p>
              <ol className="mt-2 grid gap-1">
                {managerWorkflow.map((item, index) => (
                  <li key={item}>
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-3 max-w-xs">
            <PortalLogoutButton />
          </div>
        </div>
        <div className="grid gap-4">
          <section className="portal-card rounded-lg border border-line bg-white/70 p-4 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  Payment & Budget
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Track merchant-based pending payments, paid expenses, and
                  funding source budgets.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {paymentLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-line/70 bg-surface px-3 py-3 transition hover:border-brand/40 hover:bg-white hover:shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-brand" />
                    <h2 className="mt-2 text-sm font-semibold">{item.label}</h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="portal-card rounded-lg border border-line bg-white/70 p-4 shadow-panel">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Website Management
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Manage public website content without editing code.
              </p>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {websiteLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-md border border-line/70 bg-surface px-3 py-2.5 transition hover:border-brand/40 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand" />
                      <h2 className="text-sm font-semibold">{item.label}</h2>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="portal-card rounded-lg border border-line bg-white/70 p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                  System Admin
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Manage users, funding sources, project admins, and merchant
                  records.
                </p>
              </div>
              <Link
                href="/portal/admin"
                className="rounded-md border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition hover:bg-white"
              >
                Open Admin
              </Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {systemAdminItems.map((item) => (
                <div
                  key={item}
                  className="rounded-md border border-line/70 bg-surface px-3 py-2 text-xs font-semibold text-muted"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </PortalAuthGuard>
  );
}
