// Modern Studio — react-pdf twin of studio-paper.tsx.

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { CancelledPdf, ItemsTablePdf, LogoPdf, NotesTermsPdf, PartyPdf, PaymentPdf, SellerLinesPdf, SignaturePdf, TotalsPdf, mm, registerPdfFonts, row, type PdfTemplateProps } from "./pdf-parts";

const C = { black: "#111014", ink: "#1d1b22", muted: "#6b6776", purple: "#7b5cff", soft: "#b9a8ff", rule: "#e6e3ee", grey: "#b9b5c4", zebra: "#f6f4fa" };
const label = { fontSize: 6.5, letterSpacing: 1.2, textTransform: "uppercase" as const, fontWeight: 600, color: C.purple, marginBottom: mm(1.5) };
const PAD = { top: 12, x: 14 };

export function StudioPdf({ model: m, assets = {} }: PdfTemplateProps) {
  registerPdfFonts();
  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={{ fontFamily: "Inter", fontSize: 9, color: C.ink, lineHeight: 1.45, paddingTop: mm(PAD.top), paddingBottom: mm(18), paddingHorizontal: mm(PAD.x) }}>
        {m.cancelled && <CancelledPdf />}

        {/* Footer band on every page */}
        <View fixed style={[row, { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.black, paddingVertical: mm(3.5), paddingHorizontal: mm(PAD.x) }]}>
          <Text style={{ color: C.grey, fontSize: 7, flex: 1, paddingRight: mm(6) }}>{m.footer}</Text>
          <Text style={{ color: "#fff", fontSize: 7, fontWeight: 600 }} render={({ pageNumber, totalPages }) => `${m.number}  ·  ${pageNumber}/${totalPages}`} />
        </View>

        {/* Full-bleed header band */}
        <View style={{ marginTop: -mm(PAD.top), marginHorizontal: -mm(PAD.x) }}>
          <View style={[row, { backgroundColor: C.black, paddingTop: mm(12), paddingBottom: mm(10), paddingHorizontal: mm(PAD.x) }]}>
            <View style={{ flex: 1, paddingRight: mm(10) }}>
              {assets.logoUrl && (
                <View style={{ backgroundColor: "#fff", padding: mm(1.5), borderRadius: 3, alignSelf: "flex-start", marginBottom: mm(4) }}>
                  <LogoPdf url={assets.logoUrl} />
                </View>
              )}
              <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 15, color: "#fff", lineHeight: 1.2 }}>{m.seller.name}</Text>
              <SellerLinesPdf m={m} color={C.grey} style={{ fontSize: 8, marginTop: mm(1.5) }} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 24, color: "#fff", lineHeight: 1 }}>{m.title}</Text>
              <View style={{ marginTop: mm(3), backgroundColor: C.purple, borderRadius: 10, paddingVertical: mm(1.2), paddingHorizontal: mm(4) }}>
                <Text style={{ color: "#fff", fontWeight: 600, fontSize: 9.5 }}>No. {m.number}</Text>
              </View>
            </View>
          </View>
          <View style={{ height: mm(2.5), backgroundColor: C.purple }} />
        </View>

        {/* Info row */}
        <View style={[row, { marginTop: mm(9) }]} wrap={false}>
          <PartyPdf p={m.billTo} label={label} name={{ fontSize: 10.5 }} muted={C.muted} style={{ flex: 1.3, paddingRight: mm(6) }} />
          {m.shipTo && <PartyPdf p={m.shipTo} label={label} muted={C.muted} style={{ flex: 1, paddingRight: mm(6) }} />}
          <View style={{ flex: 1.1, borderLeftWidth: 2.5, borderColor: C.black, paddingLeft: mm(4) }}>
            {m.meta.map((x) => (
              <View key={x.label} style={[row, { justifyContent: "space-between", paddingVertical: mm(0.6) }]}>
                <Text style={{ color: C.muted, paddingRight: mm(3) }}>{x.label}</Text>
                <Text style={{ fontWeight: 600, textAlign: "right", flexShrink: 1 }}>{x.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: mm(8) }}>
          <ItemsTablePdf
            m={m}
            s={{
              head: { backgroundColor: C.black },
              th: { color: "#fff", letterSpacing: 0.8, textTransform: "uppercase" },
              row: (i) => ({ backgroundColor: i % 2 ? C.zebra : "#fff", borderBottomWidth: 0.75, borderColor: C.rule }),
              muted: C.muted,
              index: (n) => <Text style={{ color: C.purple, fontWeight: 600 }}>{String(n).padStart(2, "0")}</Text>,
            }}
          />
        </View>

        <View style={[row, { marginTop: mm(7), alignItems: "flex-start" }]} wrap={false}>
          <View style={{ flex: 1, paddingRight: mm(10) }}>
            <Text style={label}>Amount in words</Text>
            <Text style={{ fontWeight: 600, marginBottom: mm(5) }}>{m.words}</Text>
            <PaymentPdf m={m} assets={assets} label={label} muted={C.muted} />
          </View>
          <View style={{ backgroundColor: C.black, borderRadius: 4, paddingTop: mm(5), paddingHorizontal: mm(5), paddingBottom: mm(3) }}>
            <TotalsPdf
              m={m}
              s={{
                color: "#fff",
                muted: C.grey,
                accent: C.soft,
                width: 66,
                grand: { backgroundColor: C.purple, marginHorizontal: -mm(5), paddingHorizontal: mm(5), paddingTop: mm(3.5), paddingBottom: mm(3.5), marginTop: mm(3) },
                grandValue: { fontSize: 14 },
              }}
            />
          </View>
        </View>

        <View style={{ marginTop: mm(7) }}>
          <NotesTermsPdf m={m} label={label} color={C.muted} />
        </View>
        <View style={{ marginTop: mm(10) }}>
          <SignaturePdf m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.black} />
        </View>
      </Page>
    </Document>
  );
}
