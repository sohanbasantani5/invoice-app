import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import { describeFilters, parseListFilters } from "@/lib/invoice/list-filters";
import { fetchAllInvoiceList } from "@/lib/invoice/list-query";
import { invoiceSummary } from "@/lib/invoice/summary";
import { buildInvoiceCsv, buildInvoiceXlsx, toExportRow } from "@/lib/invoice/export";
import { buildReportModel } from "@/lib/invoice/report-model";

export const runtime = "nodejs";

// csv + xlsx are produced here; `json` returns the report model the browser renders into a PDF
// (react-pdf cannot be bundled into a server route without breaking).
const FORMATS = { csv: true, xlsx: true, json: true } as const;
type Format = keyof typeof FORMATS;

const isFormat = (v: string): v is Format => v in FORMATS;

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSession();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const raw = params.get("format") ?? "";
  const format: Format = isFormat(raw) ? raw : "csv";

  // The same filters the list page uses, so an export is exactly what the user is looking at.
  const filters = parseListFilters(Object.fromEntries(params));
  const today = todayISO();
  const rows = await fetchAllInvoiceList(supabase, filters, today);
  const base = `invoices-${today}`;
  const headers = { "Cache-Control": "private, no-store" } as const;

  if (format === "csv") {
    return new NextResponse(buildInvoiceCsv(rows.map((r) => toExportRow(r, today))), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
      },
    });
  }

  if (format === "xlsx") {
    const buffer = await buildInvoiceXlsx(rows.map((r) => toExportRow(r, today)));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  // JSON: the report model for the browser-built PDF. Resolve the client filter to a name so the
  // report says who it filtered on.
  let clientName: string | null = null;
  if (filters.client) {
    const { data } = await supabase.from("clients").select("name").eq("id", filters.client).maybeSingle();
    clientName = data?.name ?? null;
  }
  const model = buildReportModel(rows, describeFilters(filters, clientName), today, invoiceSummary(rows));
  return NextResponse.json({ model, fileName: `${base}-report.pdf` }, { headers });
}
