"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { buyerSchema } from "@/lib/validation/invoice";
import { buyerFromForm } from "@/lib/invoice/document";
import { parseRupeesToPaise } from "@/lib/format";

export type LibResult = { ok: true; id: string } | { ok: false; error: string };

const id = z.uuid();

const clientInput = buyerSchema.extend({ notes: z.string().max(2000).default("") });
export type ClientInput = z.input<typeof clientInput>;

export async function saveClient(clientId: string | null, input: ClientInput): Promise<LibResult> {
  const parsed = clientInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!parsed.data.name.trim()) return { ok: false, error: "Client name is required." };
  if (clientId && !id.safeParse(clientId).success) return { ok: false, error: "Invalid client." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const row = { ...buyerFromForm(parsed.data), name: parsed.data.name.trim(), country: parsed.data.country.trim() || "India", notes: parsed.data.notes.trim() || null };
  const res = clientId
    ? await supabase.from("clients").update(row).eq("id", clientId).select("id").single()
    : await supabase.from("clients").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.message };
  revalidatePath("/clients", "layout");
  return { ok: true, id: res.data.id };
}

/** Invoices keep their own copy of the client, so deleting a client never changes them. */
export async function deleteClient(clientId: string): Promise<LibResult> {
  if (!id.safeParse(clientId).success) return { ok: false, error: "Invalid client." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/clients", "layout");
  return { ok: true, id: clientId };
}

const itemInput = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().max(1000).default(""),
  sac_hsn: z.string().max(10).default(""),
  unit: z.string().max(20).default("nos"),
  rate: z.string().max(20).default(""),
  gst_rate: z.coerce.number().min(0).max(100),
});
export type ItemInput = z.input<typeof itemInput>;

export async function saveItem(itemId: string | null, input: ItemInput): Promise<LibResult> {
  const parsed = itemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const rate = parsed.data.rate.trim() ? parseRupeesToPaise(parsed.data.rate) : 0;
  if (rate === null || rate < 0) return { ok: false, error: "Check the rate." };
  if (itemId && !id.safeParse(itemId).success) return { ok: false, error: "Invalid item." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const row = {
    name: parsed.data.name,
    description: parsed.data.description.trim() || null,
    sac_hsn: parsed.data.sac_hsn.trim() || null,
    unit: parsed.data.unit || "nos",
    rate_paise: rate,
    gst_rate: parsed.data.gst_rate,
  };
  const res = itemId
    ? await supabase.from("items").update(row).eq("id", itemId).select("id").single()
    : await supabase.from("items").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "You already have an item with this name." : res.error.message };
  revalidatePath("/items");
  return { ok: true, id: res.data.id };
}

export async function deleteItem(itemId: string): Promise<LibResult> {
  if (!id.safeParse(itemId).success) return { ok: false, error: "Invalid item." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/items");
  return { ok: true, id: itemId };
}

/** Command menu search: invoices by number / client, and clients by name. */
export async function commandSearch(q: string) {
  const term = String(q ?? "").trim().replace(/[%_*,()]/g, " ").slice(0, 40);
  if (!term) return [];
  const { supabase, user } = await getUser();
  if (!user) return [];
  const [{ data: inv }, { data: cl }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, buyer, status")
      .or(`invoice_number.ilike.*${term}*,buyer->>name.ilike.*${term}*`)
      .order("issue_date", { ascending: false })
      .limit(6),
    supabase.from("clients").select("id, name, city").ilike("name", `%${term}%`).limit(4),
  ]);
  return [
    ...(inv ?? []).map((i) => ({
      id: i.id,
      label: i.invoice_number,
      hint: (i.buyer as { name?: string } | null)?.name ?? "Invoice",
      href: `/invoices/${i.id}`,
      editHref: i.status === "cancelled" ? undefined : `/invoices/${i.id}/edit`,
    })),
    ...(cl ?? []).map((c) => ({ id: c.id, label: c.name, hint: c.city ?? "Client", href: `/clients/${c.id}` })),
  ];
}
