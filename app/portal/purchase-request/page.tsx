import { PortalShell } from "@/components/portal-shell";
import { purchaseRequestFields } from "@/lib/site-data";

export default function PurchaseRequestPage() {
  return (
    <PortalShell
      title="Purchase Request"
      description="Frontend placeholder for equipment, materials, software, and travel requests."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Request Draft
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Prepare a lab purchase request</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {purchaseRequestFields.map((label) => (
          <div key={label} className="portal-card rounded-md border border-line p-4">
            <p className="text-sm text-muted">{label}</p>
            <div className="mt-3 h-10 rounded-md bg-[#eef3f6]" />
          </div>
        ))}
      </div>
      <div className="portal-card mt-4 rounded-md border border-line p-4">
        <p className="text-sm text-muted">Research Justification</p>
        <div className="mt-3 h-28 rounded-md bg-[#eef3f6]" />
      </div>
      <div className="mt-6 rounded-md bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
        No real purchasing workflow is implemented.
      </div>
    </PortalShell>
  );
}
