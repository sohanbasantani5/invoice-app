"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Menu, MenuItem } from "@/components/ui/menu";
import { METHODS } from "./payments-panel";
import { changeStatus } from "@/lib/actions/invoice";
import type { InvoiceStatus, PaymentMethod } from "@/types/database";
import { formatMoney, paiseToInput, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAIN = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
] as const;
const LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  partially_paid: "Partially paid",
  cancelled: "Cancelled",
};

export type StatusState = { status: InvoiceStatus; amountPaidPaise: number };

/**
 * One control for the whole life of an invoice: Draft · Sent · Paid, with Partially paid and
 * Cancelled under "More". Any status can be picked directly. Updates show instantly and roll back
 * if the server says no.
 */
export function StatusControl({
  invoiceId,
  number,
  state,
  payablePaise,
  currency = "INR",
  lastMethod,
  onChange,
  beforeChange,
}: {
  invoiceId: string;
  number: string;
  state: StatusState;
  payablePaise: number;
  currency?: string;
  lastMethod: PaymentMethod;
  onChange: (s: StatusState) => void;
  /** Lets the editor save pending edits before the status moves. */
  beforeChange?: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [dialog, setDialog] = useState<null | "paid" | "partially_paid">(null);
  const balance = payablePaise - state.amountPaidPaise;
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>(lastMethod);
  const [reference, setReference] = useState("");

  function run(to: InvoiceStatus, extra: { amount?: string; paid_on?: string; method?: PaymentMethod; reference?: string } = {}) {
    const prev = state;
    // Instant feedback; the server's answer replaces it.
    onChange({ status: to, amountPaidPaise: to === "paid" ? payablePaise : to === "draft" || to === "sent" ? 0 : prev.amountPaidPaise });
    start(async () => {
      if (beforeChange && !(await beforeChange())) return void onChange(prev);
      const r = await changeStatus({ id: invoiceId, to, ...extra });
      if (!r.ok) {
        onChange(prev);
        return void toast.error(r.error);
      }
      onChange({ status: r.status, amountPaidPaise: r.amountPaidPaise });
      toast.success(`${number} is now ${LABEL[r.status].toLowerCase()}`);
      router.refresh();
    });
  }

  function choose(to: InvoiceStatus) {
    if (to === state.status) return;
    const hasPayments = state.amountPaidPaise > 0;
    if (to === "paid" || to === "partially_paid") {
      const fromPaid = state.status === "paid";
      if (to === "partially_paid" && fromPaid && !window.confirm("This removes the recorded payment and starts again with the amount you enter. Continue?")) return;
      setAmount(to === "paid" ? paiseToInput(Math.max(0, balance)) : "");
      setPaidOn(todayISO());
      setMethod(lastMethod);
      setReference("");
      return setDialog(to);
    }
    if ((to === "draft" || to === "sent") && hasPayments) {
      if (!window.confirm(`Changing away from ${state.status === "paid" ? "Paid" : "Partially paid"} removes the recorded payment${state.status === "paid" ? "" : "s"}. Continue?`)) return;
    }
    if (to === "cancelled" && !window.confirm("Cancel this invoice? It keeps its number and gets a CANCELLED mark.")) return;
    run(to);
  }

  function submitPayment() {
    if (!dialog) return;
    const to = dialog;
    setDialog(null);
    run(to, { amount: to === "partially_paid" ? amount : undefined, paid_on: paidOn, method, reference });
  }

  const inMore = state.status === "partially_paid" || state.status === "cancelled";
  const showBalance = (state.status === "sent" || state.status === "partially_paid") && balance > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* Phone: one dropdown */}
      <Select
        aria-label="Invoice status"
        value={state.status}
        onChange={(e) => choose(e.target.value as InvoiceStatus)}
        className="w-auto min-w-40 md:hidden"
      >
        {(Object.keys(LABEL) as InvoiceStatus[]).map((s) => (
          <option key={s} value={s}>
            {LABEL[s]}
          </option>
        ))}
      </Select>

      {/* Desktop: segmented control + More */}
      <div role="radiogroup" aria-label="Invoice status" className="hidden items-center gap-1 rounded-lg bg-surface-2 p-1 md:flex">
        {MAIN.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={state.status === o.value}
            onClick={() => choose(o.value)}
            className={cn(
              "h-8 rounded-md px-3.5 text-sm transition-colors duration-150",
              state.status === o.value ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        ))}
        <Menu
          triggerLabel="More statuses"
          triggerClassName={cn(
            "inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm transition-colors duration-150",
            inMore ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
          trigger={
            <>
              {inMore ? LABEL[state.status] : "More"} <ChevronDown className="size-3.5 stroke-[1.5]" aria-hidden />
            </>
          }
        >
          <MenuItem onClick={() => choose("partially_paid")}>Partially paid</MenuItem>
          <MenuItem danger onClick={() => choose("cancelled")}>
            Cancelled
          </MenuItem>
        </Menu>
      </div>

      {showBalance && (
        <p className="text-sm text-ink-2">
          Balance due <span className="tnum font-medium text-ink">{formatMoney(balance, currency)}</span>
        </p>
      )}

      <Dialog
        open={!!dialog}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog === "paid" ? `Mark ${number} as paid` : `Part payment for ${number}`}
        description={dialog === "paid" ? "Records the full balance as received." : `Balance due ${formatMoney(Math.max(0, balance), currency)}.`}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)" htmlFor="st-amount">
            <Input id="st-amount" inputMode="decimal" className="tnum" value={amount} readOnly={dialog === "paid"} onChange={(e) => setAmount(e.target.value)} autoFocus={dialog === "partially_paid"} />
          </Field>
          <Field label="Paid on" htmlFor="st-date">
            <Input id="st-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Field label="Method" htmlFor="st-method">
            <Select id="st-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference" htmlFor="st-ref" badge="optional">
            <Input id="st-ref" placeholder="UTR / cheque no." value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>
          <Button className="col-span-2" onClick={submitPayment}>
            {dialog === "paid" ? "Mark as paid" : "Record payment"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
