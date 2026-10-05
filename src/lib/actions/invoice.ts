"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, getUser } from "@/lib/supabase/server";
import { invoiceFormSchema, paymentSchema, type InvoiceFormValues } from "@/lib/validation/invoice";
import { calcDocument, formToDocument, sellerFromProfile } from "@/lib/invoice/document";
import { financialYear, formatInvoiceNumber } from "@/lib/invoice/numbering";
import type { SellerSnapshot } from "@/lib/invoice/types";
import type { ClientRow, InvoiceItemRow, InvoiceRow, InvoiceStatus, Json } from "@/types/database";
import { parseRupeesToPaise, todayISO } from "@/lib/format";
import { lastPaymentMethod } from "@/lib/invoice/load";

export type SaveMode = "autosave" | "save" | "send";
export type SaveResult =
  | { ok: true; id: string; invoice_number: string; client_id: string | null; status: InvoiceStatus }
  | { ok: false; error: string; field?: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

const uuid = z.uuid();

function refresh() {
  revalidatePath("/invoices", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/clients", "layout");
}

export async function saveInvoice(
  input: InvoiceFormValues,
  mode: SaveMode,
  opts: { refreshSeller?: boolean } = {},
): Promise<SaveResult> {
  const { supabase, user, profile } = await getSession();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join(".") };
  }
  const v = parsed.data;
  for (const l of v.lines)
    if (l.rate.trim() !== "" && parseRupeesToPaise(l.rate) === null)
      return { ok: false, error: `Check the rate for "${l.name || "an item"}".`, field: "lines" };

  // Existing invoice: keep the stored seller snapshot once it has left draft (rule 4).
  let existing: { status: InvoiceStatus; seller: Json; amount_paid_paise: number; sequence: number | null } | null = null;
  if (v.id) {
    const { data } = await supabase
      .from("invoices")
      .select("status, seller, amount_paid_paise, sequence")
      .eq("id", v.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "This invoice no longer exists." };
    if (data.status === "cancelled") return { ok: false, error: "Cancelled invoices are read-only. Change the status to reopen it." };
    existing = data;
  }
  const seller: SellerSnapshot =
    existing && existing.status !== "draft" && !opts.refreshSeller
      ? (existing.seller as SellerSnapshot)
      : sellerFromProfile(profile);

  // Client: create or update the saved client when "Save client for next time" is on.
  let clientId = v.client_id;
  const buyerName = v.buyer.name.trim();
  if (v.save_client && buyerName && mode !== "autosave") {
    const doc0 = formToDocument(v, seller);
    const clientRow: Partial<ClientRow> = {
      ...doc0.buyer,
      name: buyerName,
      country: doc0.buyer.country ?? "India",
    };
    if (clientId) {
      await supabase.from("clients").update(clientRow).eq("id", clientId);
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...clientRow, name: buyerName })
        .select("id")
        .single();
      if (error) return { ok: false, error: "Couldn't save the client. " + error.message };
      clientId = data.id;
    }
  }

  // Number: assign the next one for this financial year unless the user typed their own.
  const fy = financialYear(v.issue_date);
  let invoiceNumber = v.invoice_number;
  let sequence: number | null = existing?.sequence ?? null;
  if (!v.id && (v.auto_number || !invoiceNumber)) {
    const { data: seq, error } = await supabase.rpc("next_invoice_number", { p_fy: fy });
    if (error || seq == null) return { ok: false, error: "Couldn't assign an invoice number. " + (error?.message ?? "") };
    sequence = seq;
    invoiceNumber = formatInvoiceNumber(profile?.invoice_prefix ?? "INV", fy, seq);
  }
  if (!invoiceNumber) return { ok: false, error: "Invoice number is required.", field: "invoice_number" };

  const doc = formToDocument({ ...v, invoice_number: invoiceNumber }, seller, {
    amountPaidPaise: existing?.amount_paid_paise ?? 0,
  });
  const calc = calcDocument(doc); // never trust client totals

  const invoice = {
    id: v.id,
    client_id: clientId,
    doc_type: doc.doc_type,
    invoice_number: invoiceNumber,
    financial_year: fy,
    sequence,
    status: existing?.status ?? "draft",
    issue_date: doc.issue_date,
    due_date: doc.due_date,
    place_of_supply_code: doc.place_of_supply_code,
    reverse_charge: doc.doc_type === "tax_invoice" ? doc.reverse_charge : false,
    currency: doc.currency,
    reference: doc.reference,
    seller,
    buyer: doc.buyer,
    ship_to: doc.ship_to,
    round_off_enabled: doc.round_off_enabled,
    tds_enabled: doc.tds_enabled,
    tds_rate: doc.tds_rate,
    tds_label: doc.tds_label,
    subtotal_paise: calc.subtotal,
    discount_paise: calc.discount,
    taxable_paise: calc.taxable,
    cgst_paise: calc.cgst,
    sgst_paise: calc.sgst,
    igst_paise: calc.igst,
    round_off_paise: calc.roundOff,
    total_paise: calc.total,
    tds_paise: calc.tds,
    notes: doc.notes,
    terms: doc.terms,
    show_bank: doc.show_bank,
    show_upi_qr: doc.show_upi_qr,
    show_signature: doc.show_signature,
  };
  const items = doc.lines
    .map((l, i) => ({ l, c: calc.lines[i], i }))
    .filter(({ l }) => l.name.trim() !== "")
    .map(({ l, c, i }) => ({
      position: i,
      name: l.name.trim(),
      description: l.description,
      sac_hsn: l.sac_hsn,
      unit: l.unit,
      quantity: l.quantity,
      rate_paise: l.rate_paise,
      discount_paise: c.discount,
      gst_rate: c.gstRate,
      taxable_paise: c.taxable,
      tax_paise: c.tax,
      amount_paise: c.amount,
    }));

  const { data: id, error } = await supabase.rpc("save_invoice", {
    p_invoice: invoice as unknown as Json,
    p_items: items as unknown as Json,
  });
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: `Invoice number ${invoiceNumber} is already used. Pick another.`, field: "invoice_number" };
    return { ok: false, error: "Couldn't save. " + error.message };
  }

  let status = invoice.status;
  if (mode === "send" && status === "draft") {
    await supabase.from("invoices").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    status = "sent";
  }
  if (mode !== "autosave" && items.length) {
    await supabase.rpc("record_items", {
      p_items: items.map((i) => ({
        name: i.name,
        description: i.description,
        sac_hsn: i.sac_hsn,
        unit: i.unit,
        rate_paise: i.rate_paise,
        gst_rate: i.gst_rate,
      })) as unknown as Json,
    });
  }
  if (mode !== "autosave") refresh();
  return { ok: true, id, invoice_number: invoiceNumber, client_id: clientId, status };
}

