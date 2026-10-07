"use client";

// Dynamic Bold — high-energy geometric layout featuring a split diagonal header accent,
// bold magenta badges, thick structural borders, and a high-contrast dark footer.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { bg: "#ffffff", dark: "#881337", pink: "#be185d", soft: "#fff1f2", ink: "#111827", muted: "#4b5563", border: "#fecdd3" };
const label = { fontSize: "7.5pt", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900, color: C.pink, marginBottom: "1.5mm" } as const;

export function DynamicPaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: C.bg, color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm", borderTop: `8mm solid ${C.dark}` })}>
      {m.cancelled && <Cancelled />}

      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8mm", paddingBottom: "6mm", borderBottom: `3px solid ${C.dark}` }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "3mm" }} />}
            <div style={{ fontSize: "18pt", fontWeight: 900, color: C.dark, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: "-0.01em" }}>{m.seller.name}</div>
            <SellerLines m={m} color={C.muted} style={{ fontSize: "8.5pt", marginTop: "1.5mm" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: C.pink, color: "#ffffff", padding: "2mm 6mm", borderRadius: "1mm", fontSize: "13pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", display: "inline-block" }}>
              {m.title}
            </div>
            <div style={{ fontSize: "16pt", fontWeight: 800, color: C.dark, marginTop: "2mm" }}>#{m.number}</div>
          </div>
        </header>
      </Flash>

      {/* Meta Grid */}
      <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "5mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${m.meta.length}, 1fr)`, border: `2px solid ${C.pink}`, background: C.soft }}>
          {m.meta.map((x, i) => (
            <div key={x.label} style={{ padding: "2.5mm 3mm", borderLeft: i ? `2px solid ${C.pink}` : undefined }}>
              <div style={{ fontSize: "7pt", letterSpacing: "0.12em", color: C.pink, fontWeight: 900, textTransform: "uppercase" }}>{x.label}</div>
              <div style={{ fontWeight: 800, fontSize: "9pt", marginTop: "0.5mm", color: C.dark }}>{x.value}</div>
            </div>
          ))}
        </div>
      </Flash>

      {/* Parties */}
      <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "6mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "8mm" }}>
          <div style={{ background: C.soft, padding: "4mm 5mm", borderRadius: "1.5mm", borderLeft: `4px solid ${C.pink}` }}>
            <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt", color: C.dark, fontWeight: 800 }} muted={C.muted} />
          </div>
          {m.shipTo && (
            <div style={{ background: C.soft, padding: "4mm 5mm", borderRadius: "1.5mm", borderLeft: `4px solid ${C.dark}` }}>
              <PartyBlock p={m.shipTo} label={label} name={{ color: C.dark, fontWeight: 800 }} muted={C.muted} />
            </div>
          )}
        </div>
      </Flash>

      {/* Items Table */}
      <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "7mm" }}>
        <ItemsTable
          m={m}
          s={{
            head: { background: C.dark, color: "#ffffff" },
            th: { fontSize: "7.5pt", color: "#ffffff", letterSpacing: "0.12em", textTransform: "uppercase", padding: "3mm 3mm", fontWeight: 900 },
            row: (_i, last) => ({ borderBottom: last ? `3px solid ${C.dark}` : `1px solid ${C.border}` }),
            muted: C.muted,
            index: (n) => <span style={{ color: C.pink, fontWeight: 800 }}>{n}</span>,
            pad: "3mm 3mm",
          }}
        />
      </Flash>

      {/* Totals & Payment */}
      <div style={{ marginTop: "7mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "10mm", alignItems: "start", breakInside: "avoid" }}>
        <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "5mm" }}>
          <div>
            <div style={label}>Amount in words</div>
            <div style={{ fontWeight: 800, color: C.dark }}>{m.words}</div>
          </div>
          <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
        </Flash>
        <Flash watch={m.totals} enabled={highlight}>
          <div style={{ background: C.dark, color: "#ffffff", padding: "4mm 6mm", borderRadius: "1.5mm" }}>
            <TotalsList m={m} s={{ color: "#ffffff", muted: "#fecdd3", accent: "#f472b6", rule: C.pink, width: "64mm" }} />
          </div>
        </Flash>
      </div>

      <div style={{ marginTop: "6mm" }}>
        <NotesTerms m={m} label={label} color={C.muted} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8mm" }}>
        <SignatureArea m={m} assets={assets} color={C.dark} muted={C.muted} rule={C.dark} />
      </div>

      <footer style={{ marginTop: "6mm", background: C.dark, color: "#fecdd3", padding: "3mm 6mm", borderRadius: "1mm", textAlign: "center", fontSize: "7.5pt" }}>
        {m.footer}
      </footer>
    </article>
  );
}
