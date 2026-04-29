import { PortalShell } from "@/components/portal-shell";
import { approvalRecords } from "@/lib/site-data";

export default function ApprovalHistoryPage() {
  return (
    <PortalShell
      title="Approval History"
      description="Review-style placeholder for purchase and reimbursement approvals."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        History
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Approval timeline placeholder</h2>
      <div className="mt-8 space-y-4">
        {approvalRecords.map((item) => (
          <article
            key={item.title}
            className="elevated-card portal-card border border-line p-5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.date}</p>
              </div>
              <span className="w-fit rounded-md bg-brand-soft px-3 py-2 text-sm font-medium text-brand">
                {item.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </PortalShell>
  );
}
