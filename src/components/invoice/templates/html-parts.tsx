"use client";

// Presentation building blocks for the HTML previews of the new templates. They only READ the
// PaperModel — no calculations here. Each template composes these in its own layout.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import type { PaperAssets } from "../preview/invoice-paper";
import { cellText, itemCols } from "./cols";

export type { PaperAssets };
export type TemplateProps = { model: PaperModel; assets?: PaperAssets; highlight?: boolean };

/** A4 sheet. `padding` 0 lets a template draw full-bleed bands itself. */
export function sheet(style: CSSProperties): CSSProperties {
  return { width: "210mm", minHeight: "297mm", position: "relative", display: "flex", flexDirection: "column", overflow: "hidden", lineHeight: 1.45, ...style };
}

/** Accent wash on the region that just changed (same behaviour as the Classic template). */
export function Flash({ watch, enabled, children, style }: { watch: unknown; enabled?: boolean; children: ReactNode; style?: CSSProperties }) {
  const key = JSON.stringify(watch);
  const prev = useRef(key);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled || prev.current === key) return;
    prev.current = key;
    const id = setTimeout(() => setN((x) => x + 1), 400);
    return () => clearTimeout(id);
  }, [key, enabled]);
  return (
    <div style={{ position: "relative", ...style }}>
      {n > 0 && <span key={n} aria-hidden className="paper-flash pointer-events-none absolute -inset-[1.5mm] rounded-[1mm]" />}
      {children}
    </div>
  );
}

export function Cancelled() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden">
      <span style={{ color: "#B4413A", opacity: 0.14, fontSize: "64pt", fontWeight: 600, transform: "rotate(-28deg)", letterSpacing: "0.1em" }}>CANCELLED</span>
    </div>
  );
}

export function Logo({ url, maxH = "14mm", maxW = "48mm", style }: { url?: string | null; maxH?: string; maxW?: string; style?: CSSProperties }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- signed storage URL / data URL
  return <img src={url} alt="" style={{ maxHeight: maxH, maxWidth: maxW, objectFit: "contain", display: "block", ...style }} />;
}

const wrap: CSSProperties = { overflowWrap: "anywhere" };

/** Seller address / GSTIN / contact lines (business name is drawn by each template). */
export function SellerLines({ m, color, codeColor, style }: { m: PaperModel; color: string; codeColor?: string; style?: CSSProperties }) {
  const s = m.seller;
  return (
    <div style={{ color, ...wrap, ...style }}>
      {s.legalName && <div>{s.legalName}</div>}
      {s.lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
      {s.codes && <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "8pt", color: codeColor ?? color }}>{s.codes}</div>}
      {s.contact && <div>{s.contact}</div>}
    </div>
  );
}

export function PartyBlock({ p, label, name, muted, hideLabel }: { p: PaperParty; label?: CSSProperties; name?: CSSProperties; muted: string; hideLabel?: boolean }) {
  return (
    <div style={{ minWidth: 0, ...wrap }}>
      {!hideLabel && <div style={label}>{p.label}</div>}
      <div style={{ fontWeight: 600, ...name }}>{p.name}</div>
      {p.lines.map((l) => (
        <div key={l} style={{ color: muted }}>
          {l}
        </div>
      ))}
      {p.codes.map((c) => (
        <div key={c} style={{ color: muted, fontFamily: "var(--font-mono, monospace)", fontSize: "8pt" }}>
          {c}
        </div>
      ))}
    </div>
  );
}

export type ItemsTableStyle = {
  head?: CSSProperties;
  th?: CSSProperties;
  row?: (i: number, last: boolean) => CSSProperties;
  td?: CSSProperties;
  amount?: CSSProperties;
  muted: string;
  index?: (n: number) => ReactNode;
  pad?: string;
};

