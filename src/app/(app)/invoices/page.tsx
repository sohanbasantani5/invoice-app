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
import { ExportMenu } from "./export-menu";
import { SummaryStrip } from "./summary-strip";
import { todayISO } from "@/lib/format";
import {
  INVOICE_SORTS,
  STATUS_FILTERS,
  TDS_FILTERS,
  filtersQuery,
  hasActiveFilters,
  parseListFilters,
  type ListFilters,
} from "@/lib/invoice/list-filters";
import { PAGE_LIMIT, fetchInvoiceList } from "@/lib/invoice/list-query";
import { invoiceSummary } from "@/lib/invoice/summary";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const filters = parseListFilters(sp);
  const query = filtersQuery(filters);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <PageHeader
        title="Invoices"
        actions={
          <>
            <ExportMenu query={query} />
            <Link href="/invoices/new" className={buttonVariants()}>
              <Plus aria-hidden /> New invoice
            </Link>
          </>
        }
      />
      <Suspense fallback={<ListBodySkeleton />}>
        <InvoicesBody supabase={supabase} filters={filters} />
      </Suspense>
    </div>
  );
}

/** Filters + summary + list. Streams in after the page header so the page paints before these queries finish. */
async function InvoicesBody({
  supabase,
  filters,
}: {
  supabase: Awaited<ReturnType<typeof getUser>>["supabase"];
  filters: ListFilters;
}) {
  const today = todayISO();
  const [{ rows, count }, { data: clients }] = await Promise.all([
    fetchInvoiceList(supabase, filters, today),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  const filtered = hasActiveFilters(filters);
  const truncated = count > rows.length;
  const invoices: ListInvoice[] = rows.map((r) => ({
    id: r.id,
    number: r.invoice_number,
    client: ((r.buyer as { name?: string } | null)?.name ?? "") || "—",
    issueDate: r.issue_date,
    dueDate: r.due_date,
    status: r.status,
    totalPaise: r.total_paise,
    receivedPaise: r.amount_paid_paise,
    tdsPaise: r.tds_paise,
    tdsRate: Number(r.tds_rate),
    currency: r.currency,
    balancePaise: r.total_paise - r.tds_paise - r.amount_paid_paise,
  }));

  if (count === 0 && !filtered) {
    return (
      <EmptyState
        icon={FileText}
        text="No invoices yet. Your first one takes about a minute."
        action={
          <Link href="/invoices/new" className={buttonVariants()}>
            <Plus aria-hidden /> Create your first invoice
          </Link>
        }
      />
    );
  }

  return (
    <>
      <form className="mb-5 flex flex-col gap-2" role="search">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.5] text-ink-3" aria-hidden />
            <Input name="q" defaultValue={filters.q} placeholder="Search number or client" aria-label="Search invoices" className="pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={buttonVariants({ variant: "secondary", className: "flex-1 sm:flex-none" })}>
              Apply
            </button>
            {filtered && (
              <Link href="/invoices" className={buttonVariants({ variant: "ghost" })}>
                Reset
              </Link>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Select name="status" defaultValue={filters.status} aria-label="Status">
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select name="client" defaultValue={filters.client} aria-label="Client">
            <option value="">All clients</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select name="tds" defaultValue={filters.tds} aria-label="TDS status">
            {TDS_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input type="date" name="from" defaultValue={filters.from} aria-label="Issued from" title="Issued from" />
          <Input type="date" name="to" defaultValue={filters.to} aria-label="Issued to" title="Issued to" />
          <Select name="sort" defaultValue={filters.sort} aria-label="Sort">
            {INVOICE_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </form>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Search}
          text="No invoices match these filters."
          action={
            <Link href="/invoices" className={buttonVariants({ variant: "secondary" })}>
              Reset filters
            </Link>
          }
        />
      ) : (
        <>
          <SummaryStrip summary={invoiceSummary(rows)} matching={count} truncated={truncated} filtered={filtered} />
          <InvoiceList invoices={invoices} />
          {truncated && (
            <p className="mt-3 text-caption">Showing the first {PAGE_LIMIT} of {count} matching invoices. Downloads include all of them.</p>
          )}
        </>
      )}
    </>
  );
}
