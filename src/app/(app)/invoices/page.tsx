import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ListBodySkeleton } from "@/components/shell/skeletons";
import { EmptyState } from "@/components/shell/empty-state";
import { InvoiceList, type ListInvoice } from "./invoice-list";
import { todayISO } from "@/lib/format";

export const metadata = { title: "Invoices" };

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "partially_paid", label: "Part paid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];
const SORTS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Amount: high to low" },
  { value: "amount_asc", label: "Amount: low to high" },
];

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const isoDate = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <PageHeader
        title="Invoices"
        actions={
          <>
            <a href="/api/export?format=csv" className={buttonVariants({ variant: "secondary" })}>
              Export CSV
            </a>
            <Link href="/invoices/new" className={buttonVariants()}>
              <Plus aria-hidden /> New invoice
            </Link>
          </>
        }
      />
      <Suspense fallback={<ListBodySkeleton />}>
        <InvoicesBody supabase={supabase} sp={sp} />
      </Suspense>
    </div>
  );
}

/** Filters + list. Streams in after the page header so the page paints before these queries finish. */
async function InvoicesBody({ supabase, sp }: { supabase: Awaited<ReturnType<typeof getUser>>["supabase"]; sp: Record<string, string | string[] | undefined> }) {
  const q = str(sp.q).trim().slice(0, 60);
  const status = str(sp.status);
  const client = str(sp.client);
  const from = isoDate(str(sp.from));
  const to = isoDate(str(sp.to));
  const sort = SORTS.some((s) => s.value === str(sp.sort)) ? str(sp.sort) : "date_desc";
  const today = todayISO();

  let query = supabase
    .from("invoices")
    .select("id, invoice_number, issue_date, due_date, status, total_paise, tds_paise, amount_paid_paise, currency, buyer, client_id, doc_type")
    .limit(500);
  if (q) {
    const safe = q.replace(/[%_*,()]/g, " ");
    query = query.or(`invoice_number.ilike.*${safe}*,buyer->>name.ilike.*${safe}*`);
  }
  if (status === "overdue") query = query.in("status", ["sent", "partially_paid"]).lt("due_date", today);
  else if (status) query = query.eq("status", status as "draft");
  if (client && /^[0-9a-f-]{36}$/i.test(client)) query = query.eq("client_id", client);
  if (from) query = query.gte("issue_date", from);
  if (to) query = query.lte("issue_date", to);
  const [col, dir] = sort.split("_");
  query = query
    .order(col === "amount" ? "total_paise" : "issue_date", { ascending: dir === "asc" })
    .order("created_at", { ascending: dir === "asc" });

  const [{ data: rows }, { data: clients }, { count }] = await Promise.all([
    query,
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("invoices").select("id", { count: "exact", head: true }),
  ]);
  const invoices: ListInvoice[] = (rows ?? []).map((r) => ({
    id: r.id,
    number: r.invoice_number,
    client: ((r.buyer as { name?: string } | null)?.name ?? "") || "—",
    issueDate: r.issue_date,
    dueDate: r.due_date,
    status: r.status,
    totalPaise: r.total_paise,
    balancePaise: r.total_paise - r.tds_paise - r.amount_paid_paise,
    currency: r.currency,
  }));
  const filtered = !!(q || status || client || from || to);

  return (
    <>

      {count === 0 ? (
        <EmptyState
          icon={FileText}
          text="No invoices yet. Your first one takes about a minute."
          action={
            <Link href="/invoices/new" className={buttonVariants()}>
              <Plus aria-hidden /> Create your first invoice
            </Link>
          }
        />
      ) : (
        <>
          <form className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-[minmax(200px,2fr)_1fr_1fr_auto_auto_1fr_auto]" role="search">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.5] text-ink-3" aria-hidden />
              <Input name="q" defaultValue={q} placeholder="Search number or client" aria-label="Search invoices" className="pl-9" />
            </div>
            <Select name="status" defaultValue={status} aria-label="Status">
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select name="client" defaultValue={client} aria-label="Client">
              <option value="">All clients</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input type="date" name="from" defaultValue={from} aria-label="From date" />
            <Input type="date" name="to" defaultValue={to} aria-label="To date" />
            <Select name="sort" defaultValue={sort} aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <div className="col-span-2 flex gap-2 md:col-span-1">
              <button type="submit" className={buttonVariants({ variant: "secondary", className: "flex-1" })}>
                Apply
              </button>
              {filtered && (
                <Link href="/invoices" className={buttonVariants({ variant: "ghost" })}>
                  Clear
                </Link>
              )}
            </div>
          </form>
          {invoices.length === 0 ? (
            <EmptyState icon={Search} text="No invoices match these filters." action={<Link href="/invoices" className={buttonVariants({ variant: "secondary" })}>Clear filters</Link>} />
          ) : (
            <InvoiceList invoices={invoices} />
          )}
        </>
      )}
    </>
  );
}
