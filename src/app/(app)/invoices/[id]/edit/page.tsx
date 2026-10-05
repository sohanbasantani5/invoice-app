import { notFound, redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { InvoiceEditor } from "@/components/invoice/editor/invoice-editor";
import { brandingUrls, connectedGmail, editorLists, emailConfig } from "@/lib/invoice/load";
import { documentToForm, rowToDocument, sellerFromProfile } from "@/lib/invoice/document";
import { DEFAULT_SERVICE_GST_RATE } from "@/lib/india/gst-rates";
import type { SellerSnapshot } from "@/lib/invoice/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ profile }, gmailEmail, { data: row }, { data: lines }, lists] = await Promise.all([
    getProfile(),
    connectedGmail(supabase),
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id),
    editorLists(supabase),
  ]);
  if (!row) notFound();
  if (row.status === "cancelled") redirect(`/invoices/${id}`); // read-only

  // Drafts follow the current profile; anything sent keeps its saved snapshot (rule 4).
  const profileSeller = sellerFromProfile(profile);
  const seller: SellerSnapshot =
    row.status === "draft" ? profileSeller : { ...sellerFromProfile(null), ...(row.seller as SellerSnapshot) };
  const doc = rowToDocument(row, lines ?? []);
  const assets = await brandingUrls(supabase, seller);

  return (
    <InvoiceEditor
      key={row.id + row.updated_at}
      initial={documentToForm(doc, row.client_id)}
      seller={seller}
      profileSeller={profileSeller}
      status={row.status}
      amountPaidPaise={row.amount_paid_paise}
      clients={lists.clients}
      items={lists.items}
      assets={assets}
      defaultGst={DEFAULT_SERVICE_GST_RATE}
      email={emailConfig(user, profile, gmailEmail)}
    />
  );
}
