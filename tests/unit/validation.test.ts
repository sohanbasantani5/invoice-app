import { describe, expect, it } from "vitest";
import {
  checkGstin,
  gstinCheckChar,
  gstinWarning,
  ifscWarning,
  invoiceNumberError,
  normalizeCode,
  panWarning,
  pincodeWarning,
  upiWarning,
} from "@/lib/validation/india";
import { addressTaxSchema, businessSchema, defaultsSchema, paymentsSchema } from "@/lib/validation/profile";

describe("GSTIN", () => {
  it("check digit matches real GSTINs", () => {
    for (const g of ["27ABCDE1234F1Z0", "29FGHIJ5678K1ZX", "33PQRST9012U1Z5", "27KLMNO3456P1Z3"])
      expect(gstinCheckChar(g.slice(0, 14))).toBe(g[14]);
  });
  it("valid → derives state and PAN; spaces and case are forgiven", () => {
    expect(checkGstin(" 27abcde1234f1z0 ")).toEqual({ ok: true, stateCode: "27", pan: "ABCDE1234F" });
  });
  it("reports format, state and checksum problems", () => {
    expect(checkGstin("27ABCDE1234F1Z")).toEqual({ ok: false, reason: "format" });
    expect(checkGstin("99ABCDE1234F1Z0")).toEqual({ ok: false, reason: "state" });
    expect(checkGstin("27ABCDE1234F1ZA")).toEqual({ ok: false, reason: "checksum" });
  });
  it("warnings are soft and empty is fine", () => {
    expect(gstinWarning("")).toBeNull();
    expect(gstinWarning(null)).toBeNull();
    expect(gstinWarning("27ABCDE1234F1Z0")).toBeNull();
    expect(gstinWarning("27ABCDE1234F1ZA")).toMatch(/Check digit/);
    expect(gstinWarning("99ABCDE1234F1Z0")).toMatch(/state code/);
    expect(gstinWarning("hello")).toMatch(/15 characters/);
  });
});

describe("other identifiers", () => {
  it("PAN, PIN, IFSC, UPI", () => {
    expect(panWarning("abcde1234f")).toBeNull();
    expect(panWarning("ABCDE1234")).toMatch(/10 characters/);
    expect(pincodeWarning("421503")).toBeNull();
    expect(pincodeWarning("021503")).toMatch(/6 digits/);
    expect(ifscWarning("hdfc0001234")).toBeNull();
    expect(ifscWarning("HDFC1001234")).toMatch(/11 characters/);
    expect(upiWarning("name@okhdfcbank")).toBeNull();
    expect(upiWarning("name.surname-1@ybl")).toBeNull();
    expect(upiWarning("name")).toMatch(/UPI ID/);
    expect(panWarning(undefined)).toBeNull();
  });
  it("normalizeCode", () => {
    expect(normalizeCode(" ab c ")).toBe("ABC");
    expect(normalizeCode(null)).toBe("");
  });
  it("invoice number: required, ≤16, allowed characters", () => {
    expect(invoiceNumberError("SB/2026-27/001")).toBeNull();
    expect(invoiceNumberError(" ")).toMatch(/required/);
    expect(invoiceNumberError("A".repeat(17))).toMatch(/16/);
    expect(invoiceNumberError("SB#1")).toMatch(/letters, digits/);
  });
});

describe("profile schemas", () => {
  it("empty strings become null; codes are normalised", () => {
    expect(businessSchema.parse({ business_name: " Sample Business ", email: "", legal_name: "" })).toEqual({
      business_name: "Sample Business",
      email: null,
      legal_name: null,
    });
    expect(
      addressTaxSchema.parse({ gst_status: "regular", gstin: "27abcde 1234f1z0", pan: "", state_code: "27" }),
    ).toMatchObject({ gstin: "27ABCDE1234F1Z0", pan: null, state_code: "27" });
  });
  it("bad formats are accepted (warnings only), wrong types are not", () => {
    expect(paymentsSchema.safeParse({ bank_ifsc: "nonsense", upi_id: "x" }).success).toBe(true);
    expect(addressTaxSchema.safeParse({ gst_status: "maybe" }).success).toBe(false);
    expect(businessSchema.safeParse({ email: "nope" }).success).toBe(false);
    expect(addressTaxSchema.safeParse({ gst_status: "regular", state_code: "Maharashtra" }).success).toBe(false);
  });
  it("defaults: prefix uppercase with fallback, due days coerced", () => {
    const base = { default_due_days: "15", round_off_default: true, template_accent: "pine", show_logo: true };
    expect(defaultsSchema.parse({ ...base, invoice_prefix: "sb" })).toMatchObject({ invoice_prefix: "SB", default_due_days: 15 });
    expect(defaultsSchema.parse({ ...base, invoice_prefix: "" }).invoice_prefix).toBe("INV");
    expect(defaultsSchema.safeParse({ ...base, invoice_prefix: "TOOLONGPREFIX" }).success).toBe(false);
  });
});
