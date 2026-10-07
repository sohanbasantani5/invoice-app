"use client";

// Elegant Classic — traditional formal invoice structure with double borders, serif header
// typography, soft blush accents, and refined classical spacing.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { ink: "#292524", muted: "#57534e", accent: "#9f1239", soft: "#fff1f2", rule: "#e7e5e4", border: "#fecdd3" };
const label = { fontSize: "7.5pt", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: C.accent, marginBottom: "1.5mm" } as const;

export function ElegantPaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: "#ffffff", color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm", fontFamily: "Georgia, serif" })}>
      {m.cancelled && <Cancelled />}

      {/* Formal Double Border Frame */}
      <div style={{ border: `1px solid ${C.ink}`, padding: "2mm", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        <div style={{ border: `1px solid ${C.ink}`, padding: "10mm 12mm", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
          
          <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
            <header style={{ display: "flex", justifyContent: "space-between", gap: "8mm", alignItems: "flex-start", paddingBottom: "6mm", borderBottom: `2px double ${C.ink}` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "3mm" }} />}
                <div style={{ fontSize: "18pt", fontWeight: 700, color: C.ink, fontFamily: "Georgia, serif", lineHeight: 1.15 }}>{m.seller.name}</div>
                <SellerLines m={m} color={C.muted} style={{ fontSize: "8.5pt", marginTop: "1.5mm", fontFamily: "sans-serif" }} />
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "14pt", fontWeight: 700, color: C.accent, letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>{m.title}</div>
                <div style={{ fontSize: "11pt", fontWeight: 600, color: C.ink, marginTop: "2mm", fontFamily: "sans-serif" }}>Nº {m.number}</div>
              </div>
            </header>
          </Flash>

          {/* Meta Grid */}
          <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "5mm" }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${m.meta.length}, 1fr)`, border: `1px solid ${C.rule}`, background: C.soft }}>
              {m.meta.map((x, i) => (
                <div key={x.label} style={{ padding: "2.5mm 3mm", borderLeft: i ? `1px solid ${C.rule}` : undefined, fontFamily: "sans-serif" }}>
                  <div style={{ fontSize: "7pt", letterSpacing: "0.1em", color: C.accent, fontWeight: 700, textTransform: "uppercase" }}>{x.label}</div>
                  <div style={{ fontWeight: 600, fontSize: "9pt", marginTop: "0.5mm" }}>{x.value}</div>
                </div>
              ))}
            </div>
          </Flash>

          {/* Parties */}
          <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "6mm" }}>
            <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "8mm", fontFamily: "sans-serif" }}>
              <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt", fontFamily: "Georgia, serif", color: C.ink }} muted={C.muted} />
              {m.shipTo && <PartyBlock p={m.shipTo} label={label} name={{ fontFamily: "Georgia, serif", color: C.ink }} muted={C.muted} />}
            </div>
          </Flash>

          {/* Items */}
          <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "7mm" }}>
            <div style={{ fontFamily: "sans-serif" }}>
              <ItemsTable
                m={m}
                s={{
                  head: { borderBottom: `2px solid ${C.ink}`, borderTop: `1px solid ${C.ink}` },
                  th: { fontSize: "7.5pt", letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink, padding: "2.5mm 2mm" },
                  row: (_i, last) => ({ borderBottom: last ? `2px double ${C.ink}` : `1px solid ${C.rule}` }),
                  muted: C.muted,
                  index: (n) => <span style={{ color: C.accent, fontWeight: 600 }}>{n}</span>,
                  pad: "2.5mm 2mm",
                }}
              />
            </div>
          </Flash>

          {/* Totals & Payment */}
          <div style={{ marginTop: "6mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "10mm", alignItems: "start", breakInside: "avoid", fontFamily: "sans-serif" }}>
            <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "4mm" }}>
              <div>
                <div style={label}>Amount in words</div>
                <div style={{ fontWeight: 600, color: C.ink, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{m.words}</div>
              </div>
              <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
            </Flash>
            <Flash watch={m.totals} enabled={highlight}>
              <div style={{ padding: "3mm 5mm", border: `1px solid ${C.rule}`, background: C.soft }}>
                <TotalsList m={m} s={{ color: C.ink, muted: C.muted, accent: C.accent, rule: C.ink, width: "62mm" }} />
              </div>
            </Flash>
          </div>

          <div style={{ marginTop: "5mm", fontFamily: "sans-serif" }}>
            <NotesTerms m={m} label={label} color={C.muted} />
          </div>

          <div style={{ marginTop: "auto", paddingTop: "6mm", fontFamily: "sans-serif" }}>
            <SignatureArea m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.ink} />
          </div>

          <footer style={{ marginTop: "5mm", borderTop: `1px solid ${C.rule}`, paddingTop: "2.5mm", textAlign: "center", fontSize: "7.5pt", color: C.muted, fontFamily: "sans-serif" }}>
            {m.footer}
          </footer>

        </div>
      </div>
    </article>
  );
}
