import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { EXPORT_HEADERS, buildInvoiceCsv, buildInvoiceXlsx, toExportRow } from "@/lib/invoice/export";
import { TODAY, row, tdsPending } from "./invoice-fixtures";

const col = (cells: (string | number)[], name: string) => cells[EXPORT_HEADERS.indexOf(name)];

describe("export columns", () => {
  it("has one header per exported cell and no duplicates", () => {
    expect(EXPORT_HEADERS).toHaveLength(20);
    expect(new Set(EXPORT_HEADERS).size).toBe(EXPORT_HEADERS.length);
    expect(toExportRow(row(), TODAY)).toHaveLength(EXPORT_HEADERS.length);
  });

  it("maps a TDS invoice to real values (money in rupees, derived statuses)", () => {
    const cells = toExportRow(tdsPending(), TODAY);
    expect(col(cells, "Invoice Number")).toBe("INV-2026-27/002");
    expect(col(cells, "Type")).toBe("Tax invoice");
    expect(col(cells, "Status")).toBe("Overdue"); // due 2026-09-15 < today, still sent
    expect(col(cells, "TDS Status")).toBe("TDS pending");
    expect(col(cells, "Client")).toBe("Acme Studios");
    expect(col(cells, "Client GSTIN")).toBe("29ABCDE1234F1Z5");
    expect(col(cells, "Invoice Total")).toBe(118_000);
    expect(col(cells, "TDS %")).toBe(10);
    expect(col(cells, "TDS Amount")).toBe(10_000);
    expect(col(cells, "Amount Received")).toBe(0);
    expect(col(cells, "Balance")).toBe(108_000);
  });

  it("leaves TDS % blank when no TDS applies", () => {
    const cells = toExportRow(row(), TODAY);
    expect(col(cells, "TDS Status")).toBe("No TDS");
    expect(col(cells, "TDS %")).toBe("");
    expect(col(cells, "TDS Amount")).toBe(0);
  });
});

describe("buildInvoiceCsv", () => {
  const csv = buildInvoiceCsv([toExportRow(row({ buyer: { name: 'Acme, "Inc"' } }), TODAY), toExportRow(tdsPending(), TODAY)]);

  it("starts with a UTF-8 BOM so Excel opens it correctly", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("writes a header row and one line per invoice", () => {
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe(EXPORT_HEADERS.join(","));
    expect(lines[1]).toContain("INV-2026-27/001");
  });

  it("escapes commas and quotes in a cell", () => {
    expect(csv).toContain('"Acme, ""Inc"""');
  });
});

describe("buildInvoiceXlsx", () => {
  it("is a real .xlsx (a zip of Open XML parts), not a renamed CSV", async () => {
    const buffer = await buildInvoiceXlsx([toExportRow(row(), TODAY), toExportRow(tdsPending(), TODAY)]);
    expect(buffer.subarray(0, 2).toString("latin1")).toBe("PK");
    const files = unzipSync(new Uint8Array(buffer));
    expect(Object.keys(files)).toContain("[Content_Types].xml");
    expect(Object.keys(files)).toContain("xl/worksheets/sheet1.xml");
  });

  it("carries the header row, the invoice numbers and the amounts", async () => {
    const buffer = await buildInvoiceXlsx([toExportRow(row(), TODAY)]);
    const xml = Object.values(unzipSync(new Uint8Array(buffer)))
      .map((f) => strFromU8(f))
      .join("\n");
    expect(xml).toContain("Invoice Number");
    expect(xml).toContain("INV-2026-27/001");
    expect(xml).toContain("118000");
  });
});
