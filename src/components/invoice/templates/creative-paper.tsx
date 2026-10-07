"use client";

// Minimal Creative — crisp white editorial layout with warm orange accents, airy line-heights,
// left accent bar on seller name, clean line headers, and ample whitespace.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { ink: "#1c1917", muted: "#78716c", orange: "#ea580c", orangeSoft: "#fff7ed", rule: "#e7e5e4", line: "#f5f5f4" };
const label = { fontSize: "7.5pt", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 600, color: C.orange, marginBottom: "1.5mm" } as const;

export function CreativePaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: "#ffffff", color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm" })}>
      {m.cancelled && <Cancelled />}

      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10mm", paddingBottom: "8mm", borderBottom: `2px solid ${C.ink}` }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "4mm" }} />}
            <div style={{ borderLeft: `3px solid ${C.orange}`, paddingLeft: "3.5mm" }}>
              <div style={{ fontSize: "16pt", fontWeight: 700, lineHeight: 1.15 }}>{m.seller.name}</div>
              <SellerLines m={m} color={C.muted} style={{ fontSize: "8.5pt", marginTop: "1.5mm" }} />
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "10pt", fontWeight: 700, letterSpacing: "0.2em", color: C.orange, textTransform: "uppercase" }}>{m.title}</div>
            <div style={{ fontSize: "20pt", fontWeight: 700, marginTop: "1mm", letterSpacing: "-0.02em" }}>{m.number}</div>
          </div>
        </header>
      </Flash>

      {/* Meta strip */}
      <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "6mm" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6mm", padding: "3mm 0", borderBottom: `1px solid ${C.rule}` }}>
          {m.meta.map((x) => (
            <div key={x.label} style={{ display: "flex", gap: "2mm", alignItems: "baseline" }}>
              <span style={{ fontSize: "7.5pt", letterSpacing: "0.1em", color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>{x.label}:</span>
              <span style={{ fontWeight: 600 }}>{x.value}</span>
            </div>
          ))}
        </div>
      </Flash>

      {/* Parties */}
      <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "7mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "10mm" }}>
          <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt" }} muted={C.muted} />
          {m.shipTo && <PartyBlock p={m.shipTo} label={label} muted={C.muted} />}
        </div>
      </Flash>

      {/* Items table */}
      <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "8mm" }}>
        <ItemsTable
          m={m}
          s={{
            head: { borderBottom: `2px solid ${C.ink}` },
            th: { fontSize: "7.5pt", color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", padding: "2.5mm 2mm" },
            row: (_i, last) => ({ borderBottom: last ? `2px solid ${C.ink}` : `1px solid ${C.rule}` }),
            muted: C.muted,
            index: (n) => <span style={{ color: C.orange, fontWeight: 600 }}>{n}</span>,
            pad: "3.5mm 2mm",
          }}
        />
      </Flash>

      {/* Totals & Payment */}
      <div style={{ marginTop: "7mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "12mm", alignItems: "start", breakInside: "avoid" }}>
        <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "5mm" }}>
          <div>
            <div style={label}>Amount in words</div>
            <div style={{ fontWeight: 600, color: C.ink }}>{m.words}</div>
          </div>
          <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
        </Flash>
        <Flash watch={m.totals} enabled={highlight}>
          <div style={{ background: C.orangeSoft, padding: "4mm 6mm", borderRadius: "2mm", border: `1px solid ${C.orange}33` }}>
            <TotalsList m={m} s={{ color: C.ink, muted: C.muted, accent: C.orange, rule: C.orange, width: "64mm" }} />
          </div>
        </Flash>
      </div>

      <div style={{ marginTop: "7mm" }}>
        <NotesTerms m={m} label={label} color={C.muted} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "10mm" }}>
        <SignatureArea m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.ink} />
      </div>

      <footer style={{ marginTop: "6mm", borderTop: `1px solid ${C.rule}`, paddingTop: "3mm", textAlign: "center", fontSize: "7.5pt", color: C.muted }}>
        {m.footer}
      </footer>
    </article>
  );
}
