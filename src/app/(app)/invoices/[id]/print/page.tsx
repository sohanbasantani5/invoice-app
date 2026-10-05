import { notFound, redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { calcDocument, rowToDocument, sellerFromProfile } from "@/lib/invoice/document";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { brandingUrls } from "@/lib/invoice/load";
import { PrintView } from "./print-view";

export const metadata = { title: "Print" };

/** Fallback PDF path: full-size paper + window.print() (03 §6). */
export default async function PrintPage({ params }: PageProps<"/invoices/[id]/print">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const [{ profile }, { data: row }, { data: lines }] = await Promise.all([
    getProfile(),
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id),
  ]);
  if (!row) notFound();
  const doc = rowToDocument(row, lines ?? []);
  doc.seller = row.status === "draft" ? sellerFromProfile(profile) : { ...sellerFromProfile(null), ...doc.seller };
  const model = buildPaperModel(doc, calcDocument(doc));
  const assets = await brandingUrls(supabase, doc.seller);
  return <PrintView model={model} assets={assets} />;
}
