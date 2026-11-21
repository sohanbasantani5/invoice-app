import { describe, expect, it } from "vitest";
import { renderReminder, QR_ATTACHMENT_CID } from "@/lib/email/reminder-template";

describe("reminder-template", () => {
  it("renders the UPI QR as an inline cid attachment, not a data URL", async () => {
    const result = await renderReminder({
      businessName: "Edge North Tech",
      invoiceNumber: "INV/2026-27/014",
      amountDuePaise: 490000,
      dueDate: "2026-11-10",
      upiId: "edgenorth@upi",
      bank: null,
    });

    // HTML references the cid attachment (Gmail renders cid: images, not data: URLs)
    expect(result.html).toContain(`src="cid:${QR_ATTACHMENT_CID}"`);
    expect(result.html).not.toContain("data:image/");

    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].cid).toBe(QR_ATTACHMENT_CID);
    expect(result.attachments[0].filename).toBe(`${QR_ATTACHMENT_CID}.png`);
    expect(result.attachments[0].contentDisposition).toBe("inline");
    expect(Buffer.isBuffer(result.attachments[0].content)).toBe(true);
    // PNG magic bytes
    expect(result.attachments[0].content.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });

  it("renders bank details as a labeled block", async () => {
    const result = await renderReminder({
      businessName: "Edge North Tech",
      invoiceNumber: "INV/2026-27/014",
      amountDuePaise: 490000,
      dueDate: "2026-11-10",
      upiId: null,
      bank: {
        name: "Kotak Mahindra Bank",
        holder: "Sohan Basantani",
        number: "4349888947",
        ifsc: "KKBK0001349",
      },
    });

    for (const [label, value] of [
      ["Bank Name", "Kotak Mahindra Bank"],
      ["Account Holder", "Sohan Basantani"],
      ["Account Number", "4349888947"],
      ["IFSC Code", "KKBK0001349"],
    ] as const) {
      expect(result.html).toContain(label);
      expect(result.html).toContain(value);
    }
    // Legacy unlabeled dot-separated string must be gone
    expect(result.html).not.toContain("Bank details:");
    expect(result.text).toContain("Bank Name: Kotak Mahindra Bank");
    expect(result.text).toContain("Account Number: 4349888947");
    expect(result.text).toContain("IFSC Code: KKBK0001349");
  });

  it("omits the QR attachment when there is no UPI id and skips empty bank rows", async () => {
    const noQr = await renderReminder({
      businessName: "Acme",
      invoiceNumber: "I-1",
      amountDuePaise: 100,
      dueDate: "2026-01-01",
      upiId: null,
      bank: null,
    });
    expect(noQr.html).not.toContain("cid:");
    expect(noQr.attachments).toHaveLength(0);

    const emptyBank = await renderReminder({
      businessName: "Acme",
      invoiceNumber: "I-1",
      amountDuePaise: 100,
      dueDate: "2026-01-01",
      upiId: "acme@upi",
      bank: { name: undefined, holder: undefined, number: undefined, ifsc: undefined },
    });
    expect(emptyBank.html).not.toContain("Bank Name");
  });
});
