import Link from "next/link";
import { PortalShell } from "@/components/portal-shell";

export default function ReceiptsPage() {
  return (
    <PortalShell
      title="Receipts"
      description="Receipt upload is not part of the current Lab Portal workflow."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Receipts
      </p>
      <h2 className="mt-4 text-3xl font-semibold">
        Receipt upload is not used in the current Lab Portal workflow.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        Payment tracking is managed through Payment Tracker and Budget
        Dashboard. This route is kept as a safe placeholder, but it is hidden
        from the Lab Portal navigation.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/portal/approval-history"
          className="rounded-md border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:bg-white"
        >
          Open Payment Tracker
        </Link>
        <Link
          href="/portal/budget-dashboard"
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/40 hover:bg-brand-soft hover:text-foreground"
        >
          Open Budget Dashboard
        </Link>
      </div>
    </PortalShell>
  );
}
