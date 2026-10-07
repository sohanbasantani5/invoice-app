// react-pdf twins of html-parts.tsx. Only ever loaded through pdf-registry (dynamic import),
// so @react-pdf/renderer stays out of the editor bundle.

import type { ReactNode } from "react";
import { Font, Image, Text, View, type Styles } from "@react-pdf/renderer";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import type { PaperAssets } from "../preview/invoice-paper";
import { cellText, itemCols, type ItemCol } from "./cols";

export type { PaperAssets };
export type PdfTemplateProps = { model: PaperModel; assets?: PaperAssets };
type S = Styles[string];

export const mm = (n: number) => n * 2.8346; // mm → pt

let fontBase: string | null = null;
/** Tests render PDFs in Node, where there is no window.location; they point this at /public. */
export function setPdfFontBase(base: string) {
  fontBase = base;
}

let registered = false;
export function registerPdfFonts() {
  if (registered) return;
  registered = true;
  const base = fontBase ?? (typeof window !== "undefined" ? window.location.origin : "");
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

export const row: S = { flexDirection: "row" };

export function CancelledPdf() {
  return (
    <View fixed style={{ position: "absolute", top: mm(130), left: 0, right: 0, alignItems: "center" }}>
      <Text style={{ fontFamily: "Inter", fontSize: 64, color: "#B4413A", opacity: 0.14, fontWeight: 600, transform: "rotate(-28deg)", letterSpacing: 6 }}>CANCELLED</Text>
    </View>
  );
}

export function LogoPdf({ url, maxH = 14, maxW = 48, style }: { url?: string | null; maxH?: number; maxW?: number; style?: S }) {
  if (!url) return null;
  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt
  return <Image src={url} style={[{ maxHeight: mm(maxH), maxWidth: mm(maxW), objectFit: "contain" }, style ?? {}]} />;
}

export function SellerLinesPdf({ m, color, style }: { m: PaperModel; color: string; style?: S }) {
  const s = m.seller;
  return (
    <View style={style}>
      {s.legalName && <Text style={{ color }}>{s.legalName}</Text>}
      {s.lines.map((l) => (
        <Text key={l} style={{ color }}>
          {l}
        </Text>
      ))}
      {s.codes && <Text style={{ color, fontFamily: "JetBrains Mono", fontSize: 7.5 }}>{s.codes}</Text>}
      {s.contact && <Text style={{ color }}>{s.contact}</Text>}
    </View>
  );
}

export function PartyPdf({ p, label, name, muted, hideLabel, style }: { p: PaperParty; label?: S; name?: S; muted: string; hideLabel?: boolean; style?: S }) {
  return (
    <View style={style}>
      {!hideLabel && <Text style={label}>{p.label}</Text>}
      <Text style={[{ fontWeight: 600 }, name ?? {}]}>{p.name}</Text>
      {p.lines.map((l) => (
        <Text key={l} style={{ color: muted }}>
          {l}
        </Text>
      ))}
      {p.codes.map((c) => (
        <Text key={c} style={{ color: muted, fontFamily: "JetBrains Mono", fontSize: 7.5 }}>
          {c}
        </Text>
      ))}
    </View>
  );
}

export type ItemsTablePdfStyle = {
  head?: S;
  th?: S;
  row?: (i: number, last: boolean) => S;
  td?: S;
  amount?: S;
  muted: string;
  index?: (n: number) => ReactNode;
  padV?: number;
};

const colBox = (c: ItemCol, padH: number): S => (c.mm ? { width: mm(c.mm), paddingHorizontal: padH } : { flex: 1, paddingHorizontal: padH });

export function ItemsTablePdf({ m, s }: { m: PaperModel; s: ItemsTablePdfStyle }) {
  const cols = itemCols(m);
  const padV = mm(s.padV ?? 2.2);
  const padH = mm(1.4);
  return (
    <View>
      <View style={[row, s.head ?? {}]} wrap={false}>
        {cols.map((c) => (
          <Text key={c.key} style={[colBox(c, padH), { paddingVertical: padV, textAlign: c.align, fontWeight: 600, fontSize: 7.5 }, s.th ?? {}]}>
            {c.label}
          </Text>
        ))}
      </View>
      {m.rows.length === 0 && <Text style={{ padding: mm(4), textAlign: "center", color: s.muted }}>Your items will appear here.</Text>}
      {m.rows.map((r, i) => (
        <View key={r.n} style={[row, s.row?.(i, i === m.rows.length - 1) ?? {}]} wrap={false}>
          {cols.map((c) => (
            <View key={c.key} style={[colBox(c, padH), { paddingVertical: padV }]}>
              {c.key === "desc" ? (
                <>
                  <Text style={[{ fontWeight: 600 }, s.td ?? {}]}>{r.name}</Text>
                  {r.description && <Text style={{ color: s.muted, fontSize: 8 }}>{r.description}</Text>}
                  {r.sac && <Text style={{ color: s.muted, fontSize: 7.5 }}>HSN/SAC {r.sac}</Text>}
                </>
              ) : c.key === "n" ? (
                s.index ? s.index(r.n) : <Text style={{ color: s.muted }}>{r.n}</Text>
              ) : (
                <Text style={[{ textAlign: c.align }, s.td ?? {}, c.key === "amount" ? [{ fontWeight: 600 }, s.amount ?? {}] : {}]}>{cellText(r, c.key)}</Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export type TotalsPdfStyle = { color: string; muted: string; accent: string; rule?: string; grand?: S; grandLabel?: S; grandValue?: S; rowStyle?: S; width?: number };

export function TotalsPdf({ m, s }: { m: PaperModel; s: TotalsPdfStyle }) {
  return (
    <View style={{ width: mm(s.width ?? 68) }} wrap={false}>
      {m.totals.map((r) =>
        r.rule ? (
          <View
            key={r.label}
            style={[row, { justifyContent: "space-between", alignItems: "flex-end", marginTop: mm(1.5), paddingTop: mm(2.5), paddingBottom: mm(1) }, s.rule ? { borderTopWidth: 1.2, borderColor: s.rule } : {}, s.grand ?? {}]}
          >
            <Text style={[{ fontWeight: 600, color: s.color }, s.grandLabel ?? {}]}>{r.label}</Text>
            <Text style={[{ fontWeight: 600, fontSize: 12.5, color: s.color }, s.grandValue ?? {}]}>{r.value}</Text>
          </View>
        ) : (
          <View key={r.label} style={[row, { justifyContent: "space-between", paddingVertical: mm(0.9) }, s.rowStyle ?? {}]}>
            <Text style={{ color: r.strong ? s.color : s.muted, fontWeight: r.strong ? 600 : 400 }}>{r.label}</Text>
            <Text style={{ color: r.accent ? s.accent : s.color, fontWeight: r.strong ? 600 : 400 }}>{r.value}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function hasPaymentPdf(m: PaperModel, assets: PaperAssets) {
  return m.payment.lines.length > 0 || !!(assets.qrDataUrl && m.payment.upiCaption);
}

export function PaymentPdf({ m, assets, label, muted, title = "Payment details", qr = 22, color }: { m: PaperModel; assets: PaperAssets; label?: S; muted: string; title?: string; qr?: number; color?: string }) {
  if (!hasPaymentPdf(m, assets)) return null;
  return (
    <View style={[row, { alignItems: "flex-start" }]} wrap={false}>
      {m.payment.lines.length > 0 && (
        <View style={{ flex: 1, paddingRight: mm(4) }}>
          {title ? <Text style={label}>{title}</Text> : null}
          {m.payment.lines.map((l) => (
            <View key={l.label} style={row}>
              <Text style={{ color: muted, width: mm(18) }}>{l.label}</Text>
              <Text style={{ flex: 1, color }}>{l.value}</Text>
            </View>
          ))}
        </View>
      )}
      {assets.qrDataUrl && m.payment.upiCaption && (
        <View style={{ alignItems: "center", width: mm(qr + 6) }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          <Image src={assets.qrDataUrl} style={{ width: mm(qr), height: mm(qr), backgroundColor: "#fff", padding: mm(1) }} />
          <Text style={{ fontSize: 6.5, color: muted, marginTop: mm(1), textAlign: "center" }}>{m.payment.upiCaption}</Text>
        </View>
      )}
    </View>
  );
}

export function NotesTermsPdf({ m, label, color, stacked }: { m: PaperModel; label?: S; color: string; stacked?: boolean }) {
  if (!m.notes && !m.terms) return null;
  const side = !stacked && m.notes && m.terms;
  return (
    <View style={[side ? row : {}, { fontSize: 8, color }]}>
      {m.notes && (
        <View style={side ? { flex: 1, paddingRight: mm(6) } : { marginBottom: mm(2) }}>
          <Text style={label}>Notes</Text>
          <Text>{m.notes}</Text>
        </View>
      )}
      {m.terms && (
        <View style={side ? { flex: 1 } : {}}>
          <Text style={label}>Terms</Text>
          <Text>{m.terms}</Text>
        </View>
      )}
    </View>
  );
}

export function SignaturePdf({ m, assets, color, muted, rule, align = "flex-end", noticeStyle }: { m: PaperModel; assets: PaperAssets; color?: string; muted: string; rule: string; align?: "flex-end" | "flex-start" | "center"; noticeStyle?: S }) {
  const s = m.signature;
  if (!s.enabled)
    return (
      <View wrap={false}>
        <Text style={[{ fontSize: 8, color: muted }, noticeStyle ?? {}]}>{s.notice}</Text>
      </View>
    );
  return (
    <View style={{ alignItems: align }} wrap={false}>
      <View style={{ width: mm(56), alignItems: "center" }}>
        <Text style={{ fontSize: 8, color: color ?? muted, textAlign: "center" }}>{s.forLine}</Text>
        <View style={{ height: mm(16), justifyContent: "center" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt */}
          {assets.signatureUrl && <Image src={assets.signatureUrl} style={{ maxHeight: mm(14), maxWidth: mm(46), objectFit: "contain" }} />}
        </View>
        <Text style={{ width: "100%", textAlign: "center", borderTopWidth: 1, borderColor: rule, paddingTop: mm(1), fontSize: 8, color: muted }}>Authorised signatory</Text>
      </View>
    </View>
  );
}

export function initialPdf(m: PaperModel) {
  return (m.seller.name.trim()[0] ?? "•").toUpperCase();
}
