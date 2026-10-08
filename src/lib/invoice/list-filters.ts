// Invoice list filters — one source of truth for the page form, the summary, and every export.
// Values live in the URL, so a filtered view (and its exports) can be bookmarked and shared.

export const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "unpaid", label: "Unpaid (outstanding)" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const TDS_FILTERS = [
  { value: "", label: "All TDS" },
  { value: "none", label: "No TDS" },
  { value: "pending", label: "TDS pending" },
  { value: "accounted", label: "TDS accounted" },
] as const;

export const INVOICE_SORTS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "amount_desc", label: "Amount: high to low" },
  { value: "amount_asc", label: "Amount: low to high" },
] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];
export type TdsFilter = (typeof TDS_FILTERS)[number]["value"];
export type SortKey = (typeof INVOICE_SORTS)[number]["value"];

export type ListFilters = {
  q: string;
  status: StatusFilter;
  client: string;
  from: string;
  to: string;
  tds: TdsFilter;
  sort: SortKey;
};

export const DEFAULT_SORT: SortKey = "date_desc";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const oneOf = <T extends string>(v: string, allowed: readonly { value: T }[], fallback: T): T =>
  allowed.some((a) => a.value === v) ? (v as T) : fallback;

export function parseListFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const from = str(sp.from);
  const to = str(sp.to);
  return {
    q: str(sp.q).trim().slice(0, 60),
    status: oneOf(str(sp.status), STATUS_FILTERS, ""),
    client: UUID.test(str(sp.client)) ? str(sp.client) : "",
    from: ISO_DATE.test(from) ? from : "",
    to: ISO_DATE.test(to) ? to : "",
    tds: oneOf(str(sp.tds), TDS_FILTERS, ""),
    sort: oneOf(str(sp.sort), INVOICE_SORTS, DEFAULT_SORT),
  };
}

export function hasActiveFilters(f: ListFilters): boolean {
  return !!(f.q || f.status || f.client || f.from || f.to || f.tds);
}

/** Query string for export links. Empties and the default sort are left out. */
export function filtersQuery(f: ListFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.status) p.set("status", f.status);
  if (f.client) p.set("client", f.client);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.tds) p.set("tds", f.tds);
  if (f.sort !== DEFAULT_SORT) p.set("sort", f.sort);
  return p.toString();
}

/** The active filters in words, for the PDF report and the export header. */
export function describeFilters(f: ListFilters, clientName: string | null): string[] {
  const out: string[] = [];
  if (f.q) out.push(`Search “${f.q}”`);
  const status = STATUS_FILTERS.find((s) => s.value === f.status);
  if (f.status && status) out.push(`Status: ${status.label}`);
  if (f.client) out.push(`Client: ${clientName ?? "selected"}`);
  const tds = TDS_FILTERS.find((t) => t.value === f.tds);
  if (f.tds && tds) out.push(tds.label);
  if (f.from || f.to) out.push(`Issued ${f.from || "the beginning"} → ${f.to || "today"}`);
  const sort = INVOICE_SORTS.find((s) => s.value === f.sort);
  if (f.sort !== DEFAULT_SORT && sort) out.push(`Sort: ${sort.label}`);
  return out;
}
