"use client";

// Editorial Lime — bold graphic editorial layout inspired by public press publications:
// deep forest green header background with vibrant lime accents, solid black borders, and heavy line weights.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { bg: "#ffffff", dark: "#1a2e05", lime: "#84cc16", limeLight: "#f7fee7", ink: "#0f172a", muted: "#475569", rule: "#cbd5e1" };
const label = { fontSize: "7.5pt", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800, color: C.dark, marginBottom: "1.5mm" } as const;

export function LimePaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: C.bg, color: C.ink, fontSize: "9.5pt", padding: "14mm 16mm" })}>
      {m.cancelled && <Cancelled />}

      {/* Header Band */}
      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ background: C.dark, color: "#ffffff", padding: "8mm 10mm", borderRadius: "2mm", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8mm" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && <Logo url={assets.logoUrl} style={{ marginBottom: "3mm" }} />}
            <div style={{ fontSize: "17pt", fontWeight: 800, color: C.lime, lineHeight: 1.15 }}>{m.seller.name}</div>
            <SellerLines m={m} color="#94a3b8" style={{ fontSize: "8.5pt", marginTop: "1.5mm" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: C.lime, color: C.dark, padding: "1.5mm 4mm", borderRadius: "1mm", fontSize: "11pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {m.title}
            </div>
            <div style={{ fontSize: "16pt", fontWeight: 800, color: "#ffffff", marginTop: "2mm" }}>№ {m.number}</div>
          </div>
        </header>
      </Flash>

      {/* Meta Bar */}
      <Flash watch={m.meta} enabled={highlight} style={{ marginTop: "5mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${m.meta.length}, 1fr)`, border: `2px solid ${C.dark}`, background: C.limeLight }}>
          {m.meta.map((x, i) => (
            <div key={x.label} style={{ padding: "2.5mm 3mm", borderLeft: i ? `2px solid ${C.dark}` : undefined }}>
              <div style={{ fontSize: "7pt", letterSpacing: "0.12em", color: C.dark, fontWeight: 800, textTransform: "uppercase" }}>{x.label}</div>
              <div style={{ fontWeight: 700, fontSize: "9pt", marginTop: "0.5mm" }}>{x.value}</div>
            </div>
          ))}
        </div>
      </Flash>

      {/* Parties */}
      <Flash watch={[m.billTo, m.shipTo]} enabled={highlight} style={{ marginTop: "6mm" }}>
        <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1fr 1fr" : "1.5fr", gap: "8mm" }}>
          <div style={{ borderLeft: `4px solid ${C.lime}`, paddingLeft: "3.5mm" }}>
            <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt", color: C.dark }} muted={C.muted} />
          </div>
          {m.shipTo && (
            <div style={{ borderLeft: `4px solid ${C.dark}`, paddingLeft: "3.5mm" }}>
              <PartyBlock p={m.shipTo} label={label} name={{ color: C.dark }} muted={C.muted} />
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
            th: { fontSize: "7.5pt", color: C.lime, letterSpacing: "0.12em", textTransform: "uppercase", padding: "3mm 3mm", fontWeight: 800 },
            row: (_i, last) => ({ borderBottom: last ? `3px solid ${C.dark}` : `1px solid ${C.rule}` }),
            muted: C.muted,
            index: (n) => <span style={{ color: C.dark, fontWeight: 800 }}>{n}</span>,
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
          <div style={{ background: C.limeLight, padding: "4mm 6mm", border: `2px solid ${C.dark}`, borderRadius: "1.5mm" }}>
            <TotalsList m={m} s={{ color: C.dark, muted: C.muted, accent: C.dark, rule: C.dark, width: "64mm" }} />
          </div>
        </Flash>
      </div>

      <div style={{ marginTop: "6mm" }}>
        <NotesTerms m={m} label={label} color={C.muted} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: "8mm" }}>
        <SignatureArea m={m} assets={assets} color={C.dark} muted={C.muted} rule={C.dark} />
      </div>

      <footer style={{ marginTop: "6mm", background: C.dark, color: "#94a3b8", padding: "3mm 6mm", borderRadius: "1mm", textAlign: "center", fontSize: "7.5pt" }}>
        {m.footer}
      </footer>
    </article>
  );
}
