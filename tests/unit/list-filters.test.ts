import { describe, expect, it } from "vitest";
import { DEFAULT_SORT, describeFilters, filtersQuery, hasActiveFilters, parseListFilters } from "@/lib/invoice/list-filters";

describe("parseListFilters", () => {
  it("returns safe defaults for an empty query", () => {
    const f = parseListFilters({});
    expect(f).toEqual({ q: "", status: "", client: "", from: "", to: "", tds: "", sort: DEFAULT_SORT });
  });

  it("keeps only known status/tds/sort values", () => {
    const f = parseListFilters({ status: "hacked", tds: "bogus", sort: "drop table" });
    expect(f.status).toBe("");
    expect(f.tds).toBe("");
    expect(f.sort).toBe(DEFAULT_SORT);
  });

  it("accepts the derived status and TDS filters", () => {
    for (const status of ["draft", "sent", "unpaid", "partially_paid", "paid", "overdue", "cancelled"]) {
      expect(parseListFilters({ status }).status).toBe(status);
    }
    for (const tds of ["none", "pending", "accounted"]) {
      expect(parseListFilters({ tds }).tds).toBe(tds);
    }
  });

  it("only accepts a real uuid as the client filter", () => {
    expect(parseListFilters({ client: "abc" }).client).toBe("");
    expect(parseListFilters({ client: "22222222-2222-2222-2222-222222222222" }).client).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("only accepts ISO dates", () => {
    expect(parseListFilters({ from: "01-10-2026" }).from).toBe("");
    expect(parseListFilters({ from: "2026-10-01" }).from).toBe("2026-10-01");
    expect(parseListFilters({ to: "2026-10-31" }).to).toBe("2026-10-31");
  });

  it("trims and caps the search text", () => {
    expect(parseListFilters({ q: "  acme  " }).q).toBe("acme");
    expect(parseListFilters({ q: "x".repeat(120) }).q).toHaveLength(60);
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseListFilters({ status: ["paid", "draft"] }).status).toBe("");
  });
});

describe("hasActiveFilters", () => {
  it("is false for the default view and true once anything is set", () => {
    expect(hasActiveFilters(parseListFilters({}))).toBe(false);
    expect(hasActiveFilters(parseListFilters({ q: "acme" }))).toBe(true);
    expect(hasActiveFilters(parseListFilters({ sort: "amount_asc" }))).toBe(false); // sort is not a filter
    expect(hasActiveFilters(parseListFilters({ tds: "pending" }))).toBe(true);
  });
});

describe("filtersQuery", () => {
  it("omits empties and the default sort", () => {
    expect(filtersQuery(parseListFilters({}))).toBe("");
    expect(filtersQuery(parseListFilters({ sort: DEFAULT_SORT }))).toBe("");
  });

  it("URL-encodes every active filter for export links", () => {
    const q = filtersQuery(parseListFilters({ q: "acme & co", status: "overdue", tds: "pending", from: "2026-04-01" }));
    const p = new URLSearchParams(q);
    expect(p.get("q")).toBe("acme & co");
    expect(p.get("status")).toBe("overdue");
    expect(p.get("tds")).toBe("pending");
    expect(p.get("from")).toBe("2026-04-01");
  });
});

describe("describeFilters", () => {
  it("says 'all invoices' only when nothing is set", () => {
    expect(describeFilters(parseListFilters({}), null)).toEqual([]);
  });

  it("names the client when known", () => {
    const f = parseListFilters({ client: "22222222-2222-2222-2222-222222222222", status: "paid" });
    expect(describeFilters(f, "Acme Studios")).toContain("Client: Acme Studios");
    expect(describeFilters(f, null)).toContain("Client: selected");
  });

  it("describes the combined filters that drive an export", () => {
    const f = parseListFilters({ status: "overdue", tds: "pending", q: "acme", client: "22222222-2222-2222-2222-222222222222", from: "2026-04-01", to: "2026-10-08", sort: "amount_desc" });
    const lines = describeFilters(f, "Acme Studios");
    expect(lines).toContain("Status: Overdue");
    expect(lines).toContain("TDS pending");
    expect(lines).toContain("Search “acme”");
    expect(lines).toContain("Client: Acme Studios");
    expect(lines.some((l) => l.startsWith("Issued "))).toBe(true);
    expect(lines).toContain("Sort: Amount: high to low");
  });
});
