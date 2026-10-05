// Amount in words — 04 §11. INR uses the Indian system (lakh, crore);
// foreign currencies use the international system (million, billion).

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (r) parts.push(below100(r));
  return parts.join(" ");
}

/** Indian grouping: crore (10^7), lakh (10^5), thousand, hundred. */
export function indianWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${indianWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

export function internationalWords(n: number): string {
  if (n === 0) return "Zero";
  const scales = ["", " Thousand", " Million", " Billion", " Trillion"];
  const parts: string[] = [];
  let i = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(below1000(chunk) + scales[i]);
    n = Math.floor(n / 1000);
    i++;
  }
  return parts.join(" ");
}

const CURRENCY: Record<string, { major: string; minor: string }> = {
  INR: { major: "Indian Rupees", minor: "Paise" },
  USD: { major: "US Dollars", minor: "Cents" },
  EUR: { major: "Euros", minor: "Cents" },
  GBP: { major: "Pounds Sterling", minor: "Pence" },
};

/** 12345060 → "Indian Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty and Sixty Paise Only" */
export function amountInWords(paise: number, currency = "INR"): string {
  const c = CURRENCY[currency] ?? CURRENCY.INR;
  const abs = Math.abs(Math.round(paise));
  const major = Math.floor(abs / 100);
  const minor = abs % 100;
  const words = currency === "INR" ? indianWords : internationalWords;
  const minus = paise < 0 ? "Minus " : "";
  const minorText = minor ? ` and ${below100(minor)} ${c.minor}` : "";
  return `${c.major} ${minus}${words(major)}${minorText} Only`;
}
