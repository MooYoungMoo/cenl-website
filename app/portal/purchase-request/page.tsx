import { PortalShell } from "@/components/portal-shell";
import { PurchaseRequestPanel } from "@/components/purchase-request-panel";

export default function PurchaseRequestPage() {
  return (
    <PortalShell
      title="Purchase Request"
      description="Submit merchant-based requests for later payment tracking."
    >
      <PurchaseRequestPanel />
    </PortalShell>
  );
}
