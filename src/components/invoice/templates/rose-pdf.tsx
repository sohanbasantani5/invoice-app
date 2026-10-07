import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import { templateTokens as t } from "@/lib/invoice/template-tokens";
import type { PaperAssets } from "../preview/invoice-paper";
import { SignatureBlock } from "../pdf/signature-block";

let registered = false;
function registerFonts() {
  if (registered) return;
  registered = true;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${base}/fonts/Inter-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/Inter-500.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/Inter-600.ttf`, fontWeight: 600 },
    ],
  });
  // Substitute Georgia with a standard serif font in PDF or just use a built-in serif font like Times-Roman
  Font.register({ family: "JetBrains Mono", src: `${base}/fonts/JetBrainsMono-400.ttf` });
  Font.registerHyphenationCallback((w) => [w]);
}

const mm = (n: number) => n * 2.8346;

const s = StyleSheet.create({
  page: { padding: mm(t.marginMm), fontFamily: "Times-Roman", fontSize: t.base, color: "#4a3c3d", lineHeight: 1.5, backgroundColor: "#fff5f7" },
  row: { flexDirection: "row" },
  mono: { fontFamily: "JetBrains Mono", fontSize: t.small },
  label: { fontSize: t.tiny, color: "#b36b76", letterSpacing: 0.6, textTransform: "uppercase" },
  th: { fontSize: t.tiny, color: "#b36b76", letterSpacing: 0.4, textTransform: "uppercase", fontWeight: "bold" },
  num: { textAlign: "right", fontFamily: "Inter" }, // use Inter for numbers to align properly
  card: { backgroundColor: "#fff0f3", padding: mm(5), borderRadius: 8, border: "1px solid #ffe4e8" },
  textMuted: { color: "#7a6a6b" }
});

function Party({ p }: { p: PaperParty }) {
  return (
    <View style={[s.card, { flex: 1 }]}>
      <Text style={[s.label, { marginBottom: mm(1.5), fontFamily: "Inter", fontWeight: 600 }]}>{p.label}</Text>
      <Text style={{ fontWeight: "bold", fontFamily: "Inter" }}>{p.name}</Text>
      {p.lines.map((l) => (
        <Text key={l} style={[s.textMuted, { fontFamily: "Inter", fontSize: t.small }]}>
          {l}
        </Text>
      ))}
      {p.codes.map((c) => (
        <Text key={c} style={[s.mono, s.textMuted]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

export function RosePdf({ model: m, assets = {} }: { model: PaperModel; assets?: PaperAssets }) {
  registerFonts();
  const cols = [
    { key: "n", label: "#", w: mm(7), align: "left" as const },
    { key: "desc", label: "Description", w: 0, align: "left" as const },
    { key: "qty", label: "Qty", w: mm(16), align: "right" as const },
    { key: "rate", label: "Rate", w: mm(22), align: "right" as const },
    ...(m.showDiscount ? [{ key: "discount", label: "Disc.", w: mm(18), align: "right" as const }] : []),
    ...(m.showGst
      ? [
          { key: "taxable", label: "Taxable", w: mm(22), align: "right" as const },
          { key: "gst", label: "GST", w: mm(11), align: "right" as const },
        ]
      : []),
    { key: "amount", label: "Amount", w: mm(24), align: "right" as const },
  ];
  const cell = (w: number, align: "left" | "right") =>
    w ? { width: w, textAlign: align, paddingLeft: align === "right" ? mm(2) : 0 } : { flex: 1, paddingRight: mm(2) };

  return (
    <Document title={`${m.title} ${m.number}`} author={m.seller.name} creator="Invoices" producer="Invoices">
      <Page size="A4" style={s.page}>
        {m.cancelled && (
          <View fixed style={{ position: "absolute", top: mm(130), left: 0, right: 0, alignItems: "center" }}>
            <Text style={{ fontSize: 64, color: "#B4413A", opacity: 0.14, fontWeight: "bold", transform: "rotate(-28deg)", letterSpacing: 6 }}>
              CANCELLED
            </Text>
          </View>
        )}

        {/* 1. Header (Centered) */}
        <View style={{ alignItems: "center", borderBottom: "1px solid #ffe4e8", paddingBottom: mm(5) }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          {assets.logoUrl && <Image src={assets.logoUrl} style={{ maxHeight: 30, maxWidth: mm(50), objectFit: "contain", marginBottom: mm(4) }} />}
          <Text style={{ fontSize: t.title, fontWeight: "bold", fontFamily: "Times-Roman" }}>{m.seller.name}</Text>
          {m.seller.legalName && <Text style={[s.textMuted, { fontFamily: "Inter", fontSize: t.small }]}>{m.seller.legalName}</Text>}
          
          <View style={[s.row, { flexWrap: "wrap", justifyContent: "center", marginTop: mm(1) }]}>
            {m.seller.lines.map((l, i) => (
              <Text key={l} style={[s.textMuted, { fontFamily: "Inter", fontSize: t.small }]}>
                {l}{i < m.seller.lines.length - 1 ? "  •  " : ""}
              </Text>
            ))}
          </View>
          
          <View style={{ alignItems: "center", marginTop: mm(4) }}>
            <Text style={{ color: "#c76574", fontSize: 10, letterSpacing: 2, fontWeight: "bold", fontFamily: "Inter", textTransform: "uppercase" }}>{m.title}</Text>
            <Text style={{ fontSize: t.number, fontWeight: "bold", marginTop: mm(1), fontFamily: "Times-Roman" }}>{m.number}</Text>
          </View>
        </View>

        {/* 2. Meta strip (Minimal centered) */}
        <View style={[s.row, { justifyContent: "center", flexWrap: "wrap", marginTop: mm(4) }]}>
          {m.meta.map((x, i) => (
            <View key={x.label} style={[s.row, { alignItems: "center" }]}>
              <Text style={[s.th, { fontFamily: "Inter" }]}>{x.label}: </Text>
              <Text style={{ fontFamily: "Inter", fontSize: t.small, marginLeft: mm(1) }}>{x.value}</Text>
              {i < m.meta.length - 1 && <Text style={{ color: "#ffe4e8", marginHorizontal: mm(2) }}>|</Text>}
            </View>
          ))}
        </View>

        {/* 3. Parties */}
        <View style={[s.row, { gap: mm(8), marginTop: mm(8) }]}>
          <Party p={m.billTo} />
          {m.shipTo ? <Party p={m.shipTo} /> : <View style={{ flex: 1 }} />}
        </View>

        {/* 4. Items */}
        <View style={{ marginTop: mm(8) }}>
          <View style={[s.row, { backgroundColor: "#ffe4e8", borderRadius: 8, paddingVertical: mm(3) }]}>
            {cols.map((c, i) => (
              <Text key={c.key} style={[s.th, { fontFamily: "Inter" }, cell(c.w, c.align), i === 0 ? { paddingLeft: mm(2) } : {} ]}>
                {c.label}
              </Text>
            ))}
          </View>
          <View style={{ fontSize: t.small, fontFamily: "Inter" }}>
            {m.rows.map((r, i) => (
              <View key={r.n} style={[s.row, { borderBottom: i === m.rows.length - 1 ? "none" : "1px solid #ffe4e8" }]}>
                {cols.map((c, ci) => (
                  <View key={c.key} style={[cell(c.w, c.align), { paddingTop: mm(3), paddingBottom: mm(3) }, ci === 0 ? { paddingLeft: mm(2) } : {} ]}>
                    {c.key === "desc" ? (
                      <>
                        <Text style={{ fontWeight: 600, color: "#4a3c3d" }}>{r.name}</Text>
                        {r.description && <Text style={[s.textMuted, { marginTop: mm(1) }]}>{r.description}</Text>}
                        {r.sac && <Text style={[s.textMuted, { marginTop: mm(1) }]}>SAC/HSN: {r.sac}</Text>}
                      </>
                    ) : c.key === "n" ? (
                      <Text style={s.textMuted}>{r.n}</Text>
                    ) : (
                      <Text style={[s.num, c.key === "amount" ? { fontWeight: 600 } : {}]}>{r[c.key as keyof typeof r]}</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Totals & Notes Row */}
        <View style={[s.row, { justifyContent: "space-between", marginTop: "auto", paddingTop: mm(8) }]} wrap={false}>
          {/* 5. Left */}
          <View style={{ flex: 1, paddingRight: mm(12) }}>
            {m.words && (
              <View style={{ marginBottom: mm(4) }}>
                <Text style={[s.th, { fontFamily: "Inter" }]}>Total in words</Text>
                <Text style={{ fontWeight: 600, fontFamily: "Inter", fontSize: t.small }}>{m.words}</Text>
              </View>
            )}
            {(m.payment.lines.length > 0 || m.payment.upiText) && (
              <View style={[s.row, s.card, { marginBottom: mm(4) }]}>
                {m.payment.lines.length > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={[s.th, { marginBottom: mm(1.5), fontFamily: "Inter" }]}>Payment Details</Text>
                    {m.payment.lines.map((l) => (
                      <View key={l.label} style={[s.row, { fontSize: t.small, fontFamily: "Inter" }]}>
                        <Text style={s.textMuted}>{l.label}: </Text>
                        <Text style={[s.mono, { fontWeight: 500 }]}>{l.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {assets.qrDataUrl && m.payment.upiCaption && (
                  <View style={{ alignItems: "center", marginLeft: mm(4) }}>
                    <Image src={assets.qrDataUrl} style={{ width: mm(22), height: mm(22) }} />
                    <Text style={{ fontSize: 6.5, color: "#7a6a6b", marginTop: mm(1), fontFamily: "Inter" }}>{m.payment.upiCaption}</Text>
                  </View>
                )}
              </View>
            )}
            {m.notes && (
              <View style={{ marginBottom: mm(3) }}>
                <Text style={[s.th, { fontFamily: "Inter" }]}>Notes</Text>
                <Text style={[s.textMuted, { fontSize: t.small, fontFamily: "Inter" }]}>{m.notes}</Text>
              </View>
            )}
            {m.terms && (
              <View>
                <Text style={[s.th, { fontFamily: "Inter" }]}>Terms & Conditions</Text>
                <Text style={[s.textMuted, { fontSize: t.small, fontFamily: "Inter" }]}>{m.terms}</Text>
              </View>
            )}
          </View>

          {/* 6. Right */}
          <View style={[s.card, { width: mm(80) }]}>
            {m.totals.map((tr, i) => (
              <View
                key={i}
                style={[
                  s.row,
                  {
                    justifyContent: "space-between",
                    paddingTop: tr.rule ? mm(2) : 0,
                    borderTop: tr.rule ? "1px solid #ffe4e8" : "none",
                    marginTop: tr.rule ? mm(2) : mm(1),
                  },
                ]}
              >
                <Text style={{ fontFamily: "Inter", fontSize: tr.strong ? t.base : t.small, fontWeight: tr.strong ? 600 : 400, color: tr.accent ? "#c76574" : "#4a3c3d" }}>
                  {tr.label}
                </Text>
                <Text style={[s.num, { fontSize: tr.strong ? t.base : t.small, fontWeight: tr.strong ? 600 : 400, color: tr.accent ? "#c76574" : "#4a3c3d" }]}>
                  {tr.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 7. Signatory & Footer */}
        <View style={[s.row, { justifyContent: "space-between", alignItems: "flex-end", marginTop: mm(10) }]} wrap={false}>
          <View style={{ fontSize: 8, color: "#7a6a6b", fontFamily: "Inter" }}>
            {m.signature.enabled ? null : <Text style={{ fontStyle: "italic" }}>{m.signature.notice}</Text>}
          </View>
          {m.signature.enabled && (
            <View style={{ width: mm(60) }}>
              <SignatureBlock model={m} assets={assets} />
            </View>
          )}
        </View>

        <View style={{ marginTop: mm(6), textAlign: "center", borderTop: "1px solid #ffe4e8", paddingTop: mm(4) }} fixed>
          <Text style={{ fontSize: 8, color: "#b36b76", fontFamily: "Inter" }}>{m.footer}</Text>
        </View>
      </Page>
    </Document>
  );
}