export type StatusResult =
  | { ok: true; status: InvoiceStatus; amountPaidPaise: number }
  | { ok: false; error: string };

const statusChangeSchema = z.object({
  id: z.uuid(),
  to: z.enum(["draft", "sent", "paid", "partially_paid", "cancelled"]),
  /** Rupees typed by the user — needed for partially_paid; optional override for paid. */
  amount: z.string().max(20).optional(),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(["upi", "bank_transfer", "cash", "cheque", "other"]).optional(),
  reference: z.string().max(100).optional(),
});

/**
 * Any status → any status, in one call (01 §6). Paid records a full payment, Partially paid records
 * the amount typed, and moving back to Draft/Sent removes recorded payments (the UI confirms first).
 */
export async function changeStatus(input: z.input<typeof statusChangeSchema>): Promise<StatusResult> {
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const v = parsed.data;
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: inv } = await supabase
    .from("invoices")
    .select("status, total_paise, tds_paise, amount_paid_paise, sent_at")
    .eq("id", v.id)
    .maybeSingle();
  if (!inv) return { ok: false, error: "This invoice no longer exists." };

  const payable = inv.total_paise - inv.tds_paise;
  const fail = (error: string): StatusResult => ({ ok: false, error });
  const now = new Date().toISOString();

  if (v.to === "draft" || v.to === "sent") {
    if (inv.amount_paid_paise > 0) {
      const { error } = await supabase.from("payments").delete().eq("invoice_id", v.id);
      if (error) return fail(error.message);
    }
    const patch =
      v.to === "draft"
        ? { status: "draft" as const, sent_at: null, paid_at: null }
        : { status: "sent" as const, sent_at: inv.sent_at ?? now, paid_at: null };
    const { error } = await supabase.from("invoices").update(patch).eq("id", v.id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true, status: v.to, amountPaidPaise: 0 };
  }

  if (v.to === "cancelled") {
    const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", v.id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true, status: "cancelled", amountPaidPaise: inv.amount_paid_paise };
  }

  // paid / partially_paid
  let amount: number;
  if (v.to === "paid") {
    if (inv.status === "paid") return { ok: true, status: "paid", amountPaidPaise: inv.amount_paid_paise };
    amount = v.amount ? (parseRupeesToPaise(v.amount) ?? NaN) : payable - inv.amount_paid_paise;
  } else {
    amount = parseRupeesToPaise(v.amount ?? "") ?? NaN;
    if (!(amount > 0)) return fail("Enter the amount received.");
    // From Paid, "partially paid" restarts the payment record with the amount typed.
    if (inv.status === "paid") {
      const { error } = await supabase.from("payments").delete().eq("invoice_id", v.id);
      if (error) return fail(error.message);
    }
  }
  if (Number.isNaN(amount)) return fail("Check the amount.");

  // A draft or cancelled invoice that gets paid has to be a sent one first.
  const { error: e1 } = await supabase
    .from("invoices")
    .update({ status: inv.status === "partially_paid" ? "partially_paid" : "sent", sent_at: inv.sent_at ?? now })
    .eq("id", v.id);
  if (e1) return fail(e1.message);

  if (amount > 0) {
    const { error } = await supabase.from("payments").insert({
      invoice_id: v.id,
      amount_paise: amount,
      paid_on: v.paid_on || todayISO(),
      method: v.method ?? (await lastPaymentMethod(supabase)),
      reference: v.reference?.trim() || null,
    });
    if (error) return fail(error.message);
  } else {
    // Nothing left to pay (zero-value or already covered): just mark it paid.
    await supabase.from("invoices").update({ status: "paid", paid_at: now }).eq("id", v.id);
  }

  const { data: after } = await supabase.from("invoices").select("status, amount_paid_paise").eq("id", v.id).single();
  refresh();
  return { ok: true, status: after?.status ?? v.to, amountPaidPaise: after?.amount_paid_paise ?? amount };
}

