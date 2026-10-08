// @react-pdf version of the filtered invoice list report. Rendered in the browser (same path as
// the per-invoice PDF) because bundling react-pdf into a Next server route breaks it. Built-in
// Helvetica, so no font file is needed; amounts are plain numbers with an "INR" note (no ₹ glyph).

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportModel, ReportRow } from "@/lib/invoice/report-model";
import { formatAmount } from "@/lib/format";

const ink = "#1B1D21";
const ink2 = "#565A61";
const ink3 = "#8A8D94";
const rule = "#D9DBDF";

const COLUMNS: { key: keyof ReportRow; label: string; flex: number; align?: "right" }[] = [
  { key: "date", label: "Date", flex: 12 },
  { key: "number", label: "Invoice", flex: 15 },
  { key: "client", label: "Client", flex: 22 },
  { key: "totalPaise", label: "Amount", flex: 11, align: "right" },
  { key: "tdsPaise", label: "TDS", flex: 10, align: "right" },
  { key: "receivedPaise", label: "Received", flex: 11, align: "right" },
  { key: "balancePaise", label: "Balance", flex: 11, align: "right" },
  { key: "status", label: "Status", flex: 8 },
];

const s = StyleSheet.create({
  page: { paddingVertical: 28, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, color: ink },
  row: { flexDirection: "row" },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  label: { fontSize: 7, color: ink3, letterSpacing: 0.6 },
  muted: { color: ink2 },
  right: { textAlign: "right" },
  th: { fontSize: 7.5, color: ink3, letterSpacing: 0.4 },
  cell: { paddingVertical: 4 },
  band: { borderWidth: 1, borderColor: rule, marginTop: 10 },
  summaryCell: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderLeftWidth: 1, borderColor: rule },
  totals: { fontFamily: "Helvetica-Bold", fontSize: 11 },
});

function SummaryCell({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View style={[s.summaryCell, first ? { borderLeftWidth: 0 } : {}]}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <Text style={[s.totals, { marginTop: 3 }]}>{value}</Text>
    </View>
  );
}

export function InvoiceReportDocument({ model }: { model: ReportModel }) {
  const money = (paise: number) => formatAmount(paise);
  return (
    <Document title={`${model.title} report`} creator="Invoices" producer="Invoices">
      <Page size="A4" orientation="landscape" style={s.page} wrap>
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-end" }]}>
          <View>
            <Text style={s.h1}>Invoice report</Text>
            <Text style={[s.muted, { marginTop: 3 }]}>{model.filterLines.length ? model.filterLines.join("  ·  ") : "All invoices"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>REPORT DATE</Text>
            <Text style={{ marginTop: 3 }}>{model.generatedOn}</Text>
            <Text style={[s.muted, { marginTop: 2 }]}>Amounts in {model.currency}</Text>
          </View>
        </View>

        <View style={s.band} wrap={false}>
          <View style={s.row}>
            <SummaryCell first label="Invoiced" value={money(model.summary.invoiced)} />
            <SummaryCell label="Received" value={money(model.summary.received)} />
            <SummaryCell label="Outstanding" value={money(model.summary.outstanding)} />
            <SummaryCell label="TDS deducted" value={money(model.summary.tds)} />
          </View>
        </View>

        <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>
          {model.summary.count} invoice{model.summary.count === 1 ? "" : "s"} in this report
          {model.summary.excludedDraftsCancelled ? ` · ${model.summary.excludedDraftsCancelled} draft/cancelled excluded from totals` : ""}
          {model.summary.otherCurrency ? ` · ${model.summary.otherCurrency} in another currency not totalled` : ""}
        </Text>

        <View style={[s.row, { marginTop: 12, borderBottomWidth: 1, borderColor: ink, paddingBottom: 4 }]} fixed>
          {COLUMNS.map((c) => (
            <Text key={c.key} style={[s.th, c.align === "right" ? s.right : {}, { flex: c.flex }]}>
              {c.label.toUpperCase()}
            </Text>
          ))}
        </View>

        {model.rows.map((r, i) => (
          <View key={`${r.number}-${i}`} style={[s.row, { borderBottomWidth: 1, borderColor: rule }]} wrap={false}>
            {COLUMNS.map((c) => (
              <Text key={c.key} style={[s.cell, c.align === "right" ? s.right : {}, { flex: c.flex }, c.key === "number" ? { fontFamily: "Courier" } : {}]}>
                {c.align === "right" ? money(Number(r[c.key]) || 0) : String(r[c.key])}
              </Text>
            ))}
          </View>
        ))}

        {model.rows.length === 0 && <Text style={[s.muted, { marginTop: 14 }]}>No invoices match these filters.</Text>}

        <Text
          fixed
          style={[s.muted, { position: "absolute", bottom: 14, left: 32, right: 32, fontSize: 7.5, textAlign: "center" }]}
          render={({ pageNumber, totalPages }) => `Generated ${model.generatedOn} · Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
