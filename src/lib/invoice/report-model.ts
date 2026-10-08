// The data the PDF report is drawn from. Deliberately free of @react-pdf/renderer so the server
// can build it (and hand it to the browser) without pulling the PDF engine into a server bundle;
// the document component lives in components/invoice/pdf/report-pdf.tsx.

import type { ListInvoiceRow } from "./list-query";
import { balancePaise, type InvoiceSummary } from "./summary";
import { statusLabel } from "./status";
import { tdsState } from "./tds";
import { formatDate } from "@/lib/format";

export type ReportRow = {
  date: string;
  number: string;
  client: string;
  totalPaise: number;
  tdsPaise: number;
  receivedPaise: number;
  balancePaise: number;
  status: string;
};

export type ReportModel = {
  title: string;
  generatedOn: string;
  filterLines: string[];
  currency: string;
  summary: InvoiceSummary;
  rows: ReportRow[];
};

export function buildReportModel(rows: ListInvoiceRow[], filterLines: string[], today: string, summary: InvoiceSummary): ReportModel {
  return {
    title: "Invoices",
    generatedOn: formatDate(today),
    filterLines,
    currency: "INR",
    summary,
    rows: rows.map((r) => ({
      date: formatDate(r.issue_date),
      number: r.invoice_number,
      client: ((r.buyer ?? {}) as { name?: string }).name ?? "—",
      totalPaise: r.total_paise,
      tdsPaise: tdsState(r.tds_paise, r.status) === "none" ? 0 : r.tds_paise,
      receivedPaise: r.status === "draft" || r.status === "cancelled" ? 0 : r.amount_paid_paise,
      balancePaise: r.status === "draft" || r.status === "cancelled" ? 0 : balancePaise(r),
      status: statusLabel(r.status, r.due_date, today),
    })),
  };
}
