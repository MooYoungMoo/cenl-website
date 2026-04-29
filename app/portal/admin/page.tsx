import { PortalShell } from "@/components/portal-shell";
import { adminItems } from "@/lib/site-data";

export default function AdminPage() {
  return (
    <PortalShell
      title="Admin"
      description="Private-looking administration page for future portal configuration."
    >
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
        Admin
      </p>
      <h2 className="mt-4 text-3xl font-semibold">Portal administration placeholder</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
        This page is only a UI scaffold. It does not manage real users,
        permissions, budgets, or records yet.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {adminItems.map((item) => (
          <div key={item.label} className="elevated-card portal-card border border-line p-5">
            <p className="text-lg font-medium">{item.label}</p>
            <div className="mt-4 h-2 rounded-full bg-[#eef3f6]">
              <div className="h-2 w-2/3 rounded-full bg-brand" />
            </div>
          </div>
        ))}
      </div>
    </PortalShell>
  );
}
