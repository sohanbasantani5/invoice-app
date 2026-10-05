// Everything printed on the invoice, already formatted. Both InvoicePaper (HTML preview)
// and InvoicePdf render ONLY from this model, so preview and PDF always say the same thing.

import type { CalcResult } from "./calc";
import type { InvoiceDocument } from "./types";
import { DOC_TITLES, footerLine } from "./doc-type";
import { amountInWords } from "./words";
import { ACCENTS } from "./template-tokens";
import { stateLabel } from "@/lib/india/states";
import { formatDate, formatMoney } from "@/lib/format";

export type PaperParty = { label: string; name: string; lines: string[]; codes: string[] };
export type PaperRow = {
  n: number;
  name: string;
  description: string | null;
  sac: string | null;
  qty: string;
  rate: string;
  discount: string;
  taxable: string;
  gst: string;
  amount: string;
};
export type TotalRow = { label: string; value: string; strong?: boolean; accent?: boolean; rule?: boolean };

export type PaperModel = {
  accent: string;
  accentSoft: string;
  title: string;
  number: string;
  cancelled: boolean;
  seller: { name: string; legalName: string | null; lines: string[]; codes: string | null; contact: string | null };
  meta: { label: string; value: string }[];
  billTo: PaperParty;
  shipTo: PaperParty | null;
  showDiscount: boolean;
  showGst: boolean;
  rows: PaperRow[];
  totals: TotalRow[];
  words: string;
  payment: { lines: { label: string; value: string }[]; upiText: string | null; upiCaption: string | null };
  notes: string | null;
  terms: string | null;
  signatureFor: string;
  showSignatureImage: boolean;
  footer: string;
};

const join = (parts: (string | null | undefined)[], sep = ", ") =>
  parts.map((p) => (p ?? "").trim()).filter(Boolean).join(sep);

function qtyText(q: number, unit: string | null | undefined): string {
  const n = Number.isInteger(q) ? String(q) : String(Number(q.toFixed(3)));
  return unit && unit !== "nos" ? `${n} ${unit}` : n;
}

