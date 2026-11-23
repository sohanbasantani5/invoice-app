// Proves the clean CA-friendly totals layout on the invoice paper/PDF model:
//   Billing: Subtotal … Total
//   Settlement (shown when anything is paid/withheld): Amount paid → TDS deducted → Balance due.
import { describe, expect, it } from "vitest";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { calcDocument } from "@/lib/invoice/document";
import type { InvoiceDocument } from "@/lib/invoice/types";

function doc(overrides: Partial<InvoiceDocument> = {}): InvoiceDocument {
  return {
    doc_type: "invoice",
    status: "sent",
    invoice_number: "INV/001",
    issue_date: "2026-10-08",
    due_date: null,
    place_of_supply_code: null,
    reverse_charge: false,
    currency: "INR",
    seller: { gst_status: "unregistered", state_code: "27", template_accent: "pine" },
    buyer: { name: "Acme", country: "India" },
    lines: [{ name: "Service", quantity: 1, rate_paise: 27_510_000, discount_paise: 0, gst_rate: 0 }],
    round_off_enabled: false,
    tds_enabled: false,
    tds_rate: 10,
    tds_label: "TDS",
    tds_paise: 0,
    amount_paid_paise: 0,
    notes: null,
    terms: null,
    show_bank: false,
    show_upi_qr: false,
    show_signature: false,
    template_id: "default",
    ...overrides,
  };
}

describe("buildPaperModel totals layout", () => {
  it("billing only when nothing has been paid or withheld", () => {
    const m = buildPaperModel(doc(), calcDocument(doc()));
    expect(m.totals.map((t) => t.label)).toEqual(["Subtotal", "Total"]);
    expect(m.totals[1]).toMatchObject({ rule: true, strong: true });
  });

  it("₹2,75,100 invoice − ₹2,47,590 paid − ₹27,510 TDS = ₹0 balance", () => {
    const d = doc({
      status: "paid",
      tds_rate: 10,
      tds_paise: 2_751_000, // ₹27,510
      amount_paid_paise: 24_759_000, // ₹2,47,590
    });
    const m = buildPaperModel(d, calcDocument(d));
    const labels = m.totals.map((t) => t.label);
    expect(labels).toEqual(["Subtotal", "Total", "TDS deducted (10%)", "Amount paid", "Balance due"]);

    expect(m.totals[0].value).toBe("₹2,75,100.00"); // Subtotal
    expect(m.totals[1].value).toBe("₹2,75,100.00"); // Total
    expect(m.totals[2].value).toBe("− ₹27,510.00"); // TDS deducted
    expect(m.totals[3].value).toBe("− ₹2,47,590.00"); // Amount paid
    expect(m.totals[4]).toMatchObject({ value: "₹0.00", strong: true, accent: true, rule: true }); // Balance due
  });

  it("shows only Amount paid when TDS is zero", () => {
    const d = doc({ amount_paid_paise: 10_000_00 });
    const m = buildPaperModel(d, calcDocument(d));
    expect(m.totals.map((t) => t.label)).toEqual(["Subtotal", "Total", "Amount paid", "Balance due"]);
    expect(m.totals[m.totals.length - 1].value).toBe("₹2,65,100.00"); // ₹2,75,100 − ₹10,000
  });

  it("balance is computed from stored total − paid − TDS, never negative", () => {
    // Overpay: paid more than total → balance clamps to 0.
    const d = doc({
      status: "paid",
      tds_paise: 2_751_000,
      amount_paid_paise: 30_000_000, // more than total
    });
    const m = buildPaperModel(d, calcDocument(d));
    expect(m.totals[m.totals.length - 1].value).toBe("₹0.00");
  });
});
