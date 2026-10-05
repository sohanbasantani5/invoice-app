import { describe, expect, it } from "vitest";
import {
  allowedDocTypes,
  chargesTax,
  defaultDocType,
  DOC_TITLES,
  footerLine,
  suggestBillOfSupply,
} from "@/lib/invoice/doc-type";
import { financialYear, financialYearRange, formatInvoiceNumber } from "@/lib/invoice/numbering";
import { complianceChecklist, type ComplianceInput } from "@/lib/invoice/compliance";

describe("doc type", () => {
  it("follows the seller's GST status (04 §2)", () => {
    expect(defaultDocType("unregistered")).toBe("invoice");
    expect(defaultDocType(null)).toBe("invoice");
    expect(defaultDocType("regular")).toBe("tax_invoice");
    expect(defaultDocType("composition")).toBe("bill_of_supply");
    expect(DOC_TITLES.tax_invoice).toBe("TAX INVOICE");
  });
  it("only tax invoices (and credit notes of registered sellers) charge tax", () => {
    expect(chargesTax("tax_invoice", "regular")).toBe(true);
    expect(chargesTax("bill_of_supply", "regular")).toBe(false);
    expect(chargesTax("invoice", "unregistered")).toBe(false);
    expect(chargesTax("credit_note", "regular")).toBe(true);
    expect(chargesTax("credit_note", "unregistered")).toBe(false);
  });
  it("suggests a bill of supply when every line is 0%", () => {
    expect(suggestBillOfSupply("regular", [0, 0])).toBe(true);
    expect(suggestBillOfSupply("regular", [0, 18])).toBe(false);
    expect(suggestBillOfSupply("regular", [])).toBe(false);
    expect(suggestBillOfSupply("unregistered", [0])).toBe(false);
  });
  it("allowed types and footers", () => {
    expect(allowedDocTypes("regular")).toContain("tax_invoice");
    expect(allowedDocTypes("composition")).toEqual(["bill_of_supply", "credit_note"]);
    expect(allowedDocTypes(undefined)).toEqual(["invoice", "credit_note"]);
    expect(footerLine("invoice", "unregistered")).toBe("Supplier not registered under GST.");
    expect(footerLine("bill_of_supply", "composition")).toMatch(/Composition taxable person/);
    expect(footerLine("tax_invoice", "regular")).toBe("This is a computer-generated invoice.");
  });
});

describe("numbering", () => {
  it("financial year runs April to March", () => {
    expect(financialYear("2026-10-04")).toBe("2026-27");
    expect(financialYear("2027-03-31")).toBe("2026-27");
    expect(financialYear("2027-04-01")).toBe("2027-28");
    expect(financialYear("2099-12-01")).toBe("2099-00");
    expect(financialYearRange("2027-01-15")).toEqual({ start: "2026-04-01", end: "2027-03-31" });
  });
  it("formats PREFIX/FY/SEQ within 16 characters", () => {
    expect(formatInvoiceNumber("SB", "2026-27", 1)).toBe("SB/2026-27/001");
    expect(formatInvoiceNumber("inv", "2026-27", 42)).toBe("INV/2026-27/042");
    expect(formatInvoiceNumber("STUDIO", "2026-27", 7)).toBe("STUDIO/2627/007");
    expect(formatInvoiceNumber("SAMPLEBZ", "2026-27", 7)).toBe("SAMPLEBZ2627007");
    expect(formatInvoiceNumber("", "2026-27", 1)).toBe("INV/2026-27/001");
    expect(formatInvoiceNumber("A B!", "2026-27", 1234)).toBe("AB/2026-27/1234");
    const long = formatInvoiceNumber("SAMPLEBZ", "2026-27", 1234567);
    expect(long.length).toBeLessThanOrEqual(16);
  });
});

const ok: ComplianceInput = {
  docType: "tax_invoice",
  invoiceNumber: "SB/2026-27/001",
  issueDate: "2026-10-04",
  dueDate: "2026-10-11",
  placeOfSupplyCode: "27",
  seller: {
    address_line1: "Flat 4",
    city: "Mumbai",
    gstin: "27ABCDE1234F1Z0",
    upi_id: "sample@okhdfcbank",
  },
  buyer: { name: "Acme", client_type: "business_registered", gstin: "29FGHIJ5678K1ZX", pan: "FGHIJ5678K" },
  lines: [{ name: "Podcast edit", sac_hsn: "999613" }],
  taxablePaise: 400000,
};
const fields = (i: ComplianceInput) => complianceChecklist(i).map((x) => x.field);

describe("compliance checklist", () => {
  it("complete tax invoice → nothing to review", () => {
    expect(complianceChecklist(ok)).toEqual([]);
  });

  it("tax invoice gaps are marked required_for_gst", () => {
    const r = complianceChecklist({
      ...ok,
      seller: { ...ok.seller, gstin: null },
      buyer: { ...ok.buyer, gstin: null },
      lines: [{ name: "A" }, { name: "B", sac_hsn: "" }],
      placeOfSupplyCode: null,
    });
    expect(r.filter((x) => x.severity === "required_for_gst").map((x) => x.field)).toEqual([
      "seller.gstin",
      "lines.sac_hsn",
      "place_of_supply",
      "buyer.gstin",
    ]);
    expect(r.find((x) => x.field === "lines.sac_hsn")?.reason).toBe("2 items without a SAC/HSN code.");
  });

  it("always-recommended items", () => {
    expect(
      fields({
        ...ok,
        docType: "invoice",
        invoiceNumber: "",
        issueDate: null,
        dueDate: null,
        seller: {},
        buyer: {},
        lines: [{ name: " " }],
      }),
    ).toEqual(["buyer.name", "lines", "seller.address", "issue_date", "invoice_number", "seller.payment", "due_date"]);
  });

  it("invalid GSTINs are flagged (amber on plain invoices)", () => {
    const r = complianceChecklist({
      ...ok,
      docType: "invoice",
      seller: { ...ok.seller, gstin: "27ABCDE1234F1ZA" },
      buyer: { ...ok.buyer, gstin: "BAD" },
    });
    expect(r.map((x) => [x.field, x.severity])).toEqual([
      ["seller.gstin", "recommended"],
      ["buyer.gstin", "recommended"],
    ]);
  });

  it("unregistered client above ₹50,000 needs address and state", () => {
    const i: ComplianceInput = { ...ok, docType: "invoice", buyer: { name: "Alex" }, taxablePaise: 50_000_01 };
    expect(fields(i)).toEqual(["buyer.address", "buyer.state_code"]);
    expect(fields({ ...i, taxablePaise: 50_000_00 })).toEqual([]);
  });

  it("business clients without PAN get a recommendation", () => {
    expect(fields({ ...ok, buyer: { ...ok.buyer, pan: null } })).toEqual(["buyer.pan"]);
    expect(fields({ ...ok, docType: "invoice", buyer: { name: "X", client_type: "business_unregistered" } })).toEqual([
      "buyer.pan",
    ]);
  });

  it("bank details count as payment info", () => {
    expect(
      fields({ ...ok, seller: { ...ok.seller, upi_id: null, bank_account_number: "123", bank_ifsc: "HDFC0001234" } }),
    ).toEqual([]);
  });
});
