// THE single calculation function (03 §5). Used by the editor, the preview, the PDF
// and the server action (which recomputes — client totals are never trusted).
// All money is integer paise; quantities and rates are converted to integers first.

import { EXPORT_STATE_CODE } from "@/lib/india/states";

export type CalcLineInput = {
  quantity: number;
  rate_paise: number;
  discount_paise?: number;
  gst_rate: number;
};

export type CalcInput = {
  lines: CalcLineInput[];
  /** false for Bill of Supply / unregistered Invoice: all tax is 0 whatever the line rate. */
  chargeTax: boolean;
  sellerStateCode: string | null | undefined;
  placeOfSupplyCode: string | null | undefined;
  roundOff: boolean;
  tdsEnabled?: boolean;
  tdsRate?: number;
  amountPaidPaise?: number;
};

export type CalcLine = {
  gross: number;
  discount: number;
  taxable: number;
  gstRate: number;
  tax: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
};

export type TaxBucket = { rate: number; taxable: number; cgst: number; sgst: number; igst: number };

export type CalcResult = {
  lines: CalcLine[];
  intraState: boolean;
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  roundOff: number;
  total: number;
  tds: number;
  netPayable: number;
  amountPaid: number;
  balanceDue: number;
  /** Tax grouped by rate, for "CGST 9%" style rows. Sorted by rate. */
  byRate: TaxBucket[];
  hasDiscount: boolean;
  hasTax: boolean;
};

/** a / b rounded half away from zero, all integers (b > 0). */
export function divRound(a: bigint, b: bigint): bigint {
  const q = a / b;
  const r = a % b;
  if (r === BigInt(0)) return q;
  const twice = (r < BigInt(0) ? -r : r) * BigInt(2);
  if (twice >= b) return a < BigInt(0) ? q - BigInt(1) : q + BigInt(1);
  return q;
}

/** Decimal number → integer scaled by `scale` (e.g. 2.5 × 1000 → 2500), rounded half away from zero. */
export function toScaled(n: number, scale: number): bigint {
  if (!Number.isFinite(n)) return BigInt(0);
  const s = Math.round(Math.abs(n) * scale);
  return BigInt(n < 0 ? -s : s);
}

export function isIntraState(seller: string | null | undefined, pos: string | null | undefined): boolean {
  if (pos === EXPORT_STATE_CODE) return false;
  if (!seller || !pos) return true;
  return seller === pos;
}

export function calculateInvoice(input: CalcInput): CalcResult {
  const intraState = isIntraState(input.sellerStateCode, input.placeOfSupplyCode);
  const buckets = new Map<number, TaxBucket>();

  const lines: CalcLine[] = input.lines.map((l) => {
    const q = toScaled(l.quantity, 1000); // quantity has 3 decimals
    const rate = BigInt(Math.round(l.rate_paise || 0));
    const gross = Number(divRound(q * rate, BigInt(1000)));
    const rawDisc = Math.max(0, Math.round(l.discount_paise || 0));
    const discount = gross >= 0 ? Math.min(rawDisc, gross) : 0;
    const taxable = gross - discount;
    const gstRate = input.chargeTax ? Math.max(0, l.gst_rate || 0) : 0;
    const tax = Number(divRound(BigInt(taxable) * toScaled(gstRate, 100), BigInt(10000)));
    const cgst = intraState ? Math.floor(tax / 2) : 0;
    const sgst = intraState ? tax - cgst : 0;
    const igst = intraState ? 0 : tax;

    if (gstRate > 0 && taxable !== 0) {
      const b = buckets.get(gstRate) ?? { rate: gstRate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      b.taxable += taxable;
      b.cgst += cgst;
      b.sgst += sgst;
      b.igst += igst;
      buckets.set(gstRate, b);
    }
    return { gross, discount, taxable, gstRate, tax, cgst, sgst, igst, amount: taxable + tax };
  });

  const sum = (k: keyof CalcLine) => lines.reduce((a, l) => a + l[k], 0);
  const subtotal = sum("gross");
  const discount = sum("discount");
  const taxable = sum("taxable");
  const cgst = sum("cgst");
  const sgst = sum("sgst");
  const igst = sum("igst");
  const tax = cgst + sgst + igst;
  const raw = taxable + tax;
  const roundOff = input.roundOff ? Number(divRound(BigInt(raw), BigInt(100))) * 100 - raw : 0;
  const total = raw + roundOff;
  const tds = input.tdsEnabled
    ? Number(divRound(BigInt(taxable) * toScaled(input.tdsRate ?? 0, 100), BigInt(10000)))
    : 0;
  const netPayable = total - tds;
  const amountPaid = Math.round(input.amountPaidPaise ?? 0);

  return {
    lines,
    intraState,
    subtotal,
    discount,
    taxable,
    cgst,
    sgst,
    igst,
    tax,
    roundOff,
    total,
    tds,
    netPayable,
    amountPaid,
    balanceDue: netPayable - amountPaid,
    byRate: [...buckets.values()].sort((a, b) => a.rate - b.rate),
    hasDiscount: discount > 0,
    hasTax: tax > 0,
  };
}
