// Form values ⇄ InvoiceDocument ⇄ database row. One conversion used by the live preview,
// the PDF and the save action, so all three always agree (rule 5).

import type { BuyerFormValues, InvoiceFormValues, LineFormValues } from "@/lib/validation/invoice";
import type { ClientRow, InvoiceItemRow, InvoiceRow, InvoiceStatus, ProfileRow } from "@/types/database";
import { calculateInvoice, type CalcResult } from "./calc";
import { chargesTax } from "./doc-type";
import type { BuyerSnapshot, InvoiceDocument, InvoiceLine, SellerSnapshot, ShipTo } from "./types";
import { paiseToInput, parseRupeesToPaise } from "@/lib/format";
import { normalizeCode } from "@/lib/validation/india";

const nul = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** Lenient number parse for quantities / rates typed as text ("1,000.5" → 1000.5). */
export function parseDecimal(v: string | null | undefined): number {
  const n = Number((v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function sellerFromProfile(p: Partial<ProfileRow> | null): SellerSnapshot {
  return {
    business_name: p?.business_name ?? null,
    legal_name: p?.legal_name ?? null,
    email: p?.email ?? null,
    phone: p?.phone ?? null,
    address_line1: p?.address_line1 ?? null,
    address_line2: p?.address_line2 ?? null,
    city: p?.city ?? null,
    state_code: p?.state_code ?? null,
    pincode: p?.pincode ?? null,
    gst_status: p?.gst_status ?? "unregistered",
    gstin: p?.gst_status === "unregistered" ? null : (p?.gstin ?? null),
    pan: p?.pan ?? null,
    bank_name: p?.bank_name ?? null,
    bank_account_name: p?.bank_account_name ?? null,
    bank_account_number: p?.bank_account_number ?? null,
    bank_ifsc: p?.bank_ifsc ?? null,
    upi_id: p?.upi_id ?? null,
    logo_path: p?.logo_path ?? null,
    signature_path: p?.signature_path ?? null,
    template_accent: p?.template_accent ?? "pine",
    show_logo: p?.show_logo ?? true,
  };
}

export function buyerFromForm(b: BuyerFormValues): BuyerSnapshot {
  return {
    name: nul(b.name),
    client_type: b.client_type ?? "individual",
    contact_person: nul(b.contact_person),
    email: nul(b.email),
    phone: nul(b.phone),
    address_line1: nul(b.address_line1),
    address_line2: nul(b.address_line2),
    city: nul(b.city),
    state_code: nul(b.state_code),
    pincode: nul(b.pincode),
    country: nul(b.country) ?? "India",
    gstin: nul(normalizeCode(b.gstin)),
    pan: nul(normalizeCode(b.pan)),
  };
}

export function buyerFormFromClient(c: Partial<ClientRow> | BuyerSnapshot | null): BuyerFormValues {
  return {
    name: c?.name ?? "",
    client_type: c?.client_type ?? "individual",
    contact_person: c?.contact_person ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    address_line1: c?.address_line1 ?? "",
    address_line2: c?.address_line2 ?? "",
    city: c?.city ?? "",
    state_code: c?.state_code ?? "",
    pincode: c?.pincode ?? "",
    country: c?.country ?? "India",
    gstin: c?.gstin ?? "",
    pan: c?.pan ?? "",
  };
}

export function formToDocument(
  v: InvoiceFormValues,
  seller: SellerSnapshot,
  extra: { status?: InvoiceStatus; amountPaidPaise?: number } = {},
): InvoiceDocument {
  const lines: InvoiceLine[] = v.lines.map((l) => ({
    name: l.name ?? "",
    description: nul(l.description),
    sac_hsn: nul(l.sac_hsn),
    unit: nul(l.unit),
    quantity: parseDecimal(l.quantity),
    rate_paise: parseRupeesToPaise(l.rate ?? "") ?? 0,
    discount_paise: parseRupeesToPaise(l.discount ?? "") ?? 0,
    gst_rate: Number(l.gst_rate) || 0,
  }));
  const ship: ShipTo | null =
    v.ship_to_enabled && v.ship_to
      ? {
          name: nul(v.ship_to.name),
          address_line1: nul(v.ship_to.address_line1),
          address_line2: nul(v.ship_to.address_line2),
          city: nul(v.ship_to.city),
          state_code: nul(v.ship_to.state_code),
          pincode: nul(v.ship_to.pincode),
        }
      : null;
  return {
    id: v.id,
    doc_type: v.doc_type,
    status: extra.status ?? "draft",
    invoice_number: (v.invoice_number ?? "").trim(),
    issue_date: v.issue_date,
    due_date: nul(v.due_date),
    place_of_supply_code: nul(v.place_of_supply_code),
    reverse_charge: !!v.reverse_charge,
    currency: v.currency ?? "INR",
    reference: nul(v.reference),
    seller,
    buyer: buyerFromForm(v.buyer),
    ship_to: ship,
    lines,
    round_off_enabled: v.round_off_enabled ?? true,
    tds_enabled: !!v.tds_enabled,
    tds_rate: parseDecimal(v.tds_rate),
    tds_label: nul(v.tds_label) ?? "TDS",
    amount_paid_paise: extra.amountPaidPaise ?? 0,
    notes: nul(v.notes),
    terms: nul(v.terms),
    show_bank: v.show_bank ?? true,
    show_upi_qr: v.show_upi_qr ?? true,
    show_signature: v.show_signature ?? true,
  };
}

export function calcDocument(doc: InvoiceDocument): CalcResult {
  return calculateInvoice({
    lines: doc.lines,
    chargeTax: chargesTax(doc.doc_type, doc.seller.gst_status),
    sellerStateCode: doc.seller.state_code,
    placeOfSupplyCode: doc.place_of_supply_code,
    roundOff: doc.round_off_enabled,
    tdsEnabled: doc.tds_enabled,
    tdsRate: doc.tds_rate,
    amountPaidPaise: doc.amount_paid_paise,
  });
}

/** Saved row + items → document (for preview, PDF, print, duplicate). */
export function rowToDocument(row: InvoiceRow, items: InvoiceItemRow[]): InvoiceDocument {
  return {
    id: row.id,
    doc_type: row.doc_type,
    status: row.status,
    invoice_number: row.invoice_number,
    issue_date: row.issue_date,
    due_date: row.due_date,
    place_of_supply_code: row.place_of_supply_code,
    reverse_charge: row.reverse_charge,
    currency: row.currency,
    reference: row.reference,
    seller: (row.seller ?? {}) as SellerSnapshot,
    buyer: (row.buyer ?? {}) as BuyerSnapshot,
    ship_to: (row.ship_to ?? null) as ShipTo | null,
    lines: [...items]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        name: i.name,
        description: i.description,
        sac_hsn: i.sac_hsn,
        unit: i.unit,
        quantity: Number(i.quantity),
        rate_paise: i.rate_paise,
        discount_paise: i.discount_paise,
        gst_rate: Number(i.gst_rate),
      })),
    round_off_enabled: row.round_off_enabled,
    tds_enabled: row.tds_enabled,
    tds_rate: Number(row.tds_rate),
    tds_label: row.tds_label,
    amount_paid_paise: row.amount_paid_paise,
    notes: row.notes,
    terms: row.terms,
    show_bank: row.show_bank,
    show_upi_qr: row.show_upi_qr,
    show_signature: row.show_signature,
  };
}

