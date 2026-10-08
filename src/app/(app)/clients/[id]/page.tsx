import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/field";
import { EmptyState } from "@/components/shell/empty-state";
import { InvoiceList, type ListInvoice } from "../../invoices/invoice-list";
import { ClientActions } from "./client-actions";
import { formatMoney } from "@/lib/format";
import { stateLabel } from "@/lib/india/states";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Client" };
  const { supabase } = await getUser();
  const { data } = await supabase.from("clients").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Client" };
}

export default async function ClientPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const [{ data: client }, { data: rows }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, status, total_paise, tds_rate, tds_paise, amount_paid_paise, currency, buyer")
      .eq("client_id", id)
      .order("issue_date", { ascending: false }),
  ]);
  if (!client) notFound();

  const invoices: ListInvoice[] = (rows ?? []).map((r) => ({
    id: r.id,
    number: r.invoice_number,
    client: (r.buyer as { name?: string } | null)?.name || client.name,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    status: r.status,
    totalPaise: r.total_paise,
    receivedPaise: r.amount_paid_paise,
    tdsPaise: r.tds_paise,
    tdsRate: Number(r.tds_rate),
    balancePaise: r.total_paise - r.tds_paise - r.amount_paid_paise,
    currency: r.currency,
  }));
  const live = invoices.filter((i) => i.status !== "draft" && i.status !== "cancelled" && i.currency === "INR");
  const billed = live.reduce((a, i) => a + i.totalPaise, 0);
  const due = live.reduce((a, i) => a + Math.max(0, i.balancePaise), 0);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <Link href="/clients" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden /> Clients
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-display">{client.name}</h1>
          <p className="mt-1 text-ink-2">
            {[client.address_line1, client.city, client.state_code ? stateLabel(client.state_code) : client.country].filter(Boolean).join(", ") || "No address"}
          </p>
          {(client.gstin || client.pan) && (
            <p className="mt-1 font-mono text-xs text-ink-3">{[client.gstin && `GSTIN ${client.gstin}`, client.pan && `PAN ${client.pan}`].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        <div className="flex gap-2">
          <ClientActions client={client} />
          <Link href={`/invoices/new?client=${client.id}`} className={buttonVariants()}>
            <Plus aria-hidden /> New invoice
          </Link>
        </div>
      </header>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <Card className="p-4">
          <p className="text-label text-ink-3">Total billed</p>
          <p className="tnum mt-1 font-heading text-xl font-semibold">{formatMoney(billed)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-label text-ink-3">Balance due</p>
          <p className="tnum mt-1 font-heading text-xl font-semibold">{formatMoney(due)}</p>
        </Card>
      </div>
      {invoices.length ? (
        <InvoiceList invoices={invoices} />
      ) : (
        <EmptyState icon={FileText} text="No invoices for this client yet." action={<Link href={`/invoices/new?client=${client.id}`} className={buttonVariants()}>New invoice</Link>} />
      )}
    </div>
  );
}
