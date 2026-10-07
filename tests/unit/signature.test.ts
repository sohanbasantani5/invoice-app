import { describe, expect, it } from "vitest";
import {
  buildSignatureState,
  ELECTRONIC_DOCUMENT_NOTICE,
  type SignatureState,
} from "@/lib/invoice/signature";
import {
  backgroundAlpha,
  removeLightBackground,
  SIGNATURE_HINT,
  SIGNATURE_TYPES,
} from "@/lib/invoice/signature-image";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { calcDocument } from "@/lib/invoice/document";
import type { InvoiceDocument } from "@/lib/invoice/types";

describe("signature state", () => {
  it("shows the notice only when the signature is switched off", () => {
    expect(buildSignatureState(false, "Sohan Studio")).toEqual<SignatureState>({
      enabled: false,
      forLine: "For Sohan Studio",
      notice: ELECTRONIC_DOCUMENT_NOTICE,
    });
  });

  it("uses the seller name on the signatory line when on", () => {
    expect(buildSignatureState(true, "Sohan Studio")).toEqual<SignatureState>({
      enabled: true,
      forLine: "For Sohan Studio",
      notice: ELECTRONIC_DOCUMENT_NOTICE,
    });
  });

  it("defaults to showing the signature block for invoices saved before the toggle", () => {
    expect(buildSignatureState(undefined, "X").enabled).toBe(true);
    expect(buildSignatureState(null, "X").enabled).toBe(true);
  });

  it("keeps the leading asterisk and the exact wording", () => {
    expect(ELECTRONIC_DOCUMENT_NOTICE[0]).toBe("*");
    expect(ELECTRONIC_DOCUMENT_NOTICE).toBe("*This is an electronically generated document. No signature is required.");
  });
});

const doc = (over: Partial<InvoiceDocument> = {}): InvoiceDocument => ({
  doc_type: "invoice",
  status: "draft",
  invoice_number: "INV/2026-27/001",
  issue_date: "2026-10-04",
  due_date: null,
  place_of_supply_code: "27",
  reverse_charge: false,
  currency: "INR",
  seller: { business_name: "Sohan Studio", gst_status: "unregistered" },
  buyer: { name: "Acme" },
  lines: [{ name: "Podcast edit", quantity: 1, rate_paise: 100000, discount_paise: 0, gst_rate: 0 }],
  round_off_enabled: true,
  tds_enabled: false,
  tds_rate: 0,
  tds_label: "TDS",
  amount_paid_paise: 0,
  show_bank: true,
  show_upi_qr: true,
  show_signature: true,
  template_id: "default",
  ...over,
});

const model = (over: Partial<InvoiceDocument> = {}) => {
  const d = doc(over);
  return buildPaperModel(d, calcDocument(d));
};

describe("paper model signature", () => {
  it("OFF → notice, no signatory line", () => {
    const m = model({ show_signature: false });
    expect(m.signature.enabled).toBe(false);
    expect(m.signature.notice).toBe(ELECTRONIC_DOCUMENT_NOTICE);
  });

  it("ON → signature block with the business name", () => {
    const m = model({ show_signature: true });
    expect(m.signature.enabled).toBe(true);
    expect(m.signature.forLine).toBe("For Sohan Studio");
  });

  it("old documents without the flag still render the signature block", () => {
    const m = model({ show_signature: undefined as unknown as boolean });
    expect(m.signature.enabled).toBe(true);
  });

  it("falls back to a placeholder business name", () => {
    const m = model({ seller: { business_name: null, legal_name: null } });
    expect(m.signature.forLine).toBe("For Your business name");
  });
});

describe("signature upload rules", () => {
  it("accepts PNG and JPEG only", () => {
    expect([...SIGNATURE_TYPES]).toEqual(["image/png", "image/jpeg"]);
  });

  it("shows the recommended formats", () => {
    expect(SIGNATURE_HINT).toBe("Recommended: PNG or JPEG. A transparent PNG gives the best result.");
  });

  it("returns the original file when the DOM is unavailable", async () => {
    const file = { name: "sig.png" } as unknown as File;
    await expect(removeLightBackground(file)).resolves.toBe(file);
  });
});

describe("backgroundAlpha", () => {
  it("makes near-white paper transparent and keeps ink", () => {
    expect(backgroundAlpha(255, 255, 255)).toBe(0);
    expect(backgroundAlpha(244, 244, 244)).toBe(0);
    expect(backgroundAlpha(0, 0, 0)).toBe(255);
    expect(backgroundAlpha(200, 200, 200)).toBe(255);
  });

  it("ramps smoothly between paper and ink so edges stay antialiased", () => {
    const mid = backgroundAlpha(230, 230, 230);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(255);
  });

  it("judges by luminance, so a saturated colour is ink", () => {
    expect(backgroundAlpha(255, 0, 0)).toBe(255);
  });
});
