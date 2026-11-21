import "server-only";
import nodemailer from "nodemailer";

let cached: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP credentials not configured");
  if (!cached) {
    cached = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return cached;
}

export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const from = process.env.SMTP_USER ? `"Invoices" <${process.env.SMTP_USER}>` : "Invoices";
  await getTransport().sendMail({ from, to, subject, text, html });
}
