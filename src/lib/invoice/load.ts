import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, PaymentMethod, ProfileRow } from "@/types/database";
import type { SellerSnapshot } from "./types";
import type { EmailConfig } from "./email";
import { financialYear, formatInvoiceNumber } from "./numbering";

type DB = SupabaseClient<Database>;

/** Signed URLs (1h) for the logo and signature in the private branding bucket. */
export async function brandingUrls(supabase: DB, seller: SellerSnapshot) {
  const sign = async (p: string | null | undefined) =>
    p ? ((await supabase.storage.from("branding").createSignedUrl(p, 3600)).data?.signedUrl ?? null) : null;
  const [logoUrl, signatureUrl] = await Promise.all([
    seller.show_logo === false ? null : sign(seller.logo_path),
    sign(seller.signature_path),
  ]);
  return { logoUrl, signatureUrl };
}

/** The number the next saved invoice will most likely get (the final one is assigned on save). */
export async function proposedNumber(supabase: DB, profile: ProfileRow | null, issueDate: string) {
  const fy = financialYear(issueDate);
  const [{ data: counter }, { data: last }] = await Promise.all([
    supabase.from("invoice_counters").select("last_seq").eq("financial_year", fy).maybeSingle(),
    supabase
      .from("invoices")
      .select("sequence")
      .eq("financial_year", fy)
      .not("sequence", "is", null)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const next = Math.max(counter?.last_seq ?? 0, last?.sequence ?? 0) + 1;
  return formatInvoiceNumber(profile?.invoice_prefix ?? "INV", fy, next);
}

/** Clients A→Z and the item library ordered for autocomplete (use_count, then recency). */
export async function editorLists(supabase: DB) {
  const [{ data: clients }, { data: items }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase
      .from("items")
      .select("*")
      .order("use_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(500),
  ]);
  return { clients: clients ?? [], items: items ?? [] };
}

/** The method on the most recent payment, so "Paid" defaults to what the user last used. */
export async function lastPaymentMethod(supabase: DB): Promise<PaymentMethod> {
  const { data } = await supabase.from("payments").select("method").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.method ?? "upi";
}

/** The connected Gmail address (RLS: own row only), or null. */
export async function connectedGmail(supabase: DB): Promise<string | null> {
  const { data } = await supabase.from("gmail_connections").select("email").maybeSingle();
  return data?.email ?? null;
}

export function emailConfig(user: { id: string; email: string | null }, profile: ProfileRow | null, gmailEmail: string | null): EmailConfig {
  return {
    userId: user.id,
    authuser: profile?.email ?? user.email ?? null,
    gmailEmail,
    templates: {
      subject: profile?.email_subject_template ?? null,
      body: profile?.email_body_template ?? null,
      bodyFallback: profile?.email_body_fallback_template ?? null,
    },
  };
}
