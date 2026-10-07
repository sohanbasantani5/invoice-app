// @react-pdf version of InvoicePaper. Same PaperModel, same tokens, vector text.
// Only ever loaded with dynamic import() so it stays out of the editor bundle.

import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import { templateTokens as t } from "@/lib/invoice/template-tokens";
import type { PaperAssets } from "../preview/invoice-paper";
import { SignatureBlock } from "./signature-block";

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
  Font.register({
    family: "Instrument Sans",
    fonts: [
      { src: `${base}/fonts/InstrumentSans-500.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/InstrumentSans-600.ttf`, fontWeight: 600 },
    ],
  });
  Font.register({ family: "JetBrains Mono", src: `${base}/fonts/JetBrainsMono-400.ttf` });
  Font.registerHyphenationCallback((w) => [w]);
}

const mm = (n: number) => n * 2.8346; // mm → pt

const s = StyleSheet.create({
  page: { padding: mm(t.marginMm), fontFamily: "Inter", fontSize: t.base, color: t.ink, lineHeight: 1.45 },
  row: { flexDirection: "row" },
  ink2: { color: t.ink2 },
  mono: { fontFamily: "JetBrains Mono", fontSize: t.small },
  label: { fontSize: t.tiny, color: t.ink3, letterSpacing: 0.6, textTransform: "uppercase" },
  th: { fontSize: t.tiny, color: t.ink3, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 500 },
  num: { textAlign: "right" },
});

function Party({ p }: { p: PaperParty }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.label, { marginBottom: mm(1.5) }]}>{p.label}</Text>
      <Text style={{ fontWeight: 600 }}>{p.name}</Text>
      {p.lines.map((l) => (
        <Text key={l} style={s.ink2}>
          {l}
        </Text>
      ))}
      {p.codes.map((c) => (
        <Text key={c} style={[s.mono, s.ink2]}>
          {c}
        </Text>
      ))}
    </View>
  );
}

