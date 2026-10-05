import { describe, expect, it } from "vitest";
import { calculateInvoice, divRound, isIntraState, toScaled, type CalcInput } from "@/lib/invoice/calc";

const base: Omit<CalcInput, "lines"> = {
  chargeTax: true,
  sellerStateCode: "27",
  placeOfSupplyCode: "27",
  roundOff: false,
};
const line = (rate_paise: number, gst_rate = 18, quantity = 1, discount_paise = 0) => ({
  rate_paise,
  gst_rate,
  quantity,
  discount_paise,
});

describe("divRound (half away from zero)", () => {
  it("rounds halves away from zero", () => {
    expect(divRound(BigInt(5), BigInt(2))).toBe(BigInt(3));
    expect(divRound(BigInt(-5), BigInt(2))).toBe(BigInt(-3));
    expect(divRound(BigInt(4), BigInt(3))).toBe(BigInt(1));
    expect(divRound(BigInt(-4), BigInt(3))).toBe(BigInt(-1));
    expect(divRound(BigInt(6), BigInt(3))).toBe(BigInt(2));
  });
  it("scales decimals to integers", () => {
    expect(toScaled(2.5, 1000)).toBe(BigInt(2500));
    expect(toScaled(-0.25, 100)).toBe(BigInt(-25));
    expect(toScaled(Number.NaN, 100)).toBe(BigInt(0));
  });
});

describe("isIntraState", () => {
  it("compares supplier state with place of supply", () => {
    expect(isIntraState("27", "27")).toBe(true);
    expect(isIntraState("27", "29")).toBe(false);
    expect(isIntraState("27", "96")).toBe(false);
    expect(isIntraState(null, "29")).toBe(true);
    expect(isIntraState("27", null)).toBe(true);
  });
});

