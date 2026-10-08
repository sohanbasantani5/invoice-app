"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { buttonVariants } from "@/components/ui/button";
import type { ReportModel } from "@/lib/invoice/report-model";

/** CSV and XLSX stream from the server; the PDF is built in the browser from the same filters. */
export function ExportMenu({ query }: { query: string }) {
  const [busy, setBusy] = useState(false);
  const href = (format: string) => `/api/invoices/export?format=${format}${query ? `&${query}` : ""}`;

  function go(format: string) {
    window.location.href = href(format);
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const res = await fetch(href("json"), { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const { model, fileName } = (await res.json()) as { model: ReportModel; fileName: string };
      const { downloadInvoiceReportPdf } = await import("@/components/invoice/pdf/report-download");
      await downloadInvoiceReportPdf(model, fileName);
    } catch {
      toast.error("Could not build the PDF report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu
      triggerLabel="Download invoices"
      triggerClassName={buttonVariants({ variant: "secondary" })}
      trigger={
        <>
          <Download aria-hidden /> {busy ? "Building…" : "Download"}
        </>
      }
    >
      <div className="px-2.5 py-1.5">
        <p className="text-sm font-medium text-ink">Download all matching</p>
        <p className="text-caption">{query ? "Uses the filters above" : "Every invoice"}</p>
      </div>
      <MenuSeparator />
      <MenuItem onClick={downloadPdf} disabled={busy}>
        PDF report<span className="ml-auto text-caption">Summary + table</span>
      </MenuItem>
      <MenuItem onClick={() => go("xlsx")}>
        Excel (.xlsx)<span className="ml-auto text-caption">Spreadsheet</span>
      </MenuItem>
      <MenuItem onClick={() => go("csv")}>
        CSV<span className="ml-auto text-caption">Plain text</span>
      </MenuItem>
    </Menu>
  );
}
