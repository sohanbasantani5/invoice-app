// Which document is this? — 04 §2.
import type { DocType, GstStatus } from "@/types/database";

export const DOC_TITLES: Record<DocType, string> = {
  tax_invoice: "TAX INVOICE",
  bill_of_supply: "BILL OF SUPPLY",
  invoice: "INVOICE",
  credit_note: "CREDIT NOTE",
};

export const DOC_LABELS: Record<DocType, string> = {
  tax_invoice: "Tax invoice",
  bill_of_supply: "Bill of supply",
  invoice: "Invoice",
  credit_note: "Credit note",
};

/** Default document type from the seller's GST status. */
export function defaultDocType(status: GstStatus | null | undefined): DocType {
  if (status === "regular") return "tax_invoice";
  if (status === "composition") return "bill_of_supply";
  return "invoice";
}

/** Regular seller whose lines are all 0% → suggest Bill of Supply (never forced). */
export function suggestBillOfSupply(status: GstStatus | null | undefined, rates: number[]): boolean {
  return status === "regular" && rates.length > 0 && rates.every((r) => r === 0);
}

/** Only a tax invoice (or a credit note against one) can carry GST. */
export function chargesTax(docType: DocType, status: GstStatus | null | undefined): boolean {
  if (docType === "tax_invoice") return true;
  if (docType === "credit_note") return status === "regular";
  return false;
}

/** Document types the user may pick for a given seller. */
export function allowedDocTypes(status: GstStatus | null | undefined): DocType[] {
  if (status === "regular") return ["tax_invoice", "bill_of_supply", "credit_note"];
  if (status === "composition") return ["bill_of_supply", "credit_note"];
  return ["invoice", "credit_note"];
}

export function footerLine(docType: DocType, status: GstStatus | null | undefined): string {
  if (status === "composition") return "Composition taxable person, not eligible to collect tax on supplies.";
  if (status !== "regular" && docType !== "tax_invoice") return "";
  return "This is a computer-generated invoice.";
}