export function ItemsTable({ m, s }: { m: PaperModel; s: ItemsTableStyle }) {
  const cols = itemCols(m);
  const pad = s.pad ?? "2.4mm 2mm";
  return (
    <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
      <thead style={{ display: "table-header-group" }}>
        <tr style={s.head}>
          {cols.map((c) => (
            <th key={c.key} style={{ padding: pad, textAlign: c.align, fontWeight: 600, whiteSpace: "nowrap", width: c.mm ? undefined : "100%", ...s.th }}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {m.rows.length === 0 && (
          <tr>
            <td colSpan={cols.length} style={{ padding: "4mm", textAlign: "center", color: s.muted }}>
              Your items will appear here.
            </td>
          </tr>
        )}
        {m.rows.map((r, i) => (
          <tr key={r.n} style={{ breakInside: "avoid", ...s.row?.(i, i === m.rows.length - 1) }}>
            {cols.map((c) => (
              <td
                key={c.key}
                style={{
                  padding: pad,
                  verticalAlign: "top",
                  textAlign: c.align,
                  whiteSpace: c.key === "desc" ? undefined : "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  ...s.td,
                  ...(c.key === "amount" ? { fontWeight: 600, ...s.amount } : null),
                }}
              >
                {c.key === "desc" ? (
                  <div style={wrap}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    {r.description && <div style={{ color: s.muted, fontSize: "8.5pt", whiteSpace: "pre-line" }}>{r.description}</div>}
                    {r.sac && <div style={{ color: s.muted, fontSize: "8pt" }}>HSN/SAC {r.sac}</div>}
                  </div>
                ) : c.key === "n" ? (
                  s.index ? s.index(r.n) : <span style={{ color: s.muted }}>{r.n}</span>
                ) : (
                  cellText(r, c.key)
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export type TotalsStyle = {
  color: string;
  muted: string;
  accent: string;
  rule?: string;
  /** Style of the grand-total row (the row with `rule`). */
  grand?: CSSProperties;
  grandValue?: CSSProperties;
  row?: CSSProperties;
  width?: string;
};

export function TotalsList({ m, s }: { m: PaperModel; s: TotalsStyle }) {
  return (
    <div style={{ minWidth: s.width ?? "66mm", breakInside: "avoid" }}>
      {m.totals.map((r) =>
        r.rule ? (
          <div
            key={r.label}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "6mm", marginTop: "1.5mm", padding: "2.5mm 0 1mm", borderTop: s.rule ? `1.5px solid ${s.rule}` : undefined, fontWeight: 600, color: s.color, ...s.grand }}
          >
            <span>{r.label}</span>
            <span style={{ fontSize: "13pt", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", ...s.grandValue }}>{r.value}</span>
          </div>
        ) : (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: "6mm", padding: "1mm 0", color: r.strong ? s.color : s.muted, fontWeight: r.strong ? 600 : 400, ...s.row }}>
            <span>{r.label}</span>
            <span style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", color: r.accent ? s.accent : s.color }}>{r.value}</span>
          </div>
        ),
      )}
    </div>
  );
}

export function hasPayment(m: PaperModel, assets: PaperAssets) {
  return m.payment.lines.length > 0 || !!assets.qrDataUrl;
}

export function PaymentInfo({ m, assets, label, muted, title = "Payment details", qr = "22mm" }: { m: PaperModel; assets: PaperAssets; label?: CSSProperties; muted: string; title?: string; qr?: string }) {
  if (!hasPayment(m, assets)) return null;
  return (
    <div style={{ display: "flex", gap: "5mm", alignItems: "flex-start", breakInside: "avoid" }}>
      {m.payment.lines.length > 0 && (
        <div style={{ minWidth: 0, flex: 1 }}>
          {title && <div style={label}>{title}</div>}
          {m.payment.lines.map((l) => (
            <div key={l.label} style={{ display: "flex", gap: "2mm" }}>
              <span style={{ color: muted, minWidth: "17mm", flexShrink: 0 }}>{l.label}</span>
              <span style={wrap}>{l.value}</span>
            </div>
          ))}
        </div>
      )}
      {assets.qrDataUrl && (
        <div style={{ flexShrink: 0, textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
          <img src={assets.qrDataUrl} alt="UPI QR code" style={{ width: qr, height: qr, background: "#fff", padding: "1mm" }} />
        </div>
      )}
    </div>
  );
}

export function NotesTerms({ m, label, color, gap = "6mm", stacked }: { m: PaperModel; label?: CSSProperties; color: string; gap?: string; stacked?: boolean }) {
  if (!m.notes && !m.terms) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: stacked || !(m.notes && m.terms) ? "1fr" : "1fr 1fr", gap, color, fontSize: "8.5pt" }}>
      {m.notes && (
        <div style={wrap}>
          <div style={label}>Notes</div>
          <div style={{ whiteSpace: "pre-line" }}>{m.notes}</div>
        </div>
      )}
      {m.terms && (
        <div style={wrap}>
          <div style={label}>Terms</div>
          <div style={{ whiteSpace: "pre-line" }}>{m.terms}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Signature ON  → "For {business}", the uploaded image (or space to sign), "Authorised signatory".
 * Signature OFF → exactly the electronic-document notice from lib/invoice/signature.ts.
 */
export function SignatureArea({ m, assets, color, muted, rule, align = "flex-end", noticeStyle }: { m: PaperModel; assets: PaperAssets; color?: string; muted: string; rule: string; align?: CSSProperties["justifyContent"]; noticeStyle?: CSSProperties }) {
  const s = m.signature;
  if (!s.enabled) return <p style={{ fontSize: "8pt", color: muted, breakInside: "avoid", ...noticeStyle }}>{s.notice}</p>;
  return (
    <div style={{ display: "flex", justifyContent: align, breakInside: "avoid" }}>
      <div style={{ width: "50mm", textAlign: "center", color: color ?? muted }}>
        <div style={{ fontSize: "7.5pt", letterSpacing: "0.06em", color: muted, ...wrap }}>{s.forLine}</div>
        <div style={{ height: "12mm", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "1mm 0 0.8mm" }}>
          {assets.signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img src={assets.signatureUrl} alt="Signature" style={{ maxHeight: "10mm", maxWidth: "36mm", objectFit: "contain" }} />
          )}
        </div>
        <div style={{ borderTop: `1px solid ${rule}`, paddingTop: "1mm", fontSize: "7.5pt", letterSpacing: "0.08em", fontWeight: 500, color: muted }}>
          Authorised signatory
        </div>
      </div>
    </div>
  );
}

/** First letter of the business name, for templates that draw a monogram when there is no logo. */
export function initial(m: PaperModel) {
  return (m.seller.name.trim()[0] ?? "•").toUpperCase();
}