/** upi://pay link for the scan-to-pay QR (01 §6). Null when there's nothing to pay or no UPI ID. */
export function upiLink(doc: InvoiceDocument, amountPaise: number): string | null {
  const pa = doc.seller.upi_id?.trim();
  if (!pa || amountPaise <= 0 || doc.currency !== "INR") return null;
  const p = new URLSearchParams({
    pa,
    pn: (doc.seller.business_name ?? doc.seller.legal_name ?? "").slice(0, 50),
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: doc.invoice_number || "Invoice",
  });
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

export function buildPaperModel(doc: InvoiceDocument, calc: CalcResult): PaperModel {
  const money = (p: number) => formatMoney(p, doc.currency);
  const plain = (p: number) => money(p).replace(/^[^\d-]+/, "");
  const accent = ACCENTS[doc.seller.template_accent ?? "pine"] ?? ACCENTS.pine;
  const s = doc.seller;
  const b = doc.buyer;
  const taxInvoice = doc.doc_type === "tax_invoice";

  const meta = [
    { label: "Invoice date", value: formatDate(doc.issue_date) || "—" },
    { label: "Due date", value: formatDate(doc.due_date) || "On receipt" },
    { label: "Place of supply", value: stateLabel(doc.place_of_supply_code) || "—" },
  ];
  if (taxInvoice) meta.push({ label: "Reverse charge", value: doc.reverse_charge ? "Yes" : "No" });
  if (doc.reference) meta.push({ label: "Reference", value: doc.reference });

  const billTo: PaperParty = {
    label: "Bill to",
    name: b.name || "Client name",
    lines: [
      b.contact_person ? `Attn: ${b.contact_person}` : "",
      join([b.address_line1, b.address_line2]),
      join([b.city, b.pincode], " "),
      b.state_code ? `State: ${stateLabel(b.state_code)}` : b.country && b.country !== "India" ? b.country : "",
    ].filter(Boolean),
    codes: [b.gstin ? `GSTIN ${b.gstin}` : "", b.pan ? `PAN ${b.pan}` : ""].filter(Boolean),
  };
  const st = doc.ship_to;
  const shipTo: PaperParty | null =
    st && (st.address_line1 || st.name)
      ? {
          label: "Ship to / place of delivery",
          name: st.name || b.name || "",
          lines: [join([st.address_line1, st.address_line2]), join([st.city, st.pincode], " "), st.state_code ? `State: ${stateLabel(st.state_code)}` : ""].filter(Boolean),
          codes: [],
        }
      : null;

  const rows: PaperRow[] = doc.lines
    .map((l, i) => ({ l, c: calc.lines[i] }))
    .filter(({ l }) => l.name.trim() !== "")
    .map(({ l, c }, i) => ({
      n: i + 1,
      name: l.name,
      description: l.description ?? null,
      sac: l.sac_hsn ?? null,
      qty: qtyText(l.quantity, l.unit),
      rate: plain(l.rate_paise),
      discount: c.discount ? plain(c.discount) : "—",
      taxable: plain(c.taxable),
      gst: `${c.gstRate}%`,
      amount: plain(c.amount),
    }));

  const totals: TotalRow[] = [{ label: "Subtotal", value: money(calc.subtotal) }];
  if (calc.discount) totals.push({ label: "Discount", value: `− ${money(calc.discount)}` });
  if (calc.discount || calc.hasTax) totals.push({ label: "Taxable value", value: money(calc.taxable) });
  for (const t of calc.byRate) {
    if (calc.intraState) {
      totals.push({ label: `CGST ${t.rate / 2}%`, value: money(t.cgst) });
      totals.push({ label: `SGST ${t.rate / 2}%`, value: money(t.sgst) });
    } else {
      totals.push({ label: `IGST ${t.rate}%`, value: money(t.igst) });
    }
  }
  if (calc.roundOff) totals.push({ label: "Round off", value: `${calc.roundOff > 0 ? "+" : "−"} ${money(Math.abs(calc.roundOff))}` });
  totals.push({ label: "Total", value: money(calc.total), strong: true, rule: true });
  if (doc.tds_enabled && calc.tds) {
    totals.push({ label: `Less ${doc.tds_label || "TDS"} (${doc.tds_rate}%)`, value: `− ${money(calc.tds)}` });
    totals.push({ label: "Net payable", value: money(calc.netPayable), strong: true });
  }
  if (calc.amountPaid) {
    totals.push({ label: "Amount paid", value: `− ${money(calc.amountPaid)}` });
  }
  if (calc.amountPaid || (doc.tds_enabled && calc.tds)) {
    totals.push({ label: "Balance due", value: money(calc.balanceDue), strong: true, accent: true });
  }

  const payLines: { label: string; value: string }[] = [];
  if (doc.show_bank) {
    if (s.bank_name) payLines.push({ label: "Bank", value: s.bank_name });
    if (s.bank_account_name) payLines.push({ label: "A/C name", value: s.bank_account_name });
    if (s.bank_account_number) payLines.push({ label: "A/C no.", value: s.bank_account_number });
    if (s.bank_ifsc) payLines.push({ label: "IFSC", value: s.bank_ifsc });
  }
  if (s.upi_id) payLines.push({ label: "UPI", value: s.upi_id });
  const payable = calc.balanceDue;
  const upiText = doc.show_upi_qr && doc.status !== "paid" && doc.status !== "cancelled" ? upiLink(doc, payable) : null;

  const sellerName = s.business_name || s.legal_name || "Your business name";
  return {
    accent: accent.hex,
    accentSoft: accent.soft,
    title: DOC_TITLES[doc.doc_type],
    number: doc.invoice_number || "—",
    cancelled: doc.status === "cancelled",
    seller: {
      name: sellerName,
      legalName: s.legal_name && s.legal_name !== s.business_name ? s.legal_name : null,
      lines: [join([s.address_line1, s.address_line2]), join([s.city, s.pincode], " "), s.state_code ? stateLabel(s.state_code) : ""].filter(Boolean),
      codes: join([s.gstin ? `GSTIN ${s.gstin}` : "", s.pan ? `PAN ${s.pan}` : ""], "  ·  ") || null,
      contact: join([s.email, s.phone], "  ·  ") || null,
    },
    meta,
    billTo,
    shipTo,
    showDiscount: calc.hasDiscount,
    showGst: calc.hasTax,
    rows,
    totals,
    words: amountInWords(calc.total, doc.currency),
    payment: {
      lines: payLines,
      upiText,
      upiCaption: upiText ? `Scan to pay ${money(payable)}` : null,
    },
    notes: doc.notes ?? null,
    terms: doc.terms ?? null,
    signatureFor: `For ${sellerName}`,
    showSignatureImage: doc.show_signature,
    footer: footerLine(doc.doc_type, s.gst_status),
  };
}
