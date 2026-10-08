// Export row model + CSV and Excel writers for the filtered invoice list.
// CSV, XLSX and the PDF report all read `toExportRow`, so a column can never mean two things.

import writeXlsxFile from "write-excel-file/node";
import type { ListInvoiceRow } from "./list-query";
import { balancePaise } from "./summary";
import { tdsState, TDS_STATE_LABELS } from "./tds";
import { statusLabel } from "./status";
import { DOC_LABELS } from "./doc-type";

/** Money columns are exported as plain numbers (in rupees) so spreadsheets can sum them. */
export type ExportCell = string | number;

export const EXPORT_HEADERS: string[] = [
  "Invoice Number",
  "Type",
  "Invoice Date",
  "Due Date",
  "Status",
  "TDS Status",
  "Client",
  "Client GSTIN",
  "Subtotal",
  "Discount",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Invoice Total",
  "TDS %",
  "TDS Amount",
  "Amount Received",
  "Balance",
  "Currency",
];

const rupees = (paise: number) => Math.round(paise) / 100;

export function toExportRow(r: ListInvoiceRow, today: string): ExportCell[] {
  const buyer = (r.buyer ?? {}) as { name?: string; gstin?: string };
  const state = tdsState(r.tds_paise, r.status);
  return [
    r.invoice_number,
    DOC_LABELS[r.doc_type] ?? r.doc_type,
    r.issue_date,
    r.due_date ?? "",
    statusLabel(r.status, r.due_date, today),
    TDS_STATE_LABELS[state],
    buyer.name ?? "",
    buyer.gstin ?? "",
    rupees(r.subtotal_paise),
    rupees(r.discount_paise),
    rupees(r.taxable_paise),
    rupees(r.cgst_paise),
    rupees(r.sgst_paise),
    rupees(r.igst_paise),
    rupees(r.total_paise),
    state === "none" ? "" : Number(r.tds_rate),
    rupees(r.tds_paise),
    rupees(r.amount_paid_paise),
    rupees(balancePaise(r)),
    r.currency,
  ];
}

const csvCell = (v: ExportCell): string => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV with a UTF-8 BOM (so Excel opens ₹ / accented client names correctly) and CRLF rows. */
export function buildInvoiceCsv(rows: ExportCell[][], headers: string[] = EXPORT_HEADERS): string {
  const body = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  return "\uFEFF" + body.join("\r\n");
}

/** A real .xlsx (Open XML), not a renamed CSV. Bold header row, sticky header, 2-dp money. */
export async function buildInvoiceXlsx(rows: ExportCell[][], headers: string[] = EXPORT_HEADERS, sheet = "Invoices"): Promise<Buffer> {
  const headerRow = headers.map((h) => ({ value: h, fontWeight: "bold" as const, backgroundColor: "#F1F2F4" }));
  const data = [headerRow, ...rows.map((r) => r.map(toCell))];
  return writeXlsxFile(data, {
    sheet,
    columns: headers.map((h) => ({ width: Math.max(12, Math.min(22, h.length + 6)) })),
    stickyRowsCount: 1,
  }).toBuffer();
}

function toCell(v: ExportCell) {
  if (typeof v === "number") return { value: v, type: Number, format: "#,##0.00" };
  return { value: v };
}
