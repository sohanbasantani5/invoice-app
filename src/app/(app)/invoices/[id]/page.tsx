import { notFound, redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { InvoiceView } from "@/components/invoice/invoice-view";
import { PaymentsPanel } from "@/components/invoice/payments-panel";
import { brandingUrls, connectedGmail, emailConfig, lastPaymentMethod } from "@/lib/invoice/load";
import { rowToDocument, sellerFromProfile } from "@/lib/invoice/document";
import type { SellerSnapshot } from "@/lib/invoice/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Invoice" };
  const { supabase } = await getUser();
  const { data } = await supabase.from("invoices").select("invoice_number").eq("id", id).maybeSingle();
  return { title: data?.invoice_number ?? "Invoice" };
}

export default async function InvoicePage({ params }: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ profile }, gmailEmail, { data: row }, { data: lines }, { data: payments }, lastMethod] = await Promise.all([
    getProfile(),
    connectedGmail(supabase),
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id),
    supabase.from("payments").select("*").eq("invoice_id", id).order("paid_on"),
    lastPaymentMethod(supabase),
  ]);
  if (!row) notFound();

  // Drafts follow the current profile; anything sent keeps its saved snapshot (rule 4).
  const seller: SellerSnapshot =
    row.status === "draft" ? sellerFromProfile(profile) : { ...sellerFromProfile(null), ...(row.seller as SellerSnapshot) };
  const doc = { ...rowToDocument(row, lines ?? []), seller };
  const assets = await brandingUrls(supabase, seller);

  return (
    <InvoiceView
      key={`${row.id}${row.updated_at}${row.amount_paid_paise}`}
      doc={doc}
      invoiceId={row.id}
      email={emailConfig(user, profile, gmailEmail)}
      assets={assets}
      lastMethod={lastMethod}
    >
      {row.status !== "draft" && (
        <PaymentsPanel
          invoiceId={row.id}
          payments={payments ?? []}
          payablePaise={row.total_paise - row.tds_paise}
          paidPaise={row.amount_paid_paise}
          status={row.status}
        />
      )}
    </InvoiceView>
  );
}