describe("calculateInvoice", () => {
  it("zero GST", () => {
    const r = calculateInvoice({ ...base, lines: [line(400000, 0)] });
    expect(r.taxable).toBe(400000);
    expect(r.tax).toBe(0);
    expect(r.total).toBe(400000);
    expect(r.hasTax).toBe(false);
    expect(r.byRate).toEqual([]);
  });

  it("18% intra-state → CGST 9% + SGST 9%", () => {
    const r = calculateInvoice({ ...base, lines: [line(400000)] });
    expect(r.intraState).toBe(true);
    expect(r.cgst).toBe(36000);
    expect(r.sgst).toBe(36000);
    expect(r.igst).toBe(0);
    expect(r.total).toBe(472000);
    expect(r.byRate).toEqual([{ rate: 18, taxable: 400000, cgst: 36000, sgst: 36000, igst: 0 }]);
  });

  it("18% inter-state → IGST", () => {
    const r = calculateInvoice({ ...base, placeOfSupplyCode: "29", lines: [line(400000)] });
    expect(r.intraState).toBe(false);
    expect(r.igst).toBe(72000);
    expect(r.cgst + r.sgst).toBe(0);
    expect(r.total).toBe(472000);
  });

  it("mixed rates are summed per line and grouped by rate", () => {
    const r = calculateInvoice({ ...base, lines: [line(100000, 5), line(200000, 18), line(50000, 0), line(10000, 40)] });
    expect(r.lines.map((l) => l.tax)).toEqual([5000, 36000, 0, 4000]);
    expect(r.tax).toBe(45000);
    expect(r.taxable).toBe(360000);
    expect(r.total).toBe(405000);
    expect(r.byRate.map((b) => b.rate)).toEqual([5, 18, 40]);
  });

  it("discount reduces the taxable value before tax", () => {
    const r = calculateInvoice({ ...base, lines: [line(400000, 18, 1, 50000)] });
    expect(r.subtotal).toBe(400000);
    expect(r.discount).toBe(50000);
    expect(r.taxable).toBe(350000);
    expect(r.tax).toBe(63000);
    expect(r.hasDiscount).toBe(true);
  });

  it("discount can't exceed the line value; negatives are ignored", () => {
    const r = calculateInvoice({ ...base, lines: [line(1000, 18, 1, 5000), line(1000, 0, 1, -50)] });
    expect(r.lines[0].taxable).toBe(0);
    expect(r.lines[1].discount).toBe(0);
  });

  it("round-off up", () => {
    // 1 × ₹99.60 at 0% → ₹100.00, round off +0.40
    const r = calculateInvoice({ ...base, roundOff: true, lines: [line(9960, 0)] });
    expect(r.roundOff).toBe(40);
    expect(r.total).toBe(10000);
  });

  it("round-off down", () => {
    const r = calculateInvoice({ ...base, roundOff: true, lines: [line(10049, 0)] });
    expect(r.roundOff).toBe(-49);
    expect(r.total).toBe(10000);
  });

  it("round-off at exactly 50 paise goes up", () => {
    const r = calculateInvoice({ ...base, roundOff: true, lines: [line(10050, 0)] });
    expect(r.roundOff).toBe(50);
    expect(r.total).toBe(10100);
  });

  it("odd-paise tax splits CGST = floor, SGST = rest", () => {
    // ₹10.01 at 18% = 180.18 → 180 paise tax; ₹10.03 at 18% = 180.54 → 181 paise (odd)
    const r = calculateInvoice({ ...base, lines: [line(1003)] });
    expect(r.tax).toBe(181);
    expect(r.cgst).toBe(90);
    expect(r.sgst).toBe(91);
  });

  it("TDS is on the value excluding GST; balance due subtracts TDS and payments", () => {
    const r = calculateInvoice({
      ...base,
      lines: [line(1000000)],
      tdsEnabled: true,
      tdsRate: 10,
      amountPaidPaise: 500000,
    });
    expect(r.total).toBe(1180000);
    expect(r.tds).toBe(100000);
    expect(r.netPayable).toBe(1080000);
    expect(r.balanceDue).toBe(580000);
  });

  it("TDS off → 0 even with a rate", () => {
    const r = calculateInvoice({ ...base, lines: [line(1000000)], tdsRate: 10 });
    expect(r.tds).toBe(0);
  });

  it("quantity 2.5", () => {
    const r = calculateInvoice({ ...base, lines: [line(150000, 18, 2.5)] });
    expect(r.lines[0].gross).toBe(375000);
    expect(r.tax).toBe(67500);
  });

  it("fractional quantity rounds the line value half away from zero", () => {
    // 0.333 × ₹1.50 = 49.95 paise → 50
    const r = calculateInvoice({ ...base, lines: [line(150, 0, 0.333)] });
    expect(r.lines[0].gross).toBe(50);
  });

  it("no tax for Bill of Supply / unregistered invoice, whatever the line rate", () => {
    const r = calculateInvoice({ ...base, chargeTax: false, lines: [line(400000, 18)] });
    expect(r.tax).toBe(0);
    expect(r.lines[0].gstRate).toBe(0);
    expect(r.total).toBe(400000);
  });

  it("fractional GST rates (0.25%) stay exact", () => {
    const r = calculateInvoice({ ...base, placeOfSupplyCode: "07", lines: [line(1000000, 0.25)] });
    expect(r.igst).toBe(2500);
  });

  it("empty invoice is all zeros", () => {
    const r = calculateInvoice({ ...base, roundOff: true, lines: [] });
    expect(r.total).toBe(0);
    expect(r.roundOff).toBe(0);
    expect(r.balanceDue).toBe(0);
  });

  it("large amounts don't lose precision", () => {
    const r = calculateInvoice({ ...base, lines: [line(99_99_99_99_999_00, 18, 1)] });
    expect(r.taxable).toBe(99_99_99_99_999_00);
    expect(r.tax).toBe(17_99_99_99_999_82);
  });

  it("missing rate/discount fields are treated as zero", () => {
    const r = calculateInvoice({
      ...base,
      lines: [{ quantity: 1, rate_paise: Number.NaN, gst_rate: Number.NaN }],
    });
    expect(r.total).toBe(0);
  });
});
