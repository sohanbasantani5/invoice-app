/** Preview-only reminder copy. No delivery occurs in this module. */
import QRCode from "qrcode";

export type ReminderDetails = {
  businessName: string;
  invoiceNumber: string;
  amountDuePaise: number;
  dueDate: string;
  upiId?: string | null;
  bankDetails?: string | null;
  reminderCount?: number;
};

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

async function generateQrCodeDataUri(upiId: string, amountPaise: number, invoiceNumber: string): Promise<string> {
  const url = buildUpiUrl(upiId, amountPaise, `Invoice ${invoiceNumber}`);
  return QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: "#1D5B47", light: "#FAF8F3" } });
}

export async function renderReminder(details: ReminderDetails) {
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(details.amountDuePaise / 100);
  const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${details.dueDate}T00:00:00Z`));
  const payment = [details.upiId && `UPI ID: ${details.upiId}`, details.bankDetails && `Bank details: ${details.bankDetails}`].filter(Boolean) as string[];
  const subject = `Reminder: invoice ${details.invoiceNumber} from ${details.businessName}`;
  const countLabel = details.reminderCount ? ` (Reminder ${details.reminderCount})` : "";
  const text = [
    "Hello", "",
    `This is a reminder${countLabel} that invoice ${details.invoiceNumber} from ${details.businessName} was due on ${date}. The amount outstanding is ${amount}.`,
    "", "If you have already paid, please disregard this message. Otherwise, please arrange payment when convenient.",
    ...(payment.length ? ["", ...payment] : []),
    "", "If you have any questions, please reply to this email.", "", "Thank you,", details.businessName,
  ].join("\n");

  const qrDataUri = details.upiId ? await generateQrCodeDataUri(details.upiId, details.amountDuePaise, details.invoiceNumber) : null;

  const qrHtml = qrDataUri
    ? `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;text-align:center"><img src="${qrDataUri}" alt="UPI QR Code for ${escapeHtml(details.invoiceNumber)}" style="max-width:280px;height:auto;border:1px solid #E1E6E2;border-radius:8px;background:#fff;padding:8px" /></p>`
    : "";

  const paragraphs = [
    "Hello",
    `This is a reminder${countLabel} that invoice <strong>${escapeHtml(details.invoiceNumber)}</strong> from ${escapeHtml(details.businessName)} was due on ${escapeHtml(date)}. The amount outstanding is <strong>${escapeHtml(amount)}</strong>.`,
    "If you have already paid, please disregard this message. Otherwise, please arrange payment when convenient.",
    ...payment.map(escapeHtml),
    qrDataUri ? "Scan the QR code to pay via UPI:" : "",
    qrHtml,
    "If you have any questions, please reply to this email.",
    `Thank you,<br>${escapeHtml(details.businessName)}`,
  ].filter(Boolean);

  const html = `<div style="background:#FAF8F3;padding:32px;font-family:Arial,sans-serif;color:#26332E"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #E1E6E2;border-radius:12px;padding:32px"><div style="color:#1D5B47;font-weight:700;font-size:18px;margin-bottom:24px">${escapeHtml(details.businessName)}</div>${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">${p}</p>`).join("")}</div></div>`;

  return { subject, text, html };
}