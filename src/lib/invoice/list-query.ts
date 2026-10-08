import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InvoiceRow, InvoiceStatus } from "@/types/database";
import type { ListFilters } from "./list-filters";

type DB = SupabaseClient<Database>;

/** Exactly the columns the list, the summary and every export read — one string, so they can't drift. */
export const LIST_COLUMNS =
  "id, invoice_number, issue_date, due_date, status, currency, doc_type, buyer, client_id, " +
  "subtotal_paise, discount_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, " +
  "round_off_paise, total_paise, tds_enabled, tds_rate, tds_label, tds_paise, amount_paid_paise";

export type ListInvoiceRow = Pick<
  InvoiceRow,
  | "id"
  | "invoice_number"
  | "issue_date"
  | "due_date"
  | "status"
  | "currency"
  | "doc_type"
  | "buyer"
  | "client_id"
  | "subtotal_paise"
  | "discount_paise"
  | "taxable_paise"
  | "cgst_paise"
  | "sgst_paise"
  | "igst_paise"
  | "round_off_paise"
  | "total_paise"
  | "tds_enabled"
  | "tds_rate"
  | "tds_label"
  | "tds_paise"
  | "amount_paid_paise"
>;

/** Rows rendered per page. Exports ignore this and read every matching row. */
export const PAGE_LIMIT = 500;
/** Supabase/PostgREST caps one response at 1000 rows, so exports page through. */
const CHUNK = 1000;
const EXPORT_MAX = 20000;

/**
 * The one query builder shared by the page and the exports, so filters can never diverge.
 * `today` is passed in (never read from the clock here) to keep "overdue" deterministic in tests.
 */
export function buildInvoiceQuery(supabase: DB, f: ListFilters, today: string) {
  let query = supabase.from("invoices").select(LIST_COLUMNS, { count: "exact" });
  if (f.q) {
    const safe = f.q.replace(/[%_*,()]/g, " ");
    query = query.or(`invoice_number.ilike.*${safe}*,buyer->>name.ilike.*${safe}*`);
  }
  // "Overdue" and "Unpaid" are derived from the stored status + due date (never stored).
  if (f.status === "overdue") query = query.in("status", ["sent", "partially_paid"]).lt("due_date", today);
  else if (f.status === "unpaid") query = query.in("status", ["sent", "partially_paid"]);
  else if (f.status) query = query.eq("status", f.status as InvoiceStatus);
  if (f.client) query = query.eq("client_id", f.client);
  if (f.from) query = query.gte("issue_date", f.from);
  if (f.to) query = query.lte("issue_date", f.to);
  // TDS states mirror lib/invoice/tds.ts: applies = tds_paise > 0; cancelled carries no live claim.
  if (f.tds === "none") query = query.or("tds_paise.lte.0,status.eq.cancelled");
  else if (f.tds === "pending") query = query.gt("tds_paise", 0).in("status", ["draft", "sent", "partially_paid"]);
  else if (f.tds === "accounted") query = query.gt("tds_paise", 0).eq("status", "paid");

  const [col, dir] = f.sort.split("_");
  return query
    .order(col === "amount" ? "total_paise" : "issue_date", { ascending: dir === "asc" })
    .order("created_at", { ascending: dir === "asc" })
    .order("id", { ascending: true });
}

/** One page of matching invoices + the exact number of matches. */
export async function fetchInvoiceList(
  supabase: DB,
  f: ListFilters,
  today: string,
  limit = PAGE_LIMIT,
): Promise<{ rows: ListInvoiceRow[]; count: number }> {
  const { data, count } = await buildInvoiceQuery(supabase, f, today).limit(limit).returns<ListInvoiceRow[]>();
  const rows = data ?? [];
  return { rows, count: count ?? rows.length };
}

/** Every matching invoice, paged past the 1000-row response cap. Used by all three exports. */
export async function fetchAllInvoiceList(supabase: DB, f: ListFilters, today: string, max = EXPORT_MAX): Promise<ListInvoiceRow[]> {
  const out: ListInvoiceRow[] = [];
  for (let from = 0; from < max; from += CHUNK) {
    const { data } = await buildInvoiceQuery(supabase, f, today).range(from, from + CHUNK - 1).returns<ListInvoiceRow[]>();
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < CHUNK) break;
  }
  return out;
}
