// Compliance checklist — 04 §3, §7. Lists what's missing; never blocks anything.
import type { DocType } from "@/types/database";
import type { BuyerSnapshot, SellerSnapshot } from "./types";
import { gstinWarning, invoiceNumberError } from "@/lib/validation/india";

export type ComplianceItem = {
  field: string;
  label: string;
  reason: string;
  severity: "recommended" | "required_for_gst";
};

export type ComplianceInput = {
  docType: DocType;
  invoiceNumber: string;
  issueDate: string | null;
  dueDate: string | null;
  placeOfSupplyCode: string | null;
  seller: SellerSnapshot;
  buyer: BuyerSnapshot;
  lines: { name: string; sac_hsn?: string | null }[];
  taxablePaise: number;
};

const B2C_ADDRESS_LIMIT_PAISE = 50_000_00; // ₹50,000 (Rule 46(e))

const has = (v: string | null | undefined) => !!v && v.trim() !== "";

export function complianceChecklist(i: ComplianceInput): ComplianceItem[] {
  const out: ComplianceItem[] = [];
  const add = (field: string, label: string, reason: string, severity: ComplianceItem["severity"] = "recommended") =>
    out.push({ field, label, reason, severity });
  const taxInvoice = i.docType === "tax_invoice";
  const lines = i.lines.filter((l) => has(l.name));
  const clientType = i.buyer.client_type ?? "individual";

  // Always
  if (!has(i.buyer.name)) add("buyer.name", "Client name", "Every invoice needs the recipient's name.");
  if (lines.length === 0) add("lines", "At least one item", "Add what you are billing for.");
  if (!has(i.seller.address_line1) || !has(i.seller.city))
    add("seller.address", "Your address", "Your address should appear on every invoice.");
  if (!has(i.issueDate)) add("issue_date", "Invoice date", "The date of issue is mandatory.");
  const numErr = invoiceNumberError(i.invoiceNumber);
  if (numErr) add("invoice_number", "Invoice number", numErr);
  if (i.seller.gstin && gstinWarning(i.seller.gstin))
    add("seller.gstin", "Your GSTIN", gstinWarning(i.seller.gstin)!, taxInvoice ? "required_for_gst" : "recommended");
  if (i.buyer.gstin && gstinWarning(i.buyer.gstin))
    add("buyer.gstin", "Client GSTIN", gstinWarning(i.buyer.gstin)!, taxInvoice ? "required_for_gst" : "recommended");

  // Tax invoice extras (Rule 46)
  if (taxInvoice) {
    if (!has(i.seller.gstin)) add("seller.gstin", "Your GSTIN", "A tax invoice must show your GSTIN.", "required_for_gst");
    const noSac = lines.filter((l) => !has(l.sac_hsn)).length;
    if (noSac > 0)
      add("lines.sac_hsn", "SAC / HSN codes", `${noSac} item${noSac > 1 ? "s" : ""} without a SAC/HSN code.`, "required_for_gst");
    if (!has(i.placeOfSupplyCode))
      add("place_of_supply", "Place of supply", "Decides CGST + SGST or IGST.", "required_for_gst");
    if (clientType === "business_registered" && !has(i.buyer.gstin))
      add("buyer.gstin", "Client GSTIN", "Needed so your client can claim GST credit.", "required_for_gst");
  }

  // Unregistered recipient above ₹50,000: address + state (Rule 46(e))
  if (!has(i.buyer.gstin) && i.taxablePaise > B2C_ADDRESS_LIMIT_PAISE) {
    if (!has(i.buyer.address_line1)) add("buyer.address", "Client address", "Needed for unregistered clients above ₹50,000.");
    if (!has(i.buyer.state_code)) add("buyer.state_code", "Client state", "Needed for unregistered clients above ₹50,000.");
  }

  // Recommended
  if ((clientType === "business_registered" || clientType === "business_unregistered") && !has(i.buyer.pan))
    add("buyer.pan", "Client PAN", "Business clients may deduct TDS and need it on record.");
  const hasBank = has(i.seller.bank_account_number) && has(i.seller.bank_ifsc);
  if (!hasBank && !has(i.seller.upi_id))
    add("seller.payment", "Bank or UPI details", "Tell your client how to pay you.");
  if (!has(i.dueDate)) add("due_date", "Due date", "A due date helps you get paid on time.");

  // de-duplicate by field (keep the first, which is the more specific message)
  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.field) ? false : (seen.add(x.field), true)));
}
