import { PortalShell } from "@/components/portal-shell";
import { budgetDashboardCards } from "@/lib/site-data";

export default function BudgetDashboardPage() {
  return (
    <PortalShell
      title="Budget Dashboard"
      description="Static budget interface for future grant and spending summaries."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Dashboard
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Budget overview placeholder</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {budgetDashboardCards.map((card) => (
          <article
            key={card.label}
            className="elevated-card portal-card border border-line p-5"
          >
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-brand">{card.value}</p>
          </article>
        ))}
      </div>
      <div className="portal-card mt-6 grid min-h-72 place-items-center rounded-md border border-dashed border-line text-center text-sm leading-7 text-muted">
        Future charts, grant filters, and export controls can appear here.
      </div>
    </PortalShell>
  );
}
