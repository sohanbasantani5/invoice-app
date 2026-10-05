import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus, UserPlus } from "lucide-react";
import { getProfile, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DashboardSkeleton } from "@/components/shell/skeletons";
import { EmptyState } from "@/components/shell/empty-state";
import { StatusPill } from "@/components/invoice/status-pill";
import { MonthlyChart } from "./monthly-chart";
import { financialYear, financialYearRange } from "@/lib/invoice/numbering";
import { isOverdue } from "@/lib/invoice/overdue";
import { formatDate, formatMoney, todayISO } from "@/lib/format";

export const metadata = { title: "Dashboard" };

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 md:p-5">
      <p className="text-label text-ink-3">{label}</p>
      <p className={`tnum mt-2 font-heading text-[1.5rem] leading-tight font-semibold ${tone === "danger" ? "text-danger" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-caption">{hint}</p>}
    </div>
  );
}

/** The numbers, chart and recent invoices. Streams in after the header so the page paints without waiting for these queries. */
async function DashboardData({ supabase, today }: { supabase: Awaited<ReturnType<typeof getUser>>["supabase"]; today: string }) {
  const fy = financialYear(today);
  const { start, end } = financialYearRange(today);

  const [{ data: fyInvoices }, { data: open }, { data: payments }, { data: recent }] = await Promise.all([
    supabase
      .from("invoices")
      .select("issue_date, total_paise, status, currency")
      .gte("issue_date", start)
      .lte("issue_date", end)
      .not("status", "in", "(draft,cancelled)"),
    supabase.from("invoices").select("total_paise, tds_paise, amount_paid_paise, due_date, status").in("status", ["sent", "partially_paid"]),
    supabase.from("payments").select("amount_paise").gte("paid_on", start).lte("paid_on", end),
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, status, total_paise, currency, buyer")
      .order("issue_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const inr = (fyInvoices ?? []).filter((i) => i.currency === "INR");
  const invoiced = inr.reduce((a, i) => a + i.total_paise, 0);
  const received = (payments ?? []).reduce((a, p) => a + p.amount_paise, 0);
  const balance = (i: { total_paise: number; tds_paise: number; amount_paid_paise: number }) => Math.max(0, i.total_paise - i.tds_paise - i.amount_paid_paise);
  const outstanding = (open ?? []).reduce((a, i) => a + balance(i), 0);
  const overdue = (open ?? []).filter((i) => isOverdue(i.status, i.due_date, today));
  const overdueAmount = overdue.reduce((a, i) => a + balance(i), 0);

  const months = MONTHS.map((label) => ({ label, paise: 0 }));
  for (const i of inr) {
    const m = Number(i.issue_date.slice(5, 7));
    months[(m + 8) % 12].paise += i.total_paise;
  }

  const hasAny = (recent ?? []).length > 0;

  return !hasAny ? (
        <EmptyState
          icon={FileText}
          text="Nothing billed yet. Create your first invoice and it will show up here."
          action={
            <Link href="/invoices/new" className={buttonVariants()}>
              <Plus aria-hidden /> New invoice
            </Link>
          }
        />
  ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="This financial year" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Invoiced this FY" value={formatMoney(invoiced)} hint={`${inr.length} invoice${inr.length === 1 ? "" : "s"}`} />
            <Stat label="Received" value={formatMoney(received)} />
            <Stat label="Outstanding" value={formatMoney(outstanding)} hint={`${(open ?? []).length} open`} />
            <Stat
              label="Overdue"
              value={formatMoney(overdueAmount)}
              hint={overdue.length ? `${overdue.length} invoice${overdue.length === 1 ? "" : "s"} past due` : "Nothing overdue"}
              tone={overdue.length ? "danger" : undefined}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            <section className="rounded-xl border border-border bg-surface p-4 md:p-5">
              <h2 className="text-h3">Billed per month</h2>
              <p className="text-caption">April {fy.slice(0, 4)} – March 20{fy.slice(5, 7)}</p>
              <MonthlyChart months={months} />
            </section>

            <section className="rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5">
                <h2 className="text-h3">Recent invoices</h2>
                <Link href="/invoices" className="text-sm text-accent hover:underline">
                  View all
                </Link>
              </div>
              <ul>
                {(recent ?? []).map((r) => (
                  <li key={r.id} className="border-t border-border first:border-t-0">
                    <Link href={`/invoices/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 md:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{(r.buyer as { name?: string } | null)?.name || "—"}</p>
                        <p className="truncate font-mono text-xs text-ink-3">
                          {r.invoice_number} · {formatDate(r.issue_date)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="tnum text-sm">{formatMoney(r.total_paise, r.currency)}</span>
                        <StatusPill status={r.status} dueDate={r.due_date} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const today = todayISO();
  const { profile } = await getProfile(); // already fetched by the layout
  const name = profile?.business_name || profile?.legal_name || "";

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <PageHeader
        title={name ? `Hello, ${name.split(" ")[0]}` : "Dashboard"}
        description={`Financial year ${financialYear(today)}`}
        actions={
          <>
            <Link href="/clients?new=1" className={buttonVariants({ variant: "secondary" })}>
              <UserPlus aria-hidden /> Add client
            </Link>
            <Link href="/invoices/new" className={buttonVariants()}>
              <Plus aria-hidden /> New invoice
            </Link>
          </>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData supabase={supabase} today={today} />
      </Suspense>
    </div>
  );
}
