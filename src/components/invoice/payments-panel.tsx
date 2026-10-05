"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "./editor/section";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { addPayment, deletePayment } from "@/lib/actions/invoice";
import type { InvoiceStatus, PaymentMethod, PaymentRow } from "@/types/database";
import { formatDate, formatMoney, paiseToInput, todayISO } from "@/lib/format";

export const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

/** Record a payment (full or partial). Inputs are stand-alone, not part of the invoice form. */
export function PaymentForm({
  invoiceId,
  balancePaise,
  onDone,
}: {
  invoiceId: string;
  balancePaise: number;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(balancePaise > 0 ? paiseToInput(balancePaise) : "");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const r = await addPayment({ invoice_id: invoiceId, amount, paid_on: paidOn, method, reference });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Payment recorded");
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Amount (₹)" htmlFor={`pay-amount-${invoiceId}`}>
        <Input id={`pay-amount-${invoiceId}`} inputMode="decimal" className="tnum" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Paid on" htmlFor={`pay-date-${invoiceId}`}>
        <Input id={`pay-date-${invoiceId}`} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </Field>
      <Field label="Method" htmlFor={`pay-method-${invoiceId}`}>
        <Select id={`pay-method-${invoiceId}`} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Reference" htmlFor={`pay-ref-${invoiceId}`} badge="optional">
        <Input id={`pay-ref-${invoiceId}`} placeholder="UTR / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Button className="col-span-2" onClick={submit} disabled={pending}>
        {pending ? "Saving…" : "Record payment"}
      </Button>
    </div>
  );
}

export function PaymentsPanel({
  invoiceId,
  payments,
  payablePaise,
  paidPaise,
  status,
}: {
  invoiceId: string;
  payments: PaymentRow[];
  payablePaise: number;
  paidPaise: number;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const balance = payablePaise - paidPaise;

  function remove(id: string) {
    if (!window.confirm("Remove this payment?")) return;
    start(async () => {
      const r = await deletePayment(id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Payment removed");
      router.refresh();
    });
  }

  return (
    <Section id="payments" title="Payments" summary={balance > 0 ? `${formatMoney(balance)} due` : "Fully paid"}>
      <dl className="mb-4 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-caption">Payable</dt>
          <dd className="tnum font-medium">{formatMoney(payablePaise)}</dd>
        </div>
        <div>
          <dt className="text-caption">Received</dt>
          <dd className="tnum font-medium text-success">{formatMoney(paidPaise)}</dd>
        </div>
        <div>
          <dt className="text-caption">Balance due</dt>
          <dd className="tnum font-medium text-accent">{formatMoney(Math.max(0, balance))}</dd>
        </div>
      </dl>
      {payments.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-lg border border-border">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="tnum font-medium">{formatMoney(p.amount_paise)}</span>
              <span className="min-w-0 flex-1 truncate text-ink-3">
                {formatDate(p.paid_on)} · {METHODS.find((m) => m.value === p.method)?.label ?? "—"}
                {p.reference ? ` · ${p.reference}` : ""}
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={pending}
                className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-danger"
                aria-label="Remove payment"
              >
                <Trash2 className="size-4 stroke-[1.5]" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {status !== "cancelled" && balance > 0 && <PaymentForm invoiceId={invoiceId} balancePaise={balance} />}
    </Section>
  );
}
