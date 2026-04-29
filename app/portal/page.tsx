import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { PortalAuthGuard } from "@/components/portal-auth-guard";
import { PortalLogoutButton } from "@/components/portal-logout-button";
import { portalLinks } from "@/lib/site-data";

export default function PortalPage() {
  const actionLinks = portalLinks.filter((item) => item.href !== "/portal");
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
      <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-16 pt-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-[#16242d] p-8 text-white shadow-panel md:p-10">
          <LockKeyhole className="h-8 w-8 text-brand-soft" />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-brand-soft">
            Portal Home
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            CENL payment tracking workspace
          </h1>
          <p className="mt-5 text-base leading-8 text-white/75">
            Students submit purchase requests without choosing a Funding Source.
            Professor/admin users assign Funding Sources when payments are made
            and keep Merchant records tidy.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 text-sm text-white/75">
              <ShieldCheck className="h-4 w-4" />
              Signed in
            </span>
          </div>
          <div className="mt-8 grid gap-5 text-sm leading-7 text-white/75">
            <div>
              <p className="font-semibold uppercase tracking-[0.16em] text-brand-soft">
                Student workflow
              </p>
              <ol className="mt-3 grid gap-2">
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
              <ol className="mt-3 grid gap-2">
                {managerWorkflow.map((item, index) => (
                  <li key={item}>
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="max-w-xs">
            <PortalLogoutButton />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {actionLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="elevated-card portal-card border border-line p-6"
              >
                <Icon className="h-6 w-6 text-brand" />
                <h2 className="mt-5 text-xl font-semibold">{item.label}</h2>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </PortalAuthGuard>
  );
}
