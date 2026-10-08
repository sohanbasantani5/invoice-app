// Elegant Classic — react-pdf twin of elegant-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { ink: "#292524", muted: "#57534e", accent: "#9f1239", soft: "#fff1f2", rule: "#e7e5e4" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.accent, marginBottom: mm(1.5) };

export function ElegantPdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, padding: mm(12) }}>
        {m.cancelled && <CancelledPdf />}

        {/* Double border frame */}
        <View style={{ borderWidth: 1, borderColor: C.ink, padding: mm(2), height: "100%" }}>
          <View style={{ borderWidth: 1, borderColor: C.ink, padding: mm(10), height: "100%", justifyContent: "space-between" }}>
            
            <View>
              {/* Header */}
              <View style={[row, { justifyContent: "space-between", alignItems: "flex-start", paddingBottom: mm(5), borderBottomWidth: 2, borderColor: C.ink }]}>
                <View style={{ flex: 1, paddingRight: mm(8) }}>
                  {assets.logoUrl && <LogoPdf url={assets.logoUrl} style={{ marginBottom: mm(3) }} />}
                  <Text style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 19, color: C.ink, letterSpacing: -0.2, lineHeight: 1.12 }}>{m.seller.name}</Text>
                  <SellerLinesPdf m={m} color={C.muted} style={{ fontSize: 8, marginTop: mm(1.5) }} />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: "Playfair Display", fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: 1.8, textTransform: "uppercase" }}>{m.title}</Text>
                  <Text style={{ fontSize: 10.5, fontWeight: 600, color: C.ink, marginTop: mm(2), letterSpacing: 0.2 }}>Nº {m.number}</Text>
                </View>
              </View>

              {/* Meta grid */}
              <View style={[row, { marginTop: mm(5), borderWidth: 1, borderColor: C.rule, backgroundColor: C.soft }]}>
                {m.meta.map((x, i) => (
                  <View key={x.label} style={{ flex: 1, paddingVertical: mm(2.5), paddingHorizontal: mm(3), borderLeftWidth: i ? 1 : 0, borderColor: C.rule }}>
                    <Text style={{ fontSize: 6.5, letterSpacing: 1, color: C.accent, fontWeight: 600, textTransform: "uppercase" }}>{x.label}</Text>
                    <Text style={{ fontWeight: 600, fontSize: 9, marginTop: mm(0.5) }}>{x.value}</Text>
                  </View>
                ))}
              </View>

              {/* Parties */}
              <View style={[row, { marginTop: mm(6) }]} wrap={false}>
                <PartyPdf p={m.billTo} label={label} name={{ fontFamily: "Playfair Display", fontSize: 11, color: C.ink }} muted={C.muted} style={{ flex: 1.5, paddingRight: mm(6) }} />
                {m.shipTo && <PartyPdf p={m.shipTo} label={label} name={{ fontFamily: "Playfair Display", color: C.ink }} muted={C.muted} style={{ flex: 1 }} />}
              </View>

              {/* Items */}
              <View style={{ marginTop: mm(7) }}>
                <ItemsTablePdf
                  m={m}
                  s={{
                    head: { borderBottomWidth: 2, borderTopWidth: 1, borderColor: C.ink },
                    th: { fontSize: 7.5, color: C.ink, letterSpacing: 0.8, textTransform: "uppercase" },
                    row: (_i, last) => (last ? { borderBottomWidth: 2, borderColor: C.ink } : { borderBottomWidth: 1, borderColor: C.rule }),
                    muted: C.muted,
                    index: (n) => <Text style={{ color: C.accent, fontWeight: 600 }}>{n}</Text>,
                    padV: 2.5,
                  }}
                />
              </View>

              {/* Totals & Payment */}
              <View style={[row, { marginTop: mm(6), alignItems: "flex-start" }]} wrap={false}>
                <View style={{ flex: 1, paddingRight: mm(8) }}>
                  <Text style={label}>Amount in words</Text>
                  <Text style={{ fontFamily: "Playfair Display", fontWeight: 600, marginBottom: mm(4), fontStyle: "italic", color: C.ink }}>{m.words}</Text>
                  <PaymentPdf m={m} assets={assets} label={label} muted={C.muted} />
                </View>
                <View style={{ padding: mm(3), borderWidth: 1, borderColor: C.rule, backgroundColor: C.soft }}>
                  <TotalsPdf m={m} s={{ color: C.ink, muted: C.muted, accent: C.accent, rule: C.ink, width: 62 }} />
                </View>
              </View>

              <View style={{ marginTop: mm(5) }}>
                <NotesTermsPdf m={m} label={label} color={C.muted} />
              </View>
            </View>

            <View>
              <View style={{ marginTop: mm(6) }}>
                <SignaturePdf m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.ink} />
              </View>

              {/* Footer */}
              <View style={{ marginTop: mm(5), borderTopWidth: 1, borderColor: C.rule, paddingTop: mm(2.5), textAlign: "center" }} fixed>
                <Text style={{ fontSize: 7.5, color: C.muted }}>{m.footer}</Text>
              </View>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
}
