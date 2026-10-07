"use client";

// Soft Pink Modern — crisp contemporary layout with hot pink left border stripe, clean sans-serif
// typography, subtle pink background tint, and sharp line dividers (distinct from Rose's centered serif style).

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { bg: "#fdf2f8", ink: "#831843", muted: "#9d174d", pink: "#db2777", pinkSoft: "#fce7f3", border: "#fbcfe8" };
const label = { fontSize: "7.5pt", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: C.pink, marginBottom: "1.5mm" } as const;

export function PinkModernPaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: C.bg, color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm", borderLeft: `6mm solid ${C.pink}` })}>
      {m.cancelled && <Cancelled />}

      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: "8mm", alignItems: "flex-start", paddingBottom: "6mm", borderBottom: `2px solid ${C.pink}` }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "3mm" }} />}
            <div style={{ fontSize: "16pt", fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{m.seller.name}</div>
            <SellerLines m={m} color={C.muted} style={{ fontSize: "8.5pt", marginTop: "1.5mm" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "22pt", fontWeight: 800, color: C.pink, lineHeight: 1, letterSpacing: "-0.01em" }}>{m.title}</div>
            <div style={{ fontSize: "12pt", fontWeight: 700, color: C.ink, marginTop: "2mm" }}>{m.number}</div>
          </div>
        </header>
      </Flash>

      {/* Meta Bar */}
      <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "5mm" }}>
        <div style={{ background: C.pinkSoft, padding: "3mm 5mm", borderRadius: "1.5mm", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "4mm", border: `1px solid ${C.border}` }}>
          {m.meta.map((x) => (
            <div key={x.label} style={{ display: "flex", gap: "2mm", fontSize: "8.5pt" }}>
              <span style={{ color: C.muted, fontWeight: 600 }}>{x.label}:</span>
              <span style={{ fontWeight: 700, color: C.ink }}>{x.value}</span>
            </div>
          ))}
        </div>
      </Flash>

      {/* Parties */}
      <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "6mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "8mm" }}>
          <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt", color: C.ink }} muted={C.muted} />
          {m.shipTo && <PartyBlock p={m.shipTo} label={label} name={{ color: C.ink }} muted={C.muted} />}
        </div>
      </Flash>

      {/* Items */}
      <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "7mm" }}>
        <ItemsTable
          m={m}
          s={{
            head: { background: C.pink, color: "#fff" },
            th: { fontSize: "7.5pt", letterSpacing: "0.1em", textTransform: "uppercase", color: "#fff", padding: "3mm 3mm" },
            row: (_i, last) => ({ borderBottom: last ? `2px solid ${C.pink}` : `1px solid ${C.border}` }),
            muted: C.muted,
            index: (n) => <span style={{ color: C.pink, fontWeight: 700 }}>{n}</span>,
            pad: "3mm 3mm",
          }}
        />
      </Flash>

      {/* Totals & Payment */}
      <div style={{ marginTop: "7mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "10mm", alignItems: "start", breakInside: "avoid" }}>
        <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "5mm" }}>
          <div>
            <div style={label}>Amount in words</div>
            <div style={{ fontWeight: 700, color: C.ink }}>{m.words}</div>
          </div>
          <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
        </Flash>
        <Flash watch={m.totals} enabled={highlight}>
          <div style={{ background: C.pinkSoft, padding: "4mm 6mm", borderRadius: "1.5mm", border: `1px solid ${C.border}` }}>
            <TotalsList m={m} s={{ color: C.ink, muted: C.muted, accent: C.pink, rule: C.pink, width: "64mm" }} />
          </div>
        </Flash>
      </div>

      <div style={{ marginTop: "6mm" }}>
        <NotesTerms m={m} label={label} color={C.muted} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8mm" }}>
        <SignatureArea m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.pink} />
      </div>

      <footer style={{ marginTop: "6mm", borderTop: `1px solid ${C.border}`, paddingTop: "3mm", textAlign: "center", fontSize: "7.5pt", color: C.muted }}>
        {m.footer}
      </footer>
    </article>
  );
}
