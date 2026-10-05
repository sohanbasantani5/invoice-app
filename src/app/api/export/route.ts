import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { stateName } from "@/lib/india/states";

// CSV columns cover GSTR-1 (04 §12): number, date, GSTIN, place of supply, taxable, rate, CGST/SGST/IGST, total.

const csvCell = (v: string | number | null | undefined) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const isoToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export async function GET(request: NextRequest) {
  const { supabase, user } = await getSession();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";

  const [{ data: invoices }, { data: items }, { data: clients }, { data: payments }, { data: itemsLibrary }] = await Promise.all([
    supabase.from("invoices").select("*").order("issue_date").order("invoice_number"),
    supabase.from("invoice_items").select("*").order("position"),
    supabase.from("clients").select("*").order("name"),
    supabase.from("payments").select("*").order("paid_on"),
    supabase.from("items").select("*").order("name"),
  ]);

  const name = `invoices-${isoToday()}.${format}`;
  const rows = invoices ?? [];

  if (format === "json") {
    return new NextResponse(
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          profile: { note: "settings has the live profile; invoices carry their own snapshots" },
          clients: clients ?? [],
          items: itemsLibrary ?? [],
          invoices: rows.map((i) => ({ ...i, lines: (items ?? []).filter((l) => l.invoice_id === i.id) })),
          payments: payments ?? [],
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      },
    );
  }

  const header = [
    "Invoice Number", "Type", "Date", "Due Date", "Client", "Client GSTIN", "Place of Supply",
    "Reverse Charge", "Currency", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax",
    "Round Off", "Invoice Total", "TDS", "Amount Paid", "Status", "Notes",
  ];
  const lines = rows.map((i) => {
    const buyer = i.buyer as { name?: string; gstin?: string } | null;
    return [
      i.invoice_number,
      i.doc_type,
      i.issue_date,
      i.due_date ?? "",
      buyer?.name ?? "",
      buyer?.gstin ?? "",
      i.place_of_supply_code ? `${stateName(i.place_of_supply_code)} (${i.place_of_supply_code})` : "",
      i.reverse_charge ? "Yes" : "No",
      i.currency,
      i.taxable_paise / 100,
      i.cgst_paise / 100,
      i.sgst_paise / 100,
      i.igst_paise / 100,
      (i.cgst_paise + i.sgst_paise + i.igst_paise) / 100,
      i.round_off_paise / 100,
      i.total_paise / 100,
      i.tds_paise / 100,
      i.amount_paid_paise / 100,
      i.status,
      i.notes ?? "",
    ]
      .map(csvCell)
      .join(",");
  });
  return new NextResponse("﻿" + [header.join(","), ...lines].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
