// Dynamic Bold — react-pdf twin of dynamic-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { bg: "#ffffff", dark: "#881337", pink: "#be185d", soft: "#fff1f2", ink: "#111827", muted: "#4b5563", border: "#fecdd3" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.pink, marginBottom: mm(1.5) };

export function DynamicPdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(14), paddingTop: mm(18), borderTopWidth: mm(6), borderColor: C.dark }}>
        {m.cancelled && <CancelledPdf />}

        {/* Header */}
        <View style={[row, { justifyContent: "space-between", alignItems: "flex-start", paddingBottom: mm(6), borderBottomWidth: 3, borderColor: C.dark }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(3) }} />}
            <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 18, color: C.dark, textTransform: "uppercase" }}>{m.seller.name}</Text>
            <SellerLinesPdf m={m} color={C.muted} style={{ fontSize: 8, marginTop: mm(1.5) }} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ backgroundColor: C.pink, borderRadius: 2, paddingVertical: mm(2), paddingHorizontal: mm(6) }}>
              <Text style={{ color: "#ffffff", fontWeight: 600, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{m.title}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 600, color: C.dark, marginTop: mm(2) }}>#{m.number}</Text>
          </View>
        </View>

        {/* Meta Grid */}
        <View style={[row, { marginTop: mm(5), borderWidth: 2, borderColor: C.pink, backgroundColor: C.soft }]}>
          {m.meta.map((x, i) => (
            <View key={x.label} style={{ flex: 1, paddingVertical: mm(2.5), paddingHorizontal: mm(3), borderLeftWidth: i ? 2 : 0, borderColor: C.pink }}>
              <Text style={{ fontSize: 7, letterSpacing: 1, color: C.pink, fontWeight: 600, textTransform: "uppercase" }}>{x.label}</Text>
              <Text style={{ fontWeight: 600, fontSize: 9, marginTop: mm(0.5), color: C.dark }}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={[row, { marginTop: mm(6) }]} wrap={false}>
          <View style={{ flex: 1.5, backgroundColor: C.soft, padding: mm(4), borderRadius: 3, borderLeftWidth: 4, borderColor: C.pink, marginRight: mm(4) }}>
            <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5, color: C.dark, fontWeight: 600 }} muted={C.muted} />
          </View>
          {m.shipTo && (
            <View style={{ flex: 1, backgroundColor: C.soft, padding: mm(4), borderRadius: 3, borderLeftWidth: 4, borderColor: C.dark }}>
              <PartyPdf p={m.shipTo} label={label} name={{ color: C.dark, fontWeight: 600 }} muted={C.muted} />
            </View>
          )}
        </View>

        {/* Items */}
        <View style={{ marginTop: mm(7) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { backgroundColor: C.dark },
              th: { color: "#ffffff", letterSpacing: 0.8, textTransform: "uppercase" },
              row: (_i, last) => (last ? { borderBottomWidth: 3, borderColor: C.dark } : { borderBottomWidth: 1, borderColor: C.border }),
              muted: C.muted,
              index: (n) => <Text style={{ color: C.pink, fontWeight: 600 }}>{n}</Text>,
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
          <View style={{ backgroundColor: C.dark, padding: mm(4), borderRadius: 3 }}>
            <TotalsPdf m={m} s={{ color: "#ffffff", muted: "#fecdd3", accent: "#f472b6", rule: C.pink, width: 64 }} />
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
          <Text style={{ fontSize: 7.5, color: "#fecdd3" }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
