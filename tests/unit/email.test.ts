import { describe, expect, it } from "vitest";
import { buildEmail, gmailDraftUrls, DEFAULT_BODY, DEFAULT_BODY_FALLBACK, DEFAULT_SUBJECT, gmailUrl } from "@/lib/invoice/email";
import type { InvoiceDocument } from "@/lib/invoice/types";

const doc = (seller: Partial<InvoiceDocument["seller"]> = {}, buyer: Partial<InvoiceDocument["buyer"]> = {}, due: string | null = "2026-10-12"): InvoiceDocument =>
  ({
    invoice_number: "INV/2026-27/001",
    currency: "INR",
    due_date: due,
    seller: { business_name: "Pixel Co", legal_name: "Sample Owner", phone: "99999", upi_id: "s@upi", bank_name: "HDFC", bank_account_number: "123", ...seller },
    buyer: { name: "Acme Pvt Ltd", ...buyer },
  }) as InvoiceDocument;
const none = { subject: null, body: null, bodyFallback: null };

describe("email template", () => {
  it("attached mode: exact new default, no link, no bank/UPI/business/phone", () => {
    const e = buildEmail(none, doc(), 11800000, "attached", "https://long/signed/link");
    expect(e.subject).toBe("Invoice INV/2026-27/001 from Sample Owner");
    expect(e.body).toBe(`Hi Acme,

Hope you're doing well. Attached is invoice INV/2026-27/001 for ₹1,18,000.00, due on 12 Oct 2026.

Payment details are on the invoice. Let me know once it's done, or if you need anything changed.

Thanks,
Sample`);
    for (const s of ["https://", "HDFC", "s@upi", "Pixel", "99999"]) expect(e.body).not.toContain(s);
  });
  it("fallback mode: View invoice link line", () => {
    const e = buildEmail(none, doc(), 100, "link", "https://x/y");
    expect(e.body).toContain("Your invoice INV/2026-27/001 for ₹1.00 is ready, due on 12 Oct 2026.");
    expect(e.body).toContain("\n\nView invoice: https://x/y\n\n");
    expect(e.body.endsWith("Thanks,\nSample")).toBe(true);
  });
  it("link failed in fallback mode: the link line is dropped, nothing blank", () => {
    const e = buildEmail(none, doc(), 100, "link", "");
    expect(e.body).not.toContain("View invoice");
    expect(e.body).not.toMatch(/\n\n\n/);
  });
  it("my_name falls back to business name; first names; contact person wins", () => {
    const e = buildEmail(none, doc({ legal_name: null }, { contact_person: "Alex Sample" }), 100, "attached");
    expect(e.subject).toBe("Invoice INV/2026-27/001 from Pixel Co");
    expect(e.body.startsWith("Hi Alex,")).toBe(true);
    expect(e.body.endsWith("Thanks,\nPixel")).toBe(true);
    expect(buildEmail(none, doc({}, { name: "" }), 100, "attached").body.startsWith("Hi there,")).toBe(true);
  });
  it("no due date: sentence stays, 'due on' goes", () => {
    const e = buildEmail(none, doc({}, {}, null), 100, "attached");
    expect(e.body).toContain("invoice INV/2026-27/001 for ₹1.00.");
    expect(e.body).not.toContain("due on");
  });
  it("custom templates are used; link never appears when attached", () => {
    const t = { subject: "Bill {invoice_no}", body: "Hello {client_first_name} {link}\nBye", bodyFallback: null };
    expect(buildEmail(t, doc(), 100, "attached", "L").body).toBe("Bye");
    expect(buildEmail(t, doc(), 100, "attached").subject).toBe("Bill INV/2026-27/001");
  });
  it("templates saved with the earlier default wording are replaced by the new default", () => {
    const old = {
      subject: "Invoice {invoice_no} from {business_name}",
      body: "Hi {client_name},\r\n\r\nPlease find attached invoice {invoice_no} for {amount}{due_phrase}.\r\n\r\nView invoice: {link}\r\n\r\n{payment_details}\r\n\r\nThank you,\r\n{my_name}\r\n{business_line}",
      bodyFallback: null,
    };
    expect(buildEmail(old, doc(), 100, "attached")).toEqual(buildEmail(none, doc(), 100, "attached"));
  });
  it("exports the exact defaults the Settings reset button uses", () => {
    expect(DEFAULT_SUBJECT).toBe("Invoice {invoice_no} from {my_name}");
    expect(DEFAULT_BODY).not.toContain("{link}");
    expect(DEFAULT_BODY_FALLBACK).toContain("{link}");
  });
  it("opens a draft by MESSAGE id in the right account", () => {
    expect(gmailDraftUrls("a+b@example.com", "19abc")).toEqual({
      draft: "https://mail.google.com/mail/?authuser=a%2Bb%40example.com#drafts?compose=19abc",
      drafts: "https://mail.google.com/mail/?authuser=a%2Bb%40example.com#drafts",
    });
  });
  it("builds an encoded gmail link", () => {
    const u = gmailUrl({ authuser: "a+b@x.com", to: "", subject: "A & B", body: "x\ny" });
    expect(u).toBe("https://mail.google.com/mail/?view=cm&fs=1&authuser=a%2Bb%40x.com&to=&su=A%20%26%20B&body=x%0Ay");
  });
});
