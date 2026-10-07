"use client";

// Friendly Bakery — warm cream background, soft rounded panels, amber/orange pill badges,
// playful rounded table headers, and cozy friendly feel.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { bg: "#fffbeb", ink: "#451a03", muted: "#78350f", amber: "#d97706", soft: "#fef3c7", card: "#fef8ee", border: "#fde68a" };
const label = { fontSize: "7.5pt", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: C.amber, marginBottom: "1.5mm" } as const;

export function BakeryPaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: C.bg, color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm" })}>
      {m.cancelled && <Cancelled />}

      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ background: C.card, borderRadius: "4mm", border: `1.5px solid ${C.border}`, padding: "8mm 10mm", display: "flex", justifyContent: "space-between", gap: "8mm", alignItems: "center" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "3mm" }} />}
            <div style={{ fontSize: "16pt", fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{m.seller.name}</div>
            <SellerLines m={m} color={C.muted} style={{ fontSize: "8.5pt", marginTop: "1mm" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ display: "inline-block", background: C.amber, color: "#fff", borderRadius: "999px", padding: "1.5mm 5mm", fontWeight: 700, fontSize: "9pt", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {m.title}
            </div>
            <div style={{ fontSize: "18pt", fontWeight: 800, marginTop: "2mm", color: C.ink }}>#{m.number}</div>
          </div>
        </header>
      </Flash>

      {/* Meta Pills */}
      <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "6mm" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "3mm" }}>
          {m.meta.map((x) => (
            <div key={x.label} style={{ background: C.soft, borderRadius: "999px", border: `1px solid ${C.border}`, padding: "1.5mm 4mm", display: "flex", gap: "2mm", fontSize: "8.5pt" }}>
              <span style={{ color: C.muted, fontWeight: 600 }}>{x.label}:</span>
              <span style={{ fontWeight: 700, color: C.ink }}>{x.value}</span>
            </div>
          ))}
        </div>
      </Flash>

      {/* Parties */}
      <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "7mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "6mm" }}>
          <div style={{ background: C.card, borderRadius: "3mm", border: `1px solid ${C.border}`, padding: "4.5mm 6mm" }}>
            <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt", color: C.ink }} muted={C.muted} />
          </div>
          {m.shipTo && (
            <div style={{ background: C.card, borderRadius: "3mm", border: `1px solid ${C.border}`, padding: "4.5mm 6mm" }}>
              <PartyBlock p={m.shipTo} label={label} name={{ color: C.ink }} muted={C.muted} />
            </div>
          )}
        </div>
      </Flash>

      {/* Table */}
      <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "7mm" }}>
        <ItemsTable
          m={m}
          s={{
            head: { background: C.soft, borderRadius: "3mm" },
            th: { fontSize: "7.5pt", color: C.amber, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3mm 3mm" },
            row: (_i, last) => ({ borderBottom: last ? `2px solid ${C.amber}` : `1px solid ${C.border}` }),
            muted: C.muted,
            index: (n) => <span style={{ background: C.amber, color: "#fff", borderRadius: "999px", width: "5.5mm", height: "5.5mm", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "7.5pt", fontWeight: 700 }}>{n}</span>,
            pad: "3mm 3mm",
          }}
        />
      </Flash>

      {/* Totals & Notes */}
      <div style={{ marginTop: "7mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "10mm", alignItems: "start", breakInside: "avoid" }}>
        <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "5mm" }}>
          <div>
            <div style={label}>Amount in words</div>
            <div style={{ fontWeight: 700, color: C.ink }}>{m.words}</div>
          </div>
          <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
        </Flash>
        <Flash watch={m.totals} enabled={highlight}>
          <div style={{ background: C.card, borderRadius: "3mm", border: `1.5px solid ${C.border}`, padding: "4mm 6mm" }}>
            <TotalsList m={m} s={{ color: C.ink, muted: C.muted, accent: C.amber, rule: C.amber, width: "64mm" }} />
          </div>
        </Flash>
      </div>

      <div style={{ marginTop: "6mm" }}>
        <NotesTerms m={m} label={label} color={C.muted} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8mm" }}>
        <SignatureArea m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.amber} />
      </div>

      <footer style={{ marginTop: "6mm", background: C.soft, borderRadius: "999px", padding: "2.5mm 6mm", textAlign: "center", fontSize: "7.5pt", color: C.muted }}>
        {m.footer}
      </footer>
    </article>
  );
}