/** What Undo needs to put a deleted draft back exactly as it was. */
export type DraftSnapshot = { invoice: InvoiceRow; items: InvoiceItemRow[] };
export type DeleteResult = { ok: true; deleted: number; snapshots: DraftSnapshot[] } | { ok: false; error: string };

const idList = z.array(z.uuid()).min(1).max(200);

/** Best-effort: the PDFs saved for email links go with the invoice. */
async function removePdfs(supabase: Awaited<ReturnType<typeof getUser>>["supabase"], userId: string, ids: string[]) {
  await supabase.storage.from("invoice-pdfs").remove(ids.map((id) => `${userId}/${id}.pdf`));
}

/**
 * Drafts: deleted straight away, and the full copy is handed back so the toast's Undo (8 s) can restore it.
 * After the window nothing is kept anywhere. Row Level Security limits this to the user's own invoices.
 */
export async function deleteDrafts(input: string[]): Promise<DeleteResult> {
  const ids = idList.safeParse(input);
  if (!ids.success) return { ok: false, error: "Invalid invoice." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const [{ data: rows }, { data: items }] = await Promise.all([
    supabase.from("invoices").select("*").in("id", ids.data),
    supabase.from("invoice_items").select("*").in("invoice_id", ids.data),
  ]);
  if (!rows || rows.length !== ids.data.length) return { ok: false, error: "Some of these invoices no longer exist." };
  if (rows.some((r) => r.status !== "draft")) return { ok: false, error: "Only drafts can be deleted without typing a confirmation." };

  const { error, count } = await supabase.from("invoices").delete({ count: "exact" }).in("id", ids.data).eq("status", "draft");
  if (error) return { ok: false, error: error.message };
  await removePdfs(supabase, user.id, ids.data);
  refresh();
  return {
    ok: true,
    deleted: count ?? rows.length,
    snapshots: rows.map((invoice) => ({ invoice, items: (items ?? []).filter((i) => i.invoice_id === invoice.id) })),
  };
}

/** Undo for deleteDrafts: same id, number and lines. */
export async function restoreDrafts(input: DraftSnapshot[]): Promise<SimpleResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!Array.isArray(input) || input.length === 0 || input.length > 200) return { ok: false, error: "Nothing to restore." };
  for (const s of input) {
    const { created_at: _c, updated_at: _u, ...inv } = s.invoice;
    void _c;
    void _u;
    if (inv.status !== "draft") return { ok: false, error: "Only drafts can be restored." };
    const { error } = await supabase.from("invoices").insert({ ...inv, user_id: user.id });
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? `Invoice number ${inv.invoice_number} is already used by another invoice.` : "Couldn't restore. " + error.message,
      };
    }
    if (s.items.length) {
      const { error: e2 } = await supabase.from("invoice_items").insert(s.items.map((i) => ({ ...i, user_id: user.id, invoice_id: inv.id })));
      if (e2) return { ok: false, error: "Restored the invoice but not all its lines. " + e2.message };
    }
  }
  refresh();
  return { ok: true };
}

