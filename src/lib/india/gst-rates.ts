// GST rates in force since 22 Sep 2025 — docs/04-INDIA-COMPLIANCE.md §4.
// 12% and 28% were abolished; do not add them back.
export const GST_RATES = [0, 5, 18, 40] as const;
export const MORE_GST_RATES = [0.25, 3] as const;
export const ALL_GST_RATES: readonly number[] = [...GST_RATES, ...MORE_GST_RATES];
export const DEFAULT_SERVICE_GST_RATE = 18;

/** "18% (9% CGST + 9% SGST)" intra-state, "18% IGST" inter-state, "0% (Nil / Exempt)". */
export function gstRateLabel(rate: number, intraState: boolean): string {
  if (rate === 0) return "0% (Nil / Exempt)";
  if (!intraState) return `${rate}% IGST`;
  const half = rate / 2;
  return `${rate}% (${half}% CGST + ${half}% SGST)`;
}
