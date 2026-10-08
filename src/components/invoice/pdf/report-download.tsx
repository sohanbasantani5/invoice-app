"use client";

import type { ReportModel } from "@/lib/invoice/report-model";
import { saveBlob } from "./download";

/**
 * Builds the report PDF in the browser (the PDF engine only loads now) and downloads it.
 * Server-side rendering of @react-pdf/renderer is broken by the production bundler, so the
 * report follows the same browser path as the per-invoice PDF.
 */
export async function downloadInvoiceReportPdf(model: ReportModel, fileName: string): Promise<void> {
  const [{ pdf }, { InvoiceReportDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./report-pdf")]);
  const blob = await pdf(<InvoiceReportDocument model={model} />).toBlob();
  saveBlob(blob, fileName);
}