/**
 * Any status, including Sent / Paid / Cancelled: permanent, and it removes the payments and stored PDFs.
 * The server checks the typed confirmation itself (the invoice number for one invoice, DELETE for several).
 */
export async function deleteInvoices(input: string[], confirmText: string): Promise<DeleteResult> {
  const ids = idList.safeParse(input);
  if (!ids.success) return { ok: false, error: "Invalid invoice." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: rows } = await supabase.from("invoices").select("id, invoice_number").in("id", ids.data);
  if (!rows || rows.length !== ids.data.length) return { ok: false, error: "Some of these invoices no longer exist." };
  const expected = rows.length === 1 ? rows[0].invoice_number : "DELETE";
  if ((confirmText ?? "").trim() !== expected) return { ok: false, error: `Type ${expected} to confirm.` };

  // invoice_items and payments go with the invoice (ON DELETE CASCADE).
  const { error, count } = await supabase.from("invoices").delete({ count: "exact" }).in("id", ids.data);
  if (error) return { ok: false, error: error.message };
  await removePdfs(supabase, user.id, ids.data);
  refresh();
  return { ok: true, deleted: count ?? rows.length, snapshots: [] };
}

export async function addPayment(input: z.input<typeof paymentSchema>): Promise<SimpleResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const amount = parseRupeesToPaise(parsed.data.amount);
  if (!amount || amount <= 0) return { ok: false, error: "Enter an amount above zero." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase.from("payments").insert({
    invoice_id: parsed.data.invoice_id,
    amount_paise: amount,
    paid_on: parsed.data.paid_on || todayISO(),
    method: parsed.data.method,
    reference: parsed.data.reference.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deletePayment(id: string): Promise<SimpleResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Invalid payment." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
