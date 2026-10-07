// Friendly Bakery — react-pdf twin of bakery-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { bg: "#fffbeb", ink: "#451a03", muted: "#78350f", amber: "#d97706", soft: "#fef3c7", card: "#fef8ee", border: "#fde68a" };
const label = { fontSize: 6.5, letterSpacing: 1, textTransform: "uppercase" as const, fontWeight: 600, color: C.amber, marginBottom: mm(1.5) };

export function BakeryPdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(14), backgroundColor: C.bg }}>
        {m.cancelled && <CancelledPdf />}

        {/* Header card */}
        <View style={[row, { backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, paddingVertical: mm(8), paddingHorizontal: mm(10), justifyContent: "space-between", alignItems: "center" }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(3) }} />}
            <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 16, color: C.ink }}>{m.seller.name}</Text>
            <SellerLinesPdf m={m} color={C.muted} style={{ fontSize: 8, marginTop: mm(1) }} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ backgroundColor: C.amber, borderRadius: 12, paddingVertical: mm(1.5), paddingHorizontal: mm(5) }}>
              <Text style={{ color: "#fff", fontWeight: 600, fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>{m.title}</Text>
            </View>
            <Text style={{ fontFamily: "Instrument Sans", fontSize: 18, fontWeight: 600, marginTop: mm(2), color: C.ink }}>#{m.number}</Text>
          </View>
        </View>

        {/* Meta Pills */}
        <View style={[row, { flexWrap: "wrap", gap: mm(3), marginTop: mm(6) }]}>
          {m.meta.map((x) => (
            <View key={x.label} style={[row, { backgroundColor: C.soft, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: mm(1.5), paddingHorizontal: mm(4) }]}>
              <Text style={{ color: C.muted, fontWeight: 600, fontSize: 8 }}>{x.label}: </Text>
              <Text style={{ fontWeight: 600, color: C.ink, fontSize: 8, marginLeft: mm(1) }}>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* Parties */}
        <View style={[row, { marginTop: mm(7), gap: mm(6) }]} wrap={false}>
          <View style={{ flex: 1.5, backgroundColor: C.card, borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: mm(5) }}>
            <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5, color: C.ink }} muted={C.muted} />
          </View>
          {m.shipTo && (
            <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: mm(5) }}>
              <PartyPdf p={m.shipTo} label={label} name={{ color: C.ink }} muted={C.muted} />
            </View>
          )}
        </View>

        {/* Items */}
        <View style={{ marginTop: mm(7) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { backgroundColor: C.soft },
              th: { color: C.amber, letterSpacing: 0.8, textTransform: "uppercase" },
              row: (_i, last) => (last ? { borderBottomWidth: 2, borderColor: C.amber } : { borderBottomWidth: 1, borderColor: C.border }),
              muted: C.muted,
              index: (n) => <Text style={{ color: C.amber, fontWeight: 600 }}>{n}</Text>,
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
          <View style={{ backgroundColor: C.card, borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: mm(4) }}>
            <TotalsPdf m={m} s={{ color: C.ink, muted: C.muted, accent: C.amber, rule: C.amber, width: 64 }} />
          </View>
        </View>

        <View style={{ marginTop: mm(6) }}>
          <NotesTermsPdf m={m} label={label} color={C.muted} />
        </View>

        <View style={{ marginTop: "auto", paddingTop: mm(8) }}>
          <SignaturePdf m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.amber} />
        </View>

        {/* Footer */}
        <View style={{ marginTop: mm(6), backgroundColor: C.soft, borderRadius: 10, paddingVertical: mm(2.5), paddingHorizontal: mm(6), textAlign: "center" }} fixed>
          <Text style={{ fontSize: 7.5, color: C.muted }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
