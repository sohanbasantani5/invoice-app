// Editorial Lime — react-pdf twin of lime-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { bg: "#ffffff", dark: "#1a2e05", lime: "#84cc16", limeLight: "#f7fee7", ink: "#0f172a", muted: "#475569", rule: "#cbd5e1" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.dark, marginBottom: mm(1.5) };

export function LimePdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(14) }}>
        {m.cancelled && <CancelledPdf />}

        {/* Header Band */}
        <View style={[row, { backgroundColor: C.dark, borderRadius: 4, paddingVertical: mm(8), paddingHorizontal: mm(10), justifyContent: "space-between", alignItems: "center" }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(3) }} />}
            <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 17, color: C.lime, lineHeight: 1.15 }}>{m.seller.name}</Text>
            <SellerLinesPdf m={m} color="#94a3b8" style={{ fontSize: 8, marginTop: mm(1.5) }} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ backgroundColor: C.lime, borderRadius: 2, paddingVertical: mm(1.5), paddingHorizontal: mm(4) }}>
              <Text style={{ color: C.dark, fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{m.title}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 600, color: "#ffffff", marginTop: mm(2) }}>№ {m.number}</Text>
          </View>
        </View>

        {/* Meta Bar */}
        <View style={[row, { marginTop: mm(5), borderWidth: 2, borderColor: C.dark, backgroundColor: C.limeLight }]}>
          {m.meta.map((x, i) => (
            <View key={x.label} style={{ flex: 1, paddingVertical: mm(2.5), paddingHorizontal: mm(3), borderLeftWidth: i ? 2 : 0, borderColor: C.dark }}>
              <Text style={{ fontSize: 7, letterSpacing: 1, color: C.dark, fontWeight: 600, textTransform: "uppercase" }}>{x.label}</Text>
              <Text style={{ fontWeight: 600, fontSize: 9, marginTop: mm(0.5) }}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={[row, { marginTop: mm(6) }]} wrap={false}>
          <View style={{ flex: 1.5, borderLeftWidth: 4, borderColor: C.lime, paddingLeft: mm(3.5), paddingRight: mm(4) }}>
            <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5, color: C.dark }} muted={C.muted} />
          </View>
          {m.shipTo && (
            <View style={{ flex: 1, borderLeftWidth: 4, borderColor: C.dark, paddingLeft: mm(3.5) }}>
              <PartyPdf p={m.shipTo} label={label} name={{ color: C.dark }} muted={C.muted} />
            </View>
          )}
        </View>

        {/* Items */}
        <View style={{ marginTop: mm(7) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { backgroundColor: C.dark },
              th: { color: C.lime, letterSpacing: 0.8, textTransform: "uppercase" },
              row: (_i, last) => (last ? { borderBottomWidth: 3, borderColor: C.dark } : { borderBottomWidth: 1, borderColor: C.rule }),
              muted: C.muted,
              index: (n) => <Text style={{ color: C.dark, fontWeight: 600 }}>{n}</Text>,
              padV: 3,
            }}
          />
        </View>

        {/* Totals & Payment */}
        <View style={[row, { marginTop: mm(7), alignItems: "flex-start" }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            <Text style={label}>Amount in words</Text>
            <Text style={{ fontWeight: 600, marginBottom: mm(4), color: C.dark }}>{m.words}</Text>
            <PaymentPdf m={m} assets={assets} label={label} muted={C.muted} />
          </View>
          <View style={{ backgroundColor: C.limeLight, padding: mm(4), borderWidth: 2, borderColor: C.dark, borderRadius: 3 }}>
            <TotalsPdf m={m} s={{ color: C.dark, muted: C.muted, accent: C.dark, rule: C.dark, width: 64 }} />
          </View>
        </View>

        <View style={{ marginTop: mm(6) }}>
          <NotesTermsPdf m={m} label={label} color={C.muted} />
        </View>

        <View style={{ marginTop: "auto", paddingTop: mm(8) }}>
          <SignaturePdf m={m} assets={assets} color={C.dark} muted={C.muted} rule={C.dark} />
        </View>

        {/* Footer */}
        <View style={{ marginTop: mm(6), backgroundColor: C.dark, borderRadius: 2, paddingVertical: mm(3), paddingHorizontal: mm(6), textAlign: "center" }} fixed>
          <Text style={{ fontSize: 7.5, color: "#94a3b8" }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
