// Indian identifiers — docs/04-INDIA-COMPLIANCE.md §6.
// Format problems are soft warnings in the UI, never hard blocks.

import { STATES } from "@/lib/india/states";

export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const PINCODE_RE = /^[1-9][0-9]{5}$/;
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const UPI_RE = /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/;
export const INVOICE_NUMBER_RE = /^[A-Za-z0-9/-]+$/;

/** Uppercase and strip spaces — how GSTIN / PAN / IFSC are typed in. */
export function normalizeCode(v: string | null | undefined): string {
  return (v ?? "").replace(/\s+/g, "").toUpperCase();
}

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Standard GSTIN mod-36 check character for the first 14 characters. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export type GstinCheck =
  | { ok: true; stateCode: string; pan: string }
  | { ok: false; reason: "format" | "checksum" | "state" };

export function checkGstin(raw: string): GstinCheck {
  const g = normalizeCode(raw);
  if (!GSTIN_RE.test(g)) return { ok: false, reason: "format" };
  const stateCode = g.slice(0, 2);
  if (!STATES.some((s) => s.code === stateCode)) return { ok: false, reason: "state" };
  if (gstinCheckChar(g.slice(0, 14)) !== g[14]) return { ok: false, reason: "checksum" };
  return { ok: true, stateCode, pan: g.slice(2, 12) };
}

/** Soft warning message for a GSTIN, or null when it looks fine (or is empty). */
export function gstinWarning(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const r = checkGstin(raw);
  if (r.ok) return null;
  if (r.reason === "checksum") return "Check digit doesn't match — please re-check.";
  if (r.reason === "state") return "The first two digits aren't a valid state code.";
  return "This doesn't look like a valid GSTIN (15 characters).";
}

const soft =
  (re: RegExp, message: string, normalize = true) =>
  (raw: string | null | undefined): string | null => {
    if (!raw?.trim()) return null;
    return re.test(normalize ? normalizeCode(raw) : raw.trim()) ? null : message;
  };

export const panWarning = soft(PAN_RE, "PAN is 10 characters, like ABCDE1234F.");
export const pincodeWarning = soft(PINCODE_RE, "PIN code is 6 digits, like 421503.");
export const ifscWarning = soft(IFSC_RE, "IFSC is 11 characters, like HDFC0001234.");
export const upiWarning = soft(UPI_RE, "UPI ID looks like name@okhdfcbank.", false);

export function invoiceNumberError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "Invoice number is required.";
  if (v.length > 16) return "Invoice number can be at most 16 characters.";
  if (!INVOICE_NUMBER_RE.test(v)) return "Use only letters, digits, - and /.";
  return null;
}
