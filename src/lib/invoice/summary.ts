// Summary of a filtered invoice list (the small strip above the table).
// Same money rules as the dashboard and the invoice view:
//   net payable = total_paise − tds_paise,  balance = net payable − amount_paid_paise
// Drafts and cancelled invoices are excluded from the money totals — they are not money owed or
// earned — but they still count towards `count`, and the caller says so in the caption.

import type { InvoiceStatus } from "@/types/database";
import { tdsState } from "./tds";

export type SummaryInput = {
  status: InvoiceStatus;
  currency: string;
  total_paise: number;
  tds_paise: number;
  amount_paid_paise: number;
};

export type InvoiceSummary = {
  /** Every row in the filtered result (including drafts and cancelled). */
  count: number;
  /** Issued rows these totals are based on (not draft, not cancelled, same currency). */
  issued: number;
  /** Issued rows still owed money (sent or partially paid). */
  open: number;
  invoiced: number;
  received: number;
  outstanding: number;
  tds: number;
  tdsPending: number;
  tdsAccounted: number;
  /** Rows left out of the money totals. */
  excludedDraftsCancelled: number;
  /** Rows in another currency (their amounts are never added to an INR total). */
  otherCurrency: number;
  currency: string;
};

/** Balance still owed on one invoice. Never negative (an overpayment is not a credit we track). */
export function balancePaise(r: { total_paise: number; tds_paise: number; amount_paid_paise: number }): number {
  return Math.max(0, r.total_paise - r.tds_paise - r.amount_paid_paise);
}

export function invoiceSummary(rows: SummaryInput[], currency = "INR"): InvoiceSummary {
  const same = rows.filter((r) => r.currency === currency);
  const issued = same.filter((r) => r.status !== "draft" && r.status !== "cancelled");
  const sum = (pick: (r: SummaryInput) => number) => issued.reduce((a, r) => a + pick(r), 0);
  return {
    count: rows.length,
    issued: issued.length,
    open: issued.filter((r) => r.status === "sent" || r.status === "partially_paid").length,
    invoiced: sum((r) => r.total_paise),
    received: sum((r) => r.amount_paid_paise),
    outstanding: sum(balancePaise),
    tds: sum((r) => r.tds_paise),
    tdsPending: sum((r) => (tdsState(r.tds_paise, r.status) === "pending" ? r.tds_paise : 0)),
    tdsAccounted: sum((r) => (tdsState(r.tds_paise, r.status) === "accounted" ? r.tds_paise : 0)),
    excludedDraftsCancelled: same.length - issued.length,
    otherCurrency: rows.length - same.length,
    currency,
  };
}
