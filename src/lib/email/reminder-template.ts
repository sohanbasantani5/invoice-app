/** Preview-only reminder copy. No delivery occurs in this module. */
import QRCode from "qrcode";

export type BankDetails = {
  name?: string;
  holder?: string;
  number?: string;
  ifsc?: string;
};

export type ReminderDetails = {
  businessName: string;
  invoiceNumber: string;
  amountDuePaise: number;
  dueDate: string;
  upiId?: string | null;
  bank?: BankDetails | null;
  reminderCount?: number;
};

export type ReminderAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
  contentDisposition: "inline";
};

/** Kept stable so the route can reference the same cid in the <img>. */
export const QR_ATTACHMENT_CID = "upi-qr";

const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, (char) => {
  const map: Record<string, string> = {
    "&": "&",
    "<": "<",
    ">": ">",
    '"': "\"",
    "'": "'",
  };
  return map[char] ?? char;
});

function buildUpiUrl(upiId: string, amountPaise: number, note: string): string {
  const params = new URLSearchParams();
  params.set("pa", upiId);
  params.set("am", (amountPaise / 100).toFixed(2));
  params.set("tn", note);
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

async function generateQrCodeBuffer(upiId: string, amountPaise: number, invoiceNumber: string): Promise<Buffer> {
  const url = buildUpiUrl(upiId, amountPaise, `Invoice ${invoiceNumber}`);
  return QRCode.toBuffer(url, {
    type: "png",
    width: 280,
    margin: 2,
    color: { dark: "#1D5B47", light: "#FAF8F3" },
  });
}

export async function renderReminder(details: ReminderDetails) {
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(details.amountDuePaise / 100);
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${details.dueDate}T00:00:00Z`));
  const subject = `Reminder: invoice ${details.invoiceNumber} from ${details.businessName}`;
  const countLabel = details.reminderCount ? ` (Reminder ${details.reminderCount})` : "";

  // ── structured payment lines (for plain-text) ────────────────────────────
  const paymentLines: string[] = [];
  if (details.upiId) paymentLines.push(`UPI ID: ${details.upiId}`);
  if (details.bank) {
    const b = details.bank;
    if (b.name) paymentLines.push(`Bank Name: ${b.name}`);
    if (b.holder) paymentLines.push(`Account Holder: ${b.holder}`);
    if (b.number) paymentLines.push(`Account Number: ${b.number}`);
    if (b.ifsc) paymentLines.push(`IFSC Code: ${b.ifsc}`);
  }

  const text = [
    "Hello", "",
    `This is a reminder${countLabel} that invoice ${details.invoiceNumber} from ${details.businessName} was due on ${date}. The amount outstanding is ${amount}.`,
    "", "If you have already paid, please disregard this message. Otherwise, please arrange payment when convenient.",
    ...(paymentLines.length ? ["", "Payment details:", ...paymentLines] : []),
    "", "If you have any questions, please reply to this email.", "", "Thank you,", details.businessName,
  ].join("\n");

  // ── UPI QR as inline cid attachment (Gmail strips data: URLs) ────────────
  let qrBuffer: Buffer | null = null;
  if (details.upiId) {
    qrBuffer = await generateQrCodeBuffer(details.upiId, details.amountDuePaise, details.invoiceNumber);
  }

  const qrHtml = qrBuffer
    ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;text-align:center"><img src="cid:${QR_ATTACHMENT_CID}" alt="UPI QR Code for ${escapeHtml(details.invoiceNumber)}" style="width:280px;max-width:100%;height:auto;border:1px solid #E1E6E2;border-radius:8px;background:#fff;padding:8px;display:inline-block" /></p>`
    : "";

  // ── labeled, aligned bank details block ───────────────────────────────────
  const bankRows: string[] = [];
  if (details.bank) {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:7px 12px;color:#6B7A73;font-size:12px;white-space:nowrap;text-transform:uppercase;letter-spacing:0.03em;border-top:1px solid #ECE9E2;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 12px;color:#26332E;font-size:14px;font-weight:600;border-top:1px solid #ECE9E2;vertical-align:top;word-break:break-word">${escapeHtml(value)}</td></tr>`;
    const b = details.bank;
    const entries: [string, string | undefined][] = [
      ["Bank Name", b.name],
      ["Account Holder", b.holder],
      ["Account Number", b.number],
      ["IFSC Code", b.ifsc],
    ];
    for (const [label, value] of entries) {
      if (value) bankRows.push(row(label, value));
    }
  }

  const bankHtml = bankRows.length
    ? `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #E1E6E2;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;background:#FCFBF8">${bankRows.join("")}</table>`
    : "";

  const esc = escapeHtml;
  const bodyParts = [
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Hello</p>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">This is a reminder${countLabel} that invoice <strong>${esc(details.invoiceNumber)}</strong> from ${esc(details.businessName)} was due on ${esc(date)}. The amount outstanding is <strong>${esc(amount)}</strong>.</p>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">If you have already paid, please disregard this message. Otherwise, please arrange payment when convenient.</p>`,
    details.upiId ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">UPI ID: <strong>${esc(details.upiId)}</strong></p>` : "",
    qrHtml,
    bankHtml,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">If you have any questions, please reply to this email.</p>`,
    `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Thank you,<br>${esc(details.businessName)}</p>`,
  ].filter(Boolean).join("");

  const html = `<div style="background:#FAF8F3;padding:32px;font-family:Arial,sans-serif;color:#26332E"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #E1E6E2;border-radius:12px;padding:24px">${bodyParts}</div></div>`;

  const attachments: ReminderAttachment[] = qrBuffer
    ? [{ filename: `${QR_ATTACHMENT_CID}.png`, content: qrBuffer, cid: QR_ATTACHMENT_CID, contentDisposition: "inline" }]
    : [];

  return { subject, text, html, attachments };
}
