"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Section } from "./editor/section";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { addPayment, deletePayment } from "@/lib/actions/invoice";
import { formatDate, formatMoney, paiseToInput, parseRupeesToPaise, todayISO } from "@/lib/format";
import { netReceivedFromDue, percentFromTdsWithheld, tdsWithheldFromPercent } from "@/lib/invoice/payment-math";
import { cn } from "@/lib/utils";
import type { InvoiceStatus, PaymentMethod, PaymentRow } from "@/types/database";

export const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

/**
 * Record a payment (full or partial). TDS is a DEDUCTION from the invoice amount:
 *   TDS Deducted     = round(taxable_base × tds% / 100)
 *   Net Amount Received = max(0, remaining due − TDS deducted)
 * The stored values are the NET cash received (payments.amount_paise) and the TDS deducted
 * (payments.tds_paise). The sync trigger marks the invoice Paid when cash + TDS ≥ total.
 */
export function PaymentForm({
  invoiceId,
  balancePaise,
  taxablePaise = 0,
  onDone,
}: {
  invoiceId: string;
  balancePaise: number;
  /** Taxable (GST-exclusive) value — the base TDS is calculated on. */
  taxablePaise?: number;
  onDone?: () => void;
}) {
  const router = useRouter();
  const duePaise = Math.max(0, balancePaise);
  const basePaise = Math.max(0, taxablePaise);

  const [tdsPercent, setTdsPercent] = useState("0");
  const [tdsDeducted, setTdsDeducted] = useState("");
  const [netReceived, setNetReceived] = useState(paiseToInput(duePaise));
  /** True once the user edits Net Amount Received by hand (a partial payment) — from then on,
   *  TDS changes must not clobber their amount. */
  const [netEdited, setNetEdited] = useState(false);
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [pending, start] = useTransition();

  const tdsPaise = parseRupeesToPaise(tdsDeducted) ?? 0;
  const netPaise = parseRupeesToPaise(netReceived) ?? 0;
  const remainingAfter = Math.max(0, duePaise - netPaise - tdsPaise);

  /** Re-derive Net Amount Received from the deduction unless the user narrowed it by hand. */
  function syncNetFromTds(deducted: number) {
    if (!netEdited) setNetReceived(paiseToInput(netReceivedFromDue(duePaise, deducted)));
  }

  function onPercentChange(raw: string) {
    setTdsPercent(raw);
    const pct = Math.max(0, Number(raw) || 0);
    const deducted = tdsWithheldFromPercent(basePaise, pct);
    setTdsDeducted(deducted > 0 ? paiseToInput(deducted) : "");
    syncNetFromTds(deducted);
  }

  function onTdsDeductedChange(raw: string) {
    setTdsDeducted(raw);
    const paise = parseRupeesToPaise(raw) ?? 0;
    const pct = percentFromTdsWithheld(basePaise, paise);
    setTdsPercent(pct > 0 ? String(pct) : "0");
    syncNetFromTds(paise);
  }

  function onNetChange(raw: string) {
    setNetReceived(raw);
    setNetEdited(true);
  }

  function submit() {
    start(async () => {
      const r = await addPayment({
        invoice_id: invoiceId,
        amount: netReceived,
        tds_rate: tdsPercent || "0",
        tds_paise_input: tdsDeducted || "0",
        paid_on: paidOn,
        method,
        reference,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Payment recorded");
      onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary line */}
      <p className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
        <span className="text-ink-3">Invoice Due</span>
        <span className="tnum font-medium">{formatMoney(duePaise)}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="TDS (%)" htmlFor={`pay-tds-pct-${invoiceId}`} helper={basePaise > 0 ? "Auto-calculates the TDS amount." : "No taxable base on this invoice."}>
          <Input id={`pay-tds-pct-${invoiceId}`} inputMode="decimal" className="tnum" placeholder="0" value={tdsPercent} onChange={(e) => onPercentChange(e.target.value)} />
        </Field>
        <Field label="TDS deducted (₹)" htmlFor={`pay-tds-amt-${invoiceId}`}>
          <Input id={`pay-tds-amt-${invoiceId}`} inputMode="decimal" className="tnum" placeholder="0" value={tdsDeducted} onChange={(e) => onTdsDeductedChange(e.target.value)} />
        </Field>
        <Field label="Net amount received (₹)" htmlFor={`pay-net-${invoiceId}`} helper={tdsPaise > 0 ? "After deducting TDS from the amount due." : "Defaults to the full amount due."}>
          <Input id={`pay-net-${invoiceId}`} inputMode="decimal" className="tnum" value={netReceived} onChange={(e) => onNetChange(e.target.value)} />
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
      </div>

      {/* Live settlement breakdown */}
      <div className="rounded-lg border border-border bg-surface-2/50 px-3 py-2.5 text-sm">
        <dl className="flex flex-col gap-1">
          <div className="flex justify-between">
            <dt className="text-ink-3">Invoice Due</dt>
            <dd className="tnum">{formatMoney(duePaise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Less: TDS deducted</dt>
            <dd className="tnum">{tdsPaise > 0 ? `− ${formatMoney(tdsPaise)}` : "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Less: Net cash received</dt>
            <dd className="tnum">{netPaise > 0 ? `− ${formatMoney(netPaise)}` : "—"}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-1.5 font-medium">
            <dt>Remaining balance after payment</dt>
            <dd className={cn("tnum", remainingAfter === 0 ? "text-success" : "text-accent")}>{formatMoney(remainingAfter)}</dd>
          </div>
        </dl>
      </div>

      <Button onClick={submit} disabled={pending}>
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
  taxablePaise,
}: {
  invoiceId: string;
  payments: PaymentRow[];
  payablePaise: number;
  paidPaise: number;
  status: InvoiceStatus;
  taxablePaise?: number;
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
              {p.tds_paise > 0 && (
                <span className="tnum rounded-md bg-surface-2 px-1.5 py-0.5 text-xs text-ink-2" title={`TDS ${p.tds_rate}% withheld`}>
                  TDS {formatMoney(p.tds_paise)}
                </span>
              )}
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
      {status !== "cancelled" && balance > 0 && <PaymentForm invoiceId={invoiceId} balancePaise={balance} taxablePaise={taxablePaise} />}
    </Section>
  );
}
