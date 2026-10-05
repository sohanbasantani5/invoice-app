// Invoice numbering — 03 §3, 04 §3(b), §12. Restarts every financial year (1 April).

/** "2026-10-04" → "2026-27"; "2027-03-31" → "2026-27". */
export function financialYear(isoDate: string): string {
  const y = Number(isoDate.slice(0, 4));
  const m = Number(isoDate.slice(5, 7));
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** First and last day of the FY that contains `isoDate`. */
export function financialYearRange(isoDate: string): { start: string; end: string } {
  const start = Number(financialYear(isoDate).slice(0, 4));
  return { start: `${start}-04-01`, end: `${start + 1}-03-31` };
}

/**
 * PREFIX/2026-27/001. Must stay ≤ 16 chars (legal limit): if too long, shorten the
 * FY to "2627", then drop the slashes, then trim the prefix.
 */
export function formatInvoiceNumber(prefix: string, fy: string, seq: number): string {
  const p = prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "") || "INV";
  const n = String(seq).padStart(3, "0");
  const shortFy = fy.slice(2, 4) + fy.slice(5, 7);
  const candidates = [`${p}/${fy}/${n}`, `${p}/${shortFy}/${n}`, `${p}${shortFy}${n}`];
  for (const c of candidates) if (c.length <= 16) return c;
  return `${p.slice(0, Math.max(1, 16 - shortFy.length - n.length))}${shortFy}${n}`.slice(0, 16);
}
