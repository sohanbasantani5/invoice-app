// Email template: {placeholders} filled from the invoice. A line whose placeholder is empty is
// dropped, so a blank never shows up. {client_first_name} always fills in ("there" if unknown).

import { formatDate, formatMoney } from "@/lib/format";
import type { InvoiceDocument } from "./types";

export const DEFAULT_SUBJECT = "Invoice {invoice_no} from {my_name}";

/** PDF attached by Gmail draft: no link in the body. */
export const DEFAULT_BODY = `Hi {client_first_name},

Hope you're doing well. Attached is invoice {invoice_no} for {total}, due on {due_date}.

Payment details are on the invoice. Let me know once it's done, or if you need anything changed.

Thanks,
{my_first_name}`;

/** Gmail not connected: the PDF is downloaded and linked instead. */
export const DEFAULT_BODY_FALLBACK = `Hi {client_first_name},

Hope you're doing well. Your invoice {invoice_no} for {total} is ready, due on {due_date}.

View invoice: {link}

Payment details are on the invoice. Let me know once it's done, or if you need anything changed.

Thanks,
{my_first_name}`;

/** Wording shipped earlier. A saved template equal to one of these was never customised → use the new default. */
const LEGACY = new Set([
  "Invoice {invoice_no} from {business_name}",
  `Hi {client_name},\n\nPlease find attached invoice {invoice_no} for {amount}{due_phrase}.\n\nView invoice: {link}\n\n{payment_details}\n\nThank you,\n{my_name}\n{business_line}`,
]);

export const PLACEHOLDERS: { key: string; help: string }[] = [
  { key: "client_first_name", help: "Client's first name (contact person if set, otherwise first word of the name)" },
  { key: "client_name", help: "Client's full name" },
  { key: "invoice_no", help: "Invoice number" },
  { key: "total", help: "Invoice total, e.g. ₹1,18,000.00" },
  { key: "due_date", help: "Due date, e.g. 12 Oct 2026 (\"due on …\" is left out if there is none)" },
  { key: "link", help: "Secure 30-day link to the PDF (only used in the \"no Gmail\" message)" },
  { key: "my_name", help: "Your name: legal name, otherwise business name" },
  { key: "my_first_name", help: "First word of your name" },
];

const firstWord = (v: string | null | undefined) => (v ?? "").trim().split(/\s+/)[0] ?? "";

export function emailVars(doc: InvoiceDocument, totalPaise: number, link: string): Record<string, string> {
  const s = doc.seller;
  const myName = s.legal_name?.trim() || s.business_name?.trim() || "";
  const total = formatMoney(totalPaise, doc.currency);
  return {
    client_first_name: firstWord(doc.buyer.contact_person) || firstWord(doc.buyer.name) || "there",
    client_name: doc.buyer.name?.trim() ?? "",
    invoice_no: doc.invoice_number,
    total,
    amount: total, // old name
    due_date: formatDate(doc.due_date),
    link,
    my_name: myName,
    my_first_name: firstWord(myName),
  };
}

const TOKEN = /\{(\w+)\}/g;
const ALWAYS = new Set(["client_first_name"]);

export function renderTemplate(template: string, vars: Record<string, string>): string {
  // No due date: "…for ₹1,000.00, due on {due_date}." → "…for ₹1,000.00."
  const t = vars.due_date === "" ? template.replace(/,?\s*due on \{due_date\}/gi, "") : template;
  const out: string[] = [];
  for (const line of t.replace(/\r\n?/g, "\n").split("\n")) {
    let skip = false;
    const text = line.replace(TOKEN, (m, k: string) => {
      const v = vars[k];
      if (v === undefined) return m; // unknown placeholder: leave as typed
      if (v === "" && !ALWAYS.has(k)) skip = true;
      return v;
    });
    if (!skip) out.push(text);
  }
  // Dropping lines can leave stacked blank lines; keep at most one.
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Everything the Email button needs, loaded on the server. */
export type EmailConfig = {
  userId: string;
  /** Profile email: picks the right Gmail account in the compose URL. */
  authuser: string | null;
  /** Connected Gmail address (drafts with the PDF attached), or null. */
  gmailEmail: string | null;
  templates: EmailTemplates;
};

export type EmailTemplates = { subject: string | null; body: string | null; bodyFallback: string | null };

const norm = (v: string) => v.replace(/\r\n?/g, "\n");
export const isLegacyTemplate = (v: string) => LEGACY.has(norm(v));

const pick = (stored: string | null | undefined, fallback: string) => {
  const v = norm(stored ?? "");
  return v.trim() === "" || LEGACY.has(v) ? fallback : v;
};

/** mode "attached": the PDF goes in as an attachment, so the link never appears. mode "link": download + signed link. */
export function buildEmail(
  t: EmailTemplates,
  doc: InvoiceDocument,
  totalPaise: number,
  mode: "attached" | "link",
  link = "",
): { subject: string; body: string } {
  const vars = emailVars(doc, totalPaise, mode === "attached" ? "" : link);
  const body = mode === "attached" ? pick(t.body, DEFAULT_BODY) : pick(t.bodyFallback, DEFAULT_BODY_FALLBACK);
  return { subject: renderTemplate(pick(t.subject, DEFAULT_SUBJECT), vars), body: renderTemplate(body, vars) };
}

export function gmailUrl(p: { authuser?: string | null; to?: string | null; subject: string; body: string }): string {
  const q = [
    "view=cm",
    "fs=1",
    p.authuser ? `authuser=${encodeURIComponent(p.authuser)}` : "",
    `to=${encodeURIComponent(p.to ?? "")}`,
    `su=${encodeURIComponent(p.subject)}`,
    `body=${encodeURIComponent(p.body)}`,
  ]
    .filter(Boolean)
    .join("&");
  return `https://mail.google.com/mail/?${q}`;
}

/** Opening a Gmail draft: compose=<MESSAGE id from drafts.create>, in the right account. */
export function gmailDraftUrls(email: string, messageId: string) {
  const base = `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`;
  return { draft: `${base}#drafts?compose=${encodeURIComponent(messageId)}`, drafts: `${base}#drafts` };
}
