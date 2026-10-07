// Soft Pink Modern — react-pdf twin of pink_modern-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { bg: "#fdf2f8", ink: "#831843", muted: "#9d174d", pink: "#db2777", pinkSoft: "#fce7f3", border: "#fbcfe8" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.pink, marginBottom: mm(1.5) };

export function PinkModernPdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(14), paddingLeft: mm(18), backgroundColor: C.bg, borderLeftWidth: mm(6), borderColor: C.pink }}>
        {m.cancelled && <CancelledPdf />}

        {/* Header */}
        <View style={[row, { justifyContent: "space-between", alignItems: "flex-start", paddingBottom: mm(6), borderBottomWidth: 2, borderColor: C.pink }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(3) }} />}
            <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 16, color: C.ink, lineHeight: 1.2 }}>{m.seller.name}</Text>
            <SellerLinesPdf m={m} color={C.muted} style={{ fontSize: 8, marginTop: mm(1.5) }} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: "Instrument Sans", fontSize: 22, fontWeight: 600, color: C.pink, lineHeight: 1 }}>{m.title}</Text>
            <Text style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginTop: mm(2) }}>{m.number}</Text>
          </View>
        </View>

        {/* Meta Bar */}
        <View style={[row, { backgroundColor: C.pinkSoft, paddingVertical: mm(3), paddingHorizontal: mm(5), borderRadius: 3, borderWidth: 1, borderColor: C.border, justifyContent: "space-between", gap: mm(4), marginTop: mm(5) }]}>
          {m.meta.map((x) => (
            <View key={x.label} style={row}>
              <Text style={{ color: C.muted, fontWeight: 600, fontSize: 8.5 }}>{x.label}: </Text>
              <Text style={{ fontWeight: 600, color: C.ink, fontSize: 8.5, marginLeft: mm(1) }}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={[row, { marginTop: mm(6) }]} wrap={false}>
          <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5, color: C.ink }} muted={C.muted} style={{ flex: 1.5, paddingRight: mm(6) }} />
          {m.shipTo && <PartyPdf p={m.shipTo} label={label} name={{ color: C.ink }} muted={C.muted} style={{ flex: 1 }} />}
        </View>

        {/* Items */}
        <View style={{ marginTop: mm(7) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { backgroundColor: C.pink },
              th: { color: "#fff", letterSpacing: 0.8, textTransform: "uppercase" },
              row: (_i, last) => (last ? { borderBottomWidth: 2, borderColor: C.pink } : { borderBottomWidth: 1, borderColor: C.border }),
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
            <Text style={{ fontWeight: 600, marginBottom: mm(4), color: C.ink }}>{m.words}</Text>
            <PaymentPdf m={m} assets={assets} label={label} muted={C.muted} />
          </View>
          <View style={{ backgroundColor: C.pinkSoft, padding: mm(4), borderRadius: 3, borderWidth: 1, borderColor: C.border }}>
            <TotalsPdf m={m} s={{ color: C.ink, muted: C.muted, accent: C.pink, rule: C.pink, width: 64 }} />
          </View>
        </View>

        <View style={{ marginTop: mm(6) }}>
          <NotesTermsPdf m={m} label={label} color={C.muted} />
        </View>

        <View style={{ marginTop: "auto", paddingTop: mm(8) }}>
          <SignaturePdf m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.pink} />
        </View>

        {/* Footer */}
        <View style={{ marginTop: mm(6), borderTopWidth: 1, borderColor: C.border, paddingTop: mm(3), textAlign: "center" }} fixed>
          <Text style={{ fontSize: 7.5, color: C.muted }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