export function InvoicePdf({ model: m, assets = {} }: { model: PaperModel; assets?: PaperAssets }) {
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
            <Text style={{ fontSize: 64, color: "#B4413A", opacity: 0.14, fontWeight: 600, transform: "rotate(-28deg)", letterSpacing: 6 }}>
              CANCELLED
            </Text>
          </View>
        )}

        {/* 1. Header */}
        <View style={[s.row, { justifyContent: "space-between" }]}>
          <View style={{ flex: 1, paddingRight: mm(8) }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
            {assets.logoUrl && <Image src={assets.logoUrl} style={{ maxHeight: 30, maxWidth: mm(50), objectFit: "contain", marginBottom: mm(3) }} />}
            <Text style={{ fontFamily: "Instrument Sans", fontSize: t.title, fontWeight: 600, lineHeight: 1.2 }}>{m.seller.name}</Text>
            {m.seller.legalName && <Text style={s.ink2}>{m.seller.legalName}</Text>}
            {m.seller.lines.map((l) => (
              <Text key={l} style={s.ink2}>
                {l}
              </Text>
            ))}
            {m.seller.codes && <Text style={[s.mono, s.ink2, { fontSize: 8.5, marginTop: mm(1) }]}>{m.seller.codes}</Text>}
            {m.seller.contact && <Text style={s.ink2}>{m.seller.contact}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: m.accent, fontSize: 8, letterSpacing: 1.6, fontWeight: 600 }}>{m.title}</Text>
            <Text style={{ fontFamily: "Instrument Sans", fontSize: t.number, fontWeight: 600, marginTop: mm(1) }}>{m.number}</Text>
          </View>
        </View>

        {/* 2. Meta strip */}
        <View style={[s.row, { marginTop: mm(8), borderWidth: 1, borderColor: t.rule }]}>
          {m.meta.map((x, i) => (
            <View key={x.label} style={{ flex: 1, paddingVertical: mm(2), paddingHorizontal: mm(3), borderLeftWidth: i ? 1 : 0, borderColor: t.rule }}>
              <Text style={s.label}>{x.label}</Text>
              <Text>{x.value}</Text>
            </View>
          ))}
        </View>

        {/* 3. Parties */}
        <View style={[s.row, { marginTop: mm(7), gap: mm(8) }]}>
          <Party p={m.billTo} />
          {m.shipTo ? <Party p={m.shipTo} /> : <View style={{ flex: 1 }} />}
        </View>

        {/* 4. Items */}
        <View style={{ marginTop: mm(7) }}>
          <View style={[s.row, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.ink, paddingVertical: mm(2) }]} fixed>
            {cols.map((c) => (
              <Text key={c.key} style={[s.th, cell(c.w, c.align)]}>
                {c.label}
              </Text>
            ))}
          </View>
          {m.rows.map((r) => (
            <View key={r.n} wrap={false} style={[s.row, { borderBottomWidth: 1, borderColor: t.rule, paddingVertical: mm(2.2) }]}>
              <Text style={[cell(cols[0].w, "left"), { color: t.ink3 }]}>{r.n}</Text>
              <View style={cell(0, "left")}>
                <Text style={{ fontWeight: 500 }}>{r.name}</Text>
                {r.description && <Text style={[s.ink2, { fontSize: t.small }]}>{r.description}</Text>}
                {r.sac && <Text style={[s.mono, { color: t.ink3 }]}>SAC {r.sac}</Text>}
              </View>
              {cols.slice(2).map((c) => (
                <Text key={c.key} style={[cell(c.w, "right"), c.key === "amount" ? { fontWeight: 500 } : {}]}>
                  {r[c.key as "qty" | "rate" | "discount" | "taxable" | "gst" | "amount"]}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* 5. Bottom */}
        <View style={[s.row, { marginTop: mm(6), gap: mm(10) }]} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Amount in words</Text>
            <Text style={{ fontWeight: 500 }}>{m.words}</Text>
            {(m.payment.lines.length > 0 || assets.qrDataUrl) && (
              <View style={[s.row, { marginTop: mm(5), gap: mm(5) }]}>
                {m.payment.lines.length > 0 && (
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { marginBottom: mm(1) }]}>Payment details</Text>
                    {m.payment.lines.map((l) => (
                      <View key={l.label} style={s.row}>
                        <Text style={{ color: t.ink3, width: mm(18) }}>{l.label}</Text>
                        <Text style={l.label === "Bank" || l.label === "A/C name" ? {} : [s.mono, { fontSize: 8.5 }]}>{l.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {assets.qrDataUrl && (
                  <View style={{ alignItems: "center" }}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
                    <Image src={assets.qrDataUrl} style={{ width: mm(24), height: mm(24) }} />
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={{ minWidth: mm(64) }}>
            {m.totals.map((r) => (
              <View
                key={r.label}
                style={[
                  s.row,
                  { justifyContent: "space-between", paddingVertical: mm(1.2) },
                  r.rule ? { borderTopWidth: 1.5, borderColor: t.ink, paddingTop: mm(2.5), marginTop: mm(1) } : {},
                ]}
              >
                <Text style={{ color: r.strong ? t.ink : t.ink2, fontWeight: r.strong ? 600 : 400, paddingRight: mm(6) }}>{r.label}</Text>
                <Text style={{ fontWeight: r.strong ? 600 : 400, fontSize: r.rule ? t.total : t.base, color: r.accent ? m.accent : t.ink }}>{r.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 6. Notes & terms */}
        {(m.notes || m.terms) && (
          <View style={[s.row, { marginTop: mm(7), gap: mm(8), fontSize: t.small, color: t.ink2 }]} wrap={false}>
            {m.notes && (
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Notes</Text>
                <Text>{m.notes}</Text>
              </View>
            )}
            {m.terms && (
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Terms</Text>
                <Text>{m.terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* 7. Signature, or the electronic-document notice */}
        <SignatureBlock model={m} assets={assets} />

        {/* 8. Footer */}
        <Text style={{ marginTop: mm(6), textAlign: "center", fontSize: t.tiny, color: t.ink3 }}>{m.footer}</Text>
      </Page>
    </Document>
  );
}
