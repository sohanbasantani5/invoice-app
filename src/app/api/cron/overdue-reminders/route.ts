import { timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db/pool";
import { renderReminder, type ReminderAttachment } from "@/lib/email/reminder-template";
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

async function sendEmail(to: string, subject: string, text: string, html: string, attachments: ReminderAttachment[] = []) {
  const transport = getTransport();
  await transport.sendMail({ from: `"Invoices" <${SMTP_USER}>`, to, subject, text, html, attachments });
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
    const pool = getPool();
    const { rows } = await pool.query<Candidate>(`
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

    // If nothing is overdue right now, still let ?testTo=... verify the full
    // SMTP + UPI QR pipeline by building a realistic preview from a
    // representative sent/partially-paid invoice for that user.
    let source = rows.map((r) => ({ ...r }));
    if (testTo && source.length === 0) {
      const { rows: sampleRows } = await pool.query<Candidate>(
        `
        select i.id, i.invoice_number, i.total_paise, i.tds_paise, i.amount_paid_paise,
               i.due_date::text, i.show_bank, i.show_upi_qr, i.seller,
               i.auto_remind, i.last_reminder_sent_at, i.reminder_count,
               p.email, p.business_name
        from public.invoices i
        join public.profiles p on p.user_id = i.user_id and p.email = $1
        where i.status in ('sent', 'partially_paid')
        order by i.due_date, i.id
        limit 1
        `,
        [testTo]
      );
      source = sampleRows.map((r) => ({ ...r, isSample: true }));
    }

    // Diagnostic: overdue auto-remind invoices that cannot be emailed because the
    // client record has no address. They never enter the loop above (which
    // filters `c.email is not null`), so surface them so operators notice them
    // instead of silently skipping.
    const { rows: missingRows } = await pool.query<{ invoice_number: string; client_name: string | null }>(
      `
      select i.invoice_number, c.name as client_name
      from public.invoices i
      join public.clients c on c.id = i.client_id and c.user_id = i.user_id
      where i.status in ('sent', 'partially_paid')
        and i.auto_remind = true
        and i.due_date < (now() at time zone 'Asia/Kolkata')::date
        and i.currency = 'INR'
        and c.email is null
      order by i.due_date, i.id
      `
    );
    const skippedMissingEmail = missingRows.map((r) => ({ invoice_number: r.invoice_number, client_name: r.client_name }));

    const now = new Date();
    const results: { invoice_id: string; recipient: string; sent: boolean; stage: number }[] = [];

    for (const raw of source) {
      const row = raw as Candidate & { isSample?: boolean };
      const seller = row.seller ?? {};
      const amountDue = Math.max(0, Number(row.total_paise) - Number(row.tds_paise) - Number(row.amount_paid_paise));
      if (amountDue <= 0) continue;

      const daysOverdue = Math.floor((now.getTime() - new Date(row.due_date).getTime()) / 86400000);

      // Cadence is THRESHOLD-based, not modulo. targetStages[n] is the earliest
      // days-overdue point at which reminder n+1 goes out:
      //   reminder_count 0 -> stage 1  (sends the day after the due date)
      //   reminder_count 1 -> stage 7
      //   reminder_count 2 -> stage 14
      // Because each stage is a ">= X days overdue" floor, a reminder that was
      // missed (e.g. cron down, or a client had no email at the time) fires on
      // the very next run once the threshold is reached — it never waits for an
      // exact multiple of 7 days. An invoice >=7 days overdue with
      // reminder_count 0 is therefore still sent immediately on the next run.
      const targetStages = [1, 7, 14];
      const currentStage = row.reminder_count ?? 0;
      const nextStage = targetStages[currentStage];

      if (!row.isSample && (!nextStage || daysOverdue < nextStage)) continue;

      const bank = row.show_bank
        ? {
            name: typeof seller.bank_name === "string" ? seller.bank_name : undefined,
            holder: typeof seller.bank_account_name === "string" ? seller.bank_account_name : undefined,
            number: typeof seller.bank_account_number === "string" ? seller.bank_account_number : undefined,
            ifsc: typeof seller.bank_ifsc === "string" ? seller.bank_ifsc : undefined,
          }
        : null;

      const preview = await renderReminder({
        businessName: String(seller.business_name || row.business_name || "Your supplier"),
        invoiceNumber: row.invoice_number,
        amountDuePaise: amountDue,
        dueDate: row.due_date,
        upiId: row.show_upi_qr ? String(seller.upi_id || "") : null,
        bank,
        reminderCount: currentStage + 1,
      });

      let sent = false;
      if (!DRY_RUN) {
        try {
          // Recipient override only applies when ?testTo= was explicitly passed;
          // normal scheduled runs (no query param) send to the client's email.
          await sendEmail(testTo ?? row.email, preview.subject, preview.text, preview.html, preview.attachments);
          sent = true;
        } catch {
          sent = false;
        }
      }

      // Persist the "last reminded" state only for real invoices, never for
      // sample rows from a ?testTo= smoke test (isSample). Otherwise a manual
      // test run would fake a real reminder: bump reminder_count and set
      // last_reminder_sent_at on production rows that were never actually
      // reminded, which desynchronizes the cadence for real clients.
      if (!DRY_RUN && !row.isSample) {
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
      skipped_missing_email: skippedMissingEmail,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Reminder cron error:", err);
    return Response.json({ error: message }, { status: 500 });
  }
}