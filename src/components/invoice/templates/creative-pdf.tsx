// Minimal Creative — react-pdf twin of creative-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { ink: "#1c1917", muted: "#78716c", orange: "#ea580c", orangeSoft: "#fff7ed", rule: "#e7e5e4" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.orange, marginBottom: mm(1.5) };

export function CreativePdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(14) }}>
        {m.cancelled && <CancelledPdf />}

        {/* Header */}
        <View style={[row, { justifyContent: "space-between", alignItems: "flex-start", paddingBottom: mm(8), borderBottomWidth: 2, borderColor: C.ink }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(4) }} />}
            <View style={{ borderLeftWidth: 2.5, borderColor: C.orange, paddingLeft: mm(3.5) }}>
              <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 16, lineHeight: 1.15 }}>{m.seller.name}</Text>
              <SellerLinesPdf m={m} color={C.muted} style={{ fontSize: 8, marginTop: mm(1.5) }} />
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: C.orange, textTransform: "uppercase" }}>{m.title}</Text>
            <Text style={{ fontFamily: "Instrument Sans", fontSize: 20, fontWeight: 600, marginTop: mm(1) }}>{m.number}</Text>
          </View>
        </View>

        {/* Meta strip */}
        <View style={[row, { flexWrap: "wrap", gap: mm(6), paddingVertical: mm(3), borderBottomWidth: 1, borderColor: C.rule }]}>
          {m.meta.map((x) => (
            <View key={x.label} style={[row, { alignItems: "baseline" }]}>
              <Text style={{ fontSize: 7, textTransform: "uppercase", letterSpacing: 0.8, color: C.muted, fontWeight: 600 }}>{x.label}: </Text>
              <Text style={{ fontWeight: 600, marginLeft: mm(1) }}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={[row, { marginTop: mm(7) }]} wrap={false}>
          <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5 }} muted={C.muted} style={{ flex: 1.5, paddingRight: mm(6) }} />
          {m.shipTo && <PartyPdf p={m.shipTo} label={label} muted={C.muted} style={{ flex: 1 }} />}
        </View>

        {/* Items */}
        <View style={{ marginTop: mm(8) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { borderBottomWidth: 2, borderColor: C.ink },
              th: { fontSize: 7.5, color: C.muted, letterSpacing: 0.8, textTransform: "uppercase" },
              row: (_i, last) => (last ? { borderBottomWidth: 2, borderColor: C.ink } : { borderBottomWidth: 1, borderColor: C.rule }),
              muted: C.muted,
              index: (n) => <Text style={{ color: C.orange, fontWeight: 600 }}>{n}</Text>,
              padV: 3,
            }}
          />
        </View>

        {/* Totals & Payment */}
        <View style={[row, { marginTop: mm(7), alignItems: "flex-start" }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            <Text style={label}>Amount in words</Text>
            <Text style={{ fontWeight: 600, marginBottom: mm(4) }}>{m.words}</Text>
            <PaymentPdf m={m} assets={assets} label={label} muted={C.muted} />
          </View>
          <View style={{ backgroundColor: C.orangeSoft, padding: mm(4), borderRadius: 3, border: `1px solid ${C.orange}33` }}>
            <TotalsPdf m={m} s={{ color: C.ink, muted: C.muted, accent: C.orange, rule: C.orange, width: 64 }} />
          </View>
        </View>

        <View style={{ marginTop: mm(7) }}>
          <NotesTermsPdf m={m} label={label} color={C.muted} />
        </View>

        <View style={{ marginTop: "auto", paddingTop: mm(8) }}>
          <SignaturePdf m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.ink} />
        </View>

        {/* Footer */}
        <View style={{ marginTop: mm(6), borderTopWidth: 1, borderColor: C.rule, paddingTop: mm(3), textAlign: "center" }} fixed>
          <Text style={{ fontSize: 7.5, color: C.muted }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
