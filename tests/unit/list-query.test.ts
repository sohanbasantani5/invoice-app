import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchAllInvoiceList, fetchInvoiceList, type ListInvoiceRow } from "@/lib/invoice/list-query";
import { parseListFilters, type ListFilters } from "@/lib/invoice/list-filters";
import { TODAY, row } from "./invoice-fixtures";

type Call = { method: string; args: unknown[] };

/** Minimal stand-in for the PostgREST builder: records the chain, then resolves { data, count }. */
function fakeQuery(allRows: ListInvoiceRow[]) {
  const calls: Call[] = [];
  let range: [number, number] | null = null;
  let limit: number | null = null;
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  const builder = {
    select: record("select"),
    or: record("or"),
    in: record("in"),
    eq: record("eq"),
    neq: record("neq"),
    gt: record("gt"),
    gte: record("gte"),
    lt: record("lt"),
    lte: record("lte"),
    order: record("order"),
    limit: (n: number) => {
      calls.push({ method: "limit", args: [n] });
      limit = n;
      return builder;
    },
    range: (from: number, to: number) => {
      calls.push({ method: "range", args: [from, to] });
      range = [from, to];
      return builder;
    },
    returns: record("returns"),
    then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      const start = range ? range[0] : 0;
      const end = range ? range[1] + 1 : limit != null ? limit : allRows.length;
      const data = allRows.slice(start, Math.min(end, limit ?? end));
      return Promise.resolve({ data, count: allRows.length, error: null }).then(onFulfilled, onRejected);
    },
  };
  const client = {
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
  };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

const filters = (over: Partial<Record<string, string>> = {}): ListFilters => parseListFilters(over);
const argsOf = (calls: Call[], method: string) => calls.filter((c) => c.method === method).map((c) => c.args);

describe("buildInvoiceQuery filters", () => {
  it("reads the invoice table", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters(), TODAY);
    expect(argsOf(calls, "from")).toEqual([["invoices"]]);
  });

  it("filters overdue from status + due date, never a stored 'overdue' status", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ status: "overdue" }), TODAY);
    expect(argsOf(calls, "in")).toContainEqual(["status", ["sent", "partially_paid"]]);
    expect(argsOf(calls, "lt")).toContainEqual(["due_date", TODAY]);
  });

  it("treats unpaid as the outstanding set (sent + partially paid)", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ status: "unpaid" }), TODAY);
    expect(argsOf(calls, "in")).toContainEqual(["status", ["sent", "partially_paid"]]);
    expect(argsOf(calls, "lt")).toEqual([]);
  });

  it("maps a stored status to eq", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ status: "paid" }), TODAY);
    expect(argsOf(calls, "eq")).toContainEqual(["status", "paid"]);
  });

  it("maps TDS states to tds_paise + status", async () => {
    const none = fakeQuery([]);
    await fetchInvoiceList(none.client, filters({ tds: "none" }), TODAY);
    expect(argsOf(none.calls, "or")).toContainEqual(["tds_paise.lte.0,status.eq.cancelled"]);

    const pending = fakeQuery([]);
    await fetchInvoiceList(pending.client, filters({ tds: "pending" }), TODAY);
    expect(argsOf(pending.calls, "gt")).toContainEqual(["tds_paise", 0]);
    expect(argsOf(pending.calls, "in")).toContainEqual(["status", ["draft", "sent", "partially_paid"]]);

    const accounted = fakeQuery([]);
    await fetchInvoiceList(accounted.client, filters({ tds: "accounted" }), TODAY);
    expect(argsOf(accounted.calls, "gt")).toContainEqual(["tds_paise", 0]);
    expect(argsOf(accounted.calls, "eq")).toContainEqual(["status", "paid"]);
  });

  it("combines client, date range and search", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ client: "22222222-2222-2222-2222-222222222222", from: "2026-04-01", to: "2026-10-08", q: "acme" }), TODAY);
    expect(argsOf(calls, "eq")).toContainEqual(["client_id", "22222222-2222-2222-2222-222222222222"]);
    expect(argsOf(calls, "gte")).toContainEqual(["issue_date", "2026-04-01"]);
    expect(argsOf(calls, "lte")).toContainEqual(["issue_date", "2026-10-08"]);
    expect(argsOf(calls, "or")).toContainEqual(["invoice_number.ilike.*acme*,buyer->>name.ilike.*acme*"]);
  });

  it("strips wildcards and commas out of the search text", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ q: "a%b_c,d(e)" }), TODAY);
    expect(argsOf(calls, "or")).toContainEqual(["invoice_number.ilike.*a b c d e *,buyer->>name.ilike.*a b c d e *"]);
  });
});

describe("buildInvoiceQuery ordering", () => {
  const orderArgs = (calls: Call[]) => argsOf(calls, "order");

  it("orders by issue date, then created_at, then id", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters(), TODAY);
    expect(orderArgs(calls)).toEqual([
      ["issue_date", { ascending: false }],
      ["created_at", { ascending: false }],
      ["id", { ascending: true }],
    ]);
  });

  it("orders by amount when asked", async () => {
    const { client, calls } = fakeQuery([]);
    await fetchInvoiceList(client, filters({ sort: "amount_asc" }), TODAY);
    expect(orderArgs(calls)[0]).toEqual(["total_paise", { ascending: true }]);
  });
});

describe("fetchInvoiceList", () => {
  it("returns the page of rows and the exact match count", async () => {
    const all = Array.from({ length: 12 }, (_, i) => row({ id: `id-${i}` }));
    const { client } = fakeQuery(all);
    const { rows, count } = await fetchInvoiceList(client, filters(), TODAY);
    expect(rows).toHaveLength(12);
    expect(count).toBe(12);
  });

  it("caps the page at the limit but still reports the full count", async () => {
    const all = Array.from({ length: 12 }, (_, i) => row({ id: `id-${i}` }));
    const { client } = fakeQuery(all);
    const { rows, count } = await fetchInvoiceList(client, filters(), TODAY, 5);
    expect(rows).toHaveLength(5);
    expect(count).toBe(12);
  });
});

describe("fetchAllInvoiceList", () => {
  it("pages past the 1000-row response cap", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => row({ id: `id-${i}` }));
    const { client, calls } = fakeQuery(all);
    const rows = await fetchAllInvoiceList(client, filters(), TODAY);
    expect(rows).toHaveLength(2500);
    expect(argsOf(calls, "range")).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("stops after one short page", async () => {
    const { client, calls } = fakeQuery([row()]);
    const rows = await fetchAllInvoiceList(client, filters(), TODAY);
    expect(rows).toHaveLength(1);
    expect(argsOf(calls, "range")).toEqual([[0, 999]]);
  });
});
