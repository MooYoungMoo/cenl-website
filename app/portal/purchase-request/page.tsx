import { PortalShell } from "@/components/portal-shell";
import { PurchaseRequestPanel } from "@/components/purchase-request-panel";

export default function PurchaseRequestPage() {
  return (
    <PortalShell
      title="Purchase Request"
      description="Submit purchase requests and review request status through the lab portal."
    >
      <PurchaseRequestPanel />
    </PortalShell>
  );
}