let keySeq = 0;
export function newLineKey() {
  keySeq += 1;
  return `l${Date.now().toString(36)}${keySeq}`;
}

export function emptyLine(gst: number): LineFormValues {
  return { key: newLineKey(), name: "", description: "", sac_hsn: "", unit: "nos", quantity: "1", rate: "", discount: "", gst_rate: gst };
}

/** Document → editor form values (open an invoice, or duplicate one). */
export function documentToForm(doc: InvoiceDocument, clientId: string | null): InvoiceFormValues {
  return {
    id: doc.id,
    doc_type: doc.doc_type,
    invoice_number: doc.invoice_number,
    auto_number: false,
    issue_date: doc.issue_date,
    due_date: doc.due_date ?? "",
    place_of_supply_code: doc.place_of_supply_code ?? "",
    reverse_charge: doc.reverse_charge,
    currency: (["INR", "USD", "EUR", "GBP"].includes(doc.currency) ? doc.currency : "INR") as "INR",
    reference: doc.reference ?? "",
    client_id: clientId,
    save_client: true,
    buyer: buyerFormFromClient(doc.buyer),
    ship_to_enabled: !!doc.ship_to,
    ship_to: {
      name: doc.ship_to?.name ?? "",
      address_line1: doc.ship_to?.address_line1 ?? "",
      address_line2: doc.ship_to?.address_line2 ?? "",
      city: doc.ship_to?.city ?? "",
      state_code: doc.ship_to?.state_code ?? "",
      pincode: doc.ship_to?.pincode ?? "",
    },
    lines: doc.lines.map((l) => ({
      key: newLineKey(),
      name: l.name,
      description: l.description ?? "",
      sac_hsn: l.sac_hsn ?? "",
      unit: l.unit ?? "nos",
      quantity: String(l.quantity),
      rate: paiseToInput(l.rate_paise),
      discount: l.discount_paise ? paiseToInput(l.discount_paise) : "",
      gst_rate: l.gst_rate,
    })),
    round_off_enabled: doc.round_off_enabled,
    tds_enabled: doc.tds_enabled,
    tds_rate: doc.tds_rate ? String(doc.tds_rate) : "",
    tds_label: doc.tds_label,
    notes: doc.notes ?? "",
    terms: doc.terms ?? "",
    show_bank: doc.show_bank,
    show_upi_qr: doc.show_upi_qr,
    show_signature: doc.show_signature,
  };
}

export { isOverdue } from "./overdue";
