// Display-only formatting. Money is always integer paise until this point.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const inrPlain = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 10000000 → "₹1,00,000.00" */
export function formatMoney(paise: number, currency = "INR"): string {
  if (currency === "INR") return inr.format(paise / 100);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(paise / 100);
}

/** 10000000 → "1,00,000.00" (no symbol, for table cells) */
export function formatAmount(paise: number): string {
  return inrPlain.format(paise / 100);
}

/** Parse a user-typed rupee string ("4,000.5") into paise. Returns null if not a number. */
export function parseRupeesToPaise(input: string): number | null {
  const clean = input.replace(/[₹,\s]/g, "");
  if (!/^-?\d*(\.\d{0,2})?$/.test(clean) || clean === "" || clean === "-" || clean === ".") return null;
  const [whole, frac = ""] = clean.replace("-", "").split(".");
  const paise = Number(whole || "0") * 100 + Number((frac + "00").slice(0, 2));
  return clean.startsWith("-") ? -paise : paise;
}

/** Paise → editable rupee string without grouping: 400050 → "4000.50", 400000 → "4000" */
export function paiseToInput(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100);
  const p = abs % 100;
  return sign + (p ? `${rupees}.${String(p).padStart(2, "0")}` : String(rupees));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-04" → "04 Oct 2026" (dates are ISO strings, never shifted by timezone) */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Today's date in India as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
