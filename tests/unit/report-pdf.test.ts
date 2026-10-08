import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PDFParse } from "pdf-parse";
import { InvoiceReportDocument } from "@/components/invoice/pdf/report-pdf";
import { buildReportModel } from "@/lib/invoice/report-model";
import { invoiceSummary } from "@/lib/invoice/summary";
import { TODAY, row, tdsAccounted, tdsPending } from "./invoice-fixtures";

const rows = [row(), tdsPending(), tdsAccounted()];
const model = buildReportModel(rows, ["Status: Overdue", "TDS pending"], TODAY, invoiceSummary(rows));

async function renderText(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

describe("buildReportModel", () => {
  it("formats dates, statuses and TDS-aware money", () => {
    expect(model.generatedOn).toBe("08 Oct 2026");
    expect(model.rows[0].date).toBe("01 Sep 2026");
    expect(model.rows[0].status).toBe("Overdue");
    expect(model.rows[0].tdsPaise).toBe(0);
    expect(model.rows[1].tdsPaise).toBe(10_000_00);
    expect(model.rows[1].balancePaise).toBe(108_000_00);
  });

  it("shows nothing received/owed for drafts and cancelled rows", () => {
    const draft = buildReportModel([row({ status: "draft", amount_paid_paise: 500_00 })], [], TODAY, invoiceSummary([]));
    expect(draft.rows[0].receivedPaise).toBe(0);
    expect(draft.rows[0].balancePaise).toBe(0);
  });

  it("keeps the active filters verbatim for the header", () => {
    expect(model.filterLines).toEqual(["Status: Overdue", "TDS pending"]);
  });
});

describe("InvoiceReportDocument", () => {
  it("renders a PDF containing the report heading, a filter line and the invoice numbers", async () => {
    const buffer = await renderToBuffer(createElement(InvoiceReportDocument, { model }) as never);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const text = await renderText(buffer);
    expect(text).toContain("Invoice report");
    expect(text).toContain("OUTSTANDING");
    expect(text).toContain("Status: Overdue");
    expect(text).toContain("INV-2026-27/001");
    expect(text).toContain("INV-2026-27/002");
  });

  it("renders an empty-result report without failing", async () => {
    const empty = buildReportModel([], [], TODAY, invoiceSummary([]));
    const buffer = await renderToBuffer(createElement(InvoiceReportDocument, { model: empty }) as never);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(await renderText(buffer)).toContain("No invoices match these filters.");
  });
});
