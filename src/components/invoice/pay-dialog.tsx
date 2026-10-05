"use client";

import { Dialog } from "@/components/ui/dialog";
import { PaymentForm } from "./payments-panel";

/** Record a payment from the invoice list. Loaded only when opened. */
export function PayDialog({ invoice, onClose }: { invoice: { id: string; number: string; balancePaise: number }; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Payment for ${invoice.number}`} description="Full or part payment. The balance updates automatically.">
      <PaymentForm invoiceId={invoice.id} balancePaise={invoice.balancePaise} onDone={onClose} />
    </Dialog>
  );
}
