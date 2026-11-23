import { describe, expect, it } from "vitest";
import {
  buildPaymentInsert,
  percentFromTdsWithheld,
  settlementMath,
  tdsWithheldFromPercent,
} from "@/lib/invoice/payment-math";

describe("tdsWithheldFromPercent (TDS % → ₹)", () => {
  it("computes withheld paise from a taxable base and rate", () => {
    // ₹10,000 taxable × 10% = ₹1,000
    expect(tdsWithheldFromPercent(1_000_000, 10)).toBe(100_000);
    // ₹10,000 × 2.5% = ₹250
    expect(tdsWithheldFromPercent(1_000_000, 2.5)).toBe(25_000);
  });

  it("returns 0 for a zero rate, zero base, or invalid input", () => {
    expect(tdsWithheldFromPercent(1_000_000, 0)).toBe(0);
    expect(tdsWithheldFromPercent(0, 10)).toBe(0);
    expect(tdsWithheldFromPercent(1_000_000, -5)).toBe(0);
    expect(tdsWithheldFromPercent(1_000_000, Number.NaN)).toBe(0);
  });
});

describe("percentFromTdsWithheld (₹ → TDS %)", () => {
  it("derives the percent from withheld paise", () => {
    // ₹1,000 / ₹10,000 = 10%
    expect(percentFromTdsWithheld(1_000_000, 100_000)).toBe(10);
    // ₹250 / ₹10,000 = 2.5%
    expect(percentFromTdsWithheld(1_000_000, 25_000)).toBe(2.5);
  });

  it("returns 0 when there is nothing to compute", () => {
    expect(percentFromTdsWithheld(0, 100_000)).toBe(0);
    expect(percentFromTdsWithheld(1_000_000, 0)).toBe(0);
    expect(percentFromTdsWithheld(1_000_000, -1)).toBe(0);
  });
});

describe("settlementMath (Paid rule: received + TDS >= total)", () => {
  const total = 1_000_000; // ₹10,000

  it("paid when cash + TDS covers the total", () => {
    const r = settlementMath({ totalPaise: total, receivedPaise: 0, tdsPaise: 0, amountPaise: 900_000, tdsAddedPaise: 100_000 });
    expect(r.settled).toBe(1_000_000);
    expect(r.paid).toBe(true);
    expect(r.balanceDue).toBe(0);
  });

  it("partially paid when the settlement is short", () => {
    const r = settlementMath({ totalPaise: total, receivedPaise: 0, tdsPaise: 0, amountPaise: 400_000, tdsAddedPaise: 100_000 });
    expect(r.settled).toBe(500_000);
    expect(r.paid).toBe(false);
    expect(r.balanceDue).toBe(500_000);
  });

  it("accumulates previous received + TDS", () => {
    const r = settlementMath({ totalPaise: total, receivedPaise: 400_000, tdsPaise: 100_000, amountPaise: 400_000, tdsAddedPaise: 100_000 });
    expect(r.amountPaidPaise).toBe(800_000);
    expect(r.tdsPaise).toBe(200_000);
    expect(r.settled).toBe(1_000_000);
    expect(r.paid).toBe(true);
  });
});

describe("buildPaymentInsert (user_id is always explicit)", () => {
  it("includes user_id and the TDS fields", () => {
    const row = buildPaymentInsert({
      invoiceId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      amountPaise: 900_000,
      tdsPaise: 100_000,
      tdsRate: 10,
      paidOn: "2026-10-08",
      method: "upi",
      reference: "UTR123",
    });
    expect(row.user_id).toBe("22222222-2222-2222-2222-222222222222");
    expect(row.amount_paise).toBe(900_000);
    expect(row.tds_paise).toBe(100_000);
    expect(row.tds_rate).toBe(10);
    expect(row.paid_on).toBe("2026-10-08");
    expect(row.reference).toBe("UTR123");
  });

  it("normalizes missing reference/method to null", () => {
    const row = buildPaymentInsert({
      invoiceId: "11111111-1111-1111-1111-111111111111",
      userId: "22222222-2222-2222-2222-222222222222",
      amountPaise: 1000,
      tdsPaise: 0,
      tdsRate: 0,
      paidOn: "2026-10-08",
    });
    expect(row.method).toBeNull();
    expect(row.reference).toBeNull();
    expect(row.user_id).toBe("22222222-2222-2222-2222-222222222222");
  });
});
