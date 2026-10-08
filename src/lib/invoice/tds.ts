// TDS state — derived, never stored (03 §3).
//
// TDS is money the *client* withholds from the invoice and deposits with the government; it is
// not part of the cash we receive. The app already stores everything needed on the invoice:
//   invoices.tds_enabled, invoices.tds_rate, invoices.tds_label, invoices.tds_paise
// (`tds_paise` is computed in calc.ts as tds_rate% of the taxable value). There is no separate
// "TDS received" record — and none is needed: the state is a function of the invoice's own
// stored fields and its status, so no migration and no duplicate field is introduced.

import type { InvoiceStatus } from "@/types/database";

export type TdsState = "none" | "pending" | "accounted";

export const TDS_STATE_LABELS: Record<TdsState, string> = {
  none: "No TDS",
  pending: "TDS pending",
  accounted: "TDS accounted",
};

/** Short forms for the in-table pill (full labels are used in filters, exports and the report). */
export const TDS_SHORT_LABELS: Record<TdsState, string> = {
  none: "No TDS",
  pending: "Pending",
  accounted: "Accounted",
};

/**
 * - `none`      — no TDS on this invoice (or it was cancelled, so there is no live claim)
 * - `pending`   — TDS applies and the invoice is not settled yet: the client has not deducted it
 * - `accounted` — TDS applies and the invoice is fully paid, so the deduction has happened and
 *                 the credit can be claimed in the return
 *
 * `tds_paise > 0` is the test for "TDS applies" (a switch left on with a 0% rate deducts nothing).
 */
export function tdsState(tdsPaise: number, status: InvoiceStatus): TdsState {
  if (!(tdsPaise > 0) || status === "cancelled") return "none";
  return status === "paid" ? "accounted" : "pending";
}
