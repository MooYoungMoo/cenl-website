import { PortalShell } from "@/components/portal-shell";
import { receiptItems } from "@/lib/site-data";

export default function ReceiptsPage() {
  return (
    <PortalShell
      title="Receipts"
      description="Static receipt management surface for future uploads and reimbursements."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Receipts
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Receipt archive placeholder</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {receiptItems.map((item) => (
          <div key={item} className="elevated-card portal-card border border-line p-5">
            <p className="text-lg font-medium">{item}</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Placeholder metadata for requester, project code, upload date, and review status.
            </p>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
