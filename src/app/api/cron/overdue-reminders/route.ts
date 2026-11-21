import { timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { renderReminder } from "@/lib/email/reminder-template";
import { createTransport } from "nodemailer";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

type Candidate = {
  id: string;
  invoice_number: string;
  total_paise: string;
  tds_paise: string;
  amount_paid_paise: string;
  due_date: string;
  show_bank: boolean;
  show_upi_qr: boolean;
  seller: Record<string, unknown>;
  email: string;
  business_name: string | null;
  auto_remind: boolean;
  last_reminder_sent_at: string | null;
  reminder_count: number;
};

const DRY_RUN = process.env.REMINDER_DRY_RUN !== "false";
const TEST_TO = process.env.REMINDER_TEST_TO;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

function getTransport() {
  if (!SMTP_USER || !SMTP_PASS) throw new Error("SMTP credentials not configured");
  return createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS } });
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  const transport = getTransport();
  await transport.sendMail({ from: `"Invoices" <${SMTP_USER}>`, to, subject, text, html });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Cron is not configured" }, { status: 503 });
  if (!same(request.headers.get("authorization") ?? "", `Bearer ${secret}`))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const testTo = new URL(request.url).searchParams.get("testTo");
  if (testTo && (!TEST_TO || testTo !== TEST_TO))
    return Response.json({ error: "Test recipient is not allowed" }, { status: 400 });

  try {
    const { rows } = await getPool().query<Candidate>(`
      select i.id, i.invoice_number, i.total_paise, i.tds_paise, i.amount_paid_paise,
             i.due_date::text, i.show_bank, i.show_upi_qr, i.seller,
             i.auto_remind, i.last_reminder_sent_at, i.reminder_count,
             c.email, p.business_name
      from public.invoices i
      join public.clients c on c.id = i.client_id and c.user_id = i.user_id
      join public.profiles p on p.user_id = i.user_id
      where i.status in ('sent', 'partially_paid')
        and i.auto_remind = true
        and i.due_date < (now() at time zone 'Asia/Kolkata')::date
        and i.currency = 'INR'
        and c.email is not null
      order by i.due_date, i.id
    `);

    const now = new Date();
    const results: { invoice_id: string; recipient: string; sent: boolean; stage: number }[] = [];

    for (const row of rows) {
      const seller = row.seller ?? {};
      const amountDue = Math.max(0, Number(row.total_paise) - Number(row.tds_paise) - Number(row.amount_paid_paise));
      if (amountDue <= 0) continue;

      const daysOverdue = Math.floor((now.getTime() - new Date(row.due_date).getTime()) / 86400000);
      const targetStages = [1, 7, 14];
      const currentStage = row.reminder_count ?? 0;
      const nextStage = targetStages[currentStage];

      if (!nextStage || daysOverdue < nextStage) continue;

      const bank = row.show_bank
        ? [seller.bank_name, seller.bank_account_name, seller.bank_account_number, seller.bank_ifsc].filter(Boolean).join(" · ")
        : null;

      const preview = await renderReminder({
        businessName: String(seller.business_name || row.business_name || "Your supplier"),
        invoiceNumber: row.invoice_number,
        amountDuePaise: amountDue,
        dueDate: row.due_date,
        upiId: row.show_upi_qr ? String(seller.upi_id || "") : null,
        bankDetails: bank || null,
        reminderCount: currentStage + 1,
      });

      let sent = false;
      if (!DRY_RUN) {
        try {
          await sendEmail(testTo ?? row.email, preview.subject, preview.text, preview.html);
          sent = true;
        } catch {
          sent = false;
        }
      }

      if (!DRY_RUN) {
        await getPool().query(
          "update public.invoices set last_reminder_sent_at = now(), reminder_count = reminder_count + 1 where id = $1",
          [row.id]
        );
      }

      results.push({ invoice_id: row.id, recipient: testTo ?? row.email, sent, stage: currentStage + 1 });
    }

    return Response.json({
      dry_run: DRY_RUN,
      sent: results.filter((r) => r.sent).length,
      updated: DRY_RUN ? 0 : results.filter((r) => r.sent).length,
      count: results.length,
      results,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("Reminder cron error:", err);
    return Response.json({ error: "Reminder cron failed" }, { status: 500 });
  }
}