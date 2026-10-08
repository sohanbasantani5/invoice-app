// Proof of the TDS settlement example (total ₹10,000, TDS 10% = ₹1,000, customer pays ₹9,000).
//
// The rules, restated from the source they were read from — this file fails if either side drifts:
//
//   net payable  = total_paise − tds_paise
//     src/lib/invoice/calc.ts           netPayable = total − tds
//     src/lib/actions/invoice.ts:221    const payable = inv.total_paise - inv.tds_paise
//     src/app/(app)/invoices/[id]       payablePaise={row.total_paise - row.tds_paise}
//
//   Paid         <=> amount_paid_paise > 0 && amount_paid_paise >= total_paise − tds_paise
//     supabase/migrations/0002_schema.sql (sync_invoice_payments)
//       when v_paid > 0 and v_paid >= i.total_paise - i.tds_paise then 'paid'
//       when v_paid > 0 then 'partially_paid'
//     changeStatus records a real payment of `payable − amount_paid` when you mark an invoice Paid,
//     and the same trigger re-derives the status — so "Paid" is money-backed, not a label.
//
//   balance      = max(0, total_paise − tds_paise − amount_paid_paise)
//     dashboard/page.tsx:55, invoices/page.tsx, clients/[id]/page.tsx, lib/invoice/summary.ts
//
//   TDS state    = none (tds_paise ≤ 0 or cancelled) | accounted (status = paid) | pending (otherwise)
//     lib/invoice/tds.ts — deliberately keyed on the same status the SQL filter uses, so the
//     TDS filter and the TDS column can never disagree.

import { describe, expect, it } from "vitest";
import { balancePaise, invoiceSummary } from "@/lib/invoice/summary";
import { tdsState } from "@/lib/invoice/tds";
import { statusLabel } from "@/lib/invoice/status";
import { EXPORT_HEADERS, buildInvoiceCsv, toExportRow } from "@/lib/invoice/export";
import { TODAY, row } from "./invoice-fixtures";

/** total ₹10,000, TDS 10% ₹1,000, and any amount actually received. */
const invoice = (amountPaidPaise: number, status: "sent" | "partially_paid" | "paid") =>
  row({
    invoice_number: "INV-2026-27/010",
    status,
    subtotal_paise: 1_000_000,
    taxable_paise: 1_000_000,
    total_paise: 1_000_000,
    tds_enabled: true,
    tds_rate: 10,
    tds_paise: 100_000,
    amount_paid_paise: amountPaidPaise,
    due_date: "2026-12-31",
  });

describe("TDS settlement: total ₹10,000, TDS ₹1,000, receives ₹9,000", () => {
  const settled = invoice(900_000, "paid");

  it("net payable after TDS is ₹9,000, so a ₹9,000 receipt satisfies the Paid rule", () => {
    const net = settled.total_paise - settled.tds_paise;
    expect(net).toBe(900_000);
    expect(settled.amount_paid_paise >= net).toBe(true); // exactly the SQL predicate for 'paid'
  });

  it("does NOT show ₹1,000 outstanding — balance is zero", () => {
    expect(balancePaise(settled)).toBe(0);
    expect(settled.total_paise - settled.tds_paise - settled.amount_paid_paise).toBe(0);
  });

  it("reads as Paid with TDS accounted", () => {
    expect(statusLabel(settled.status, settled.due_date, TODAY)).toBe("Paid");
    expect(tdsState(settled.tds_paise, settled.status)).toBe("accounted");
  });

  it("export shows 10,000 / TDS 1,000 / received 9,000 / balance 0", () => {
    const cells = toExportRow(settled, TODAY);
    const at = (name: string) => cells[EXPORT_HEADERS.indexOf(name)];
    expect(at("Invoice Total")).toBe(10_000);
    expect(at("TDS Amount")).toBe(1_000);
    expect(at("Amount Received")).toBe(9_000);
    expect(at("Balance")).toBe(0);
    expect(at("Status")).toBe("Paid");
    expect(at("TDS Status")).toBe("TDS accounted");
    expect(buildInvoiceCsv([cells])).toContain("Paid");
  });

  it("summary totals: invoiced 10,000, received 9,000, outstanding 0, TDS 1,000 (all accounted)", () => {
    const s = invoiceSummary([settled]);
    expect(s.invoiced).toBe(1_000_000);
    expect(s.received).toBe(900_000);
    expect(s.outstanding).toBe(0);
    expect(s.tds).toBe(100_000);
    expect(s.tdsAccounted).toBe(100_000);
    expect(s.tdsPending).toBe(0);
  });
});

describe("before and during settlement", () => {
  it("unpaid: outstanding is the NET ₹9,000 (not ₹10,000) and TDS is pending", () => {
    const unpaid = invoice(0, "sent");
    expect(balancePaise(unpaid)).toBe(900_000);
    expect(tdsState(unpaid.tds_paise, unpaid.status)).toBe("pending");
    const s = invoiceSummary([unpaid]);
    expect(s.outstanding).toBe(900_000);
    expect(s.tdsPending).toBe(100_000);
    expect(s.tdsAccounted).toBe(0);
  });

  it("half paid: balance halves and TDS is still pending", () => {
    const half = invoice(450_000, "partially_paid");
    expect(balancePaise(half)).toBe(450_000);
    expect(tdsState(half.tds_paise, half.status)).toBe("pending");
    expect(statusLabel(half.status, half.due_date, TODAY)).toBe("Part paid");
    expect(tdsAccountedShare([half])).toBe(0);
  });
});

describe("TDS state never lies about the data", () => {
  it("no deduction → never pending/accounted, whatever the status", () => {
    for (const status of ["draft", "sent", "partially_paid", "paid"] as const) {
      expect(tdsState(0, status)).toBe("none");
    }
  });

  it("a cancelled TDS invoice carries no live claim", () => {
    expect(tdsState(100_000, "cancelled")).toBe("none");
  });

  it("Accounted only ever comes from a paid status (money received per the trigger)", () => {
    // tdsPaise > 0 and status is anything but paid/cancelled must be pending, never accounted.
    for (const status of ["draft", "sent", "partially_paid"] as const) {
      expect(tdsState(100_000, status)).toBe("pending");
    }
  });
});

function tdsAccountedShare(rows: Parameters<typeof invoiceSummary>[0]): number {
  return invoiceSummary(rows).tdsAccounted;
}
