"use client";

// Modern Studio — full-bleed black header band with a purple rule, oversized title and a purple
// number pill; a three-column info row (bill to | ship to | meta list behind a black bar);
// black-headed zebra table; a black totals card whose grand total sits on a purple bar;
// and a black footer band.

import { Cancelled, Flash, ItemsTable, Logo, NotesTerms, PartyBlock, PaymentInfo, SellerLines, SignatureArea, TotalsList, sheet, type TemplateProps } from "./html-parts";

const C = { black: "#111014", ink: "#1d1b22", muted: "#6b6776", purple: "#7b5cff", soft: "#b9a8ff", rule: "#e6e3ee", grey: "#b9b5c4", zebra: "#f6f4fa" };
const label = { fontSize: "7pt", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, color: C.purple, marginBottom: "1.5mm" } as const;

export function StudioPaper({ model: m, assets = {}, highlight }: TemplateProps) {
  return (
    <article className="invoice-paper" style={sheet({ background: "#fff", color: C.ink, fontSize: "9.5pt" })}>
      {m.cancelled && <Cancelled />}

      <Flash watch={[m.seller, m.title, m.number]} enabled={highlight}>
        <header style={{ background: C.black, color: "#fff", padding: "12mm 14mm 10mm", display: "flex", justifyContent: "space-between", gap: "10mm" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            {assets.logoUrl && (
              <div style={{ background: "#fff", padding: "1.5mm", borderRadius: "1mm", display: "inline-block", marginBottom: "4mm" }}>
                <Logo url={assets.logoUrl} />
              </div>
            )}
            <div style={{ fontSize: "15pt", fontWeight: 700, lineHeight: 1.2, overflowWrap: "anywhere" }}>{m.seller.name}</div>
            <SellerLines m={m} color={C.grey} style={{ fontSize: "8.5pt", marginTop: "1.5mm" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: "24pt", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1 }}>{m.title}</div>
            <div style={{ display: "inline-block", marginTop: "3mm", background: C.purple, color: "#fff", borderRadius: "999px", padding: "1.2mm 4mm", fontWeight: 700, fontSize: "10pt" }}>No. {m.number}</div>
          </div>
        </header>
        <div style={{ height: "2.5mm", background: C.purple }} />
      </Flash>

      <div style={{ padding: "9mm 14mm 0", display: "flex", flexDirection: "column", flex: 1 }}>
        <Flash watch={[m.billTo, m.shipTo, m.meta]} enabled={highlight}>
          <div style={{ display: "grid", gridTemplateColumns: m.shipTo ? "1.2fr 1fr 1fr" : "1.4fr 1fr", gap: "7mm" }}>
            <PartyBlock p={m.billTo} label={label} name={{ fontSize: "11pt" }} muted={C.muted} />
            {m.shipTo && <PartyBlock p={m.shipTo} label={label} muted={C.muted} />}
            <div style={{ borderLeft: `3px solid ${C.black}`, paddingLeft: "4mm", minWidth: 0 }}>
              {m.meta.map((x) => (
                <div key={x.label} style={{ display: "flex", justifyContent: "space-between", gap: "4mm", padding: "0.6mm 0" }}>
                  <span style={{ color: C.muted }}>{x.label}</span>
                  <span style={{ fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{x.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Flash>

        <Flash watch={m.rows} enabled={highlight} style={{ marginTop: "8mm" }}>
          <ItemsTable
            m={m}
            s={{
              head: { background: C.black, color: "#fff" },
              th: { fontSize: "7.5pt", letterSpacing: "0.1em", textTransform: "uppercase" },
              row: (i) => ({ background: i % 2 ? C.zebra : "#fff", borderBottom: `1px solid ${C.rule}` }),
              muted: C.muted,
              index: (n) => <span style={{ color: C.purple, fontWeight: 700 }}>{String(n).padStart(2, "0")}</span>,
            }}
          />
        </Flash>

        <div style={{ marginTop: "7mm", display: "grid", gridTemplateColumns: "1fr auto", gap: "10mm", alignItems: "start", breakInside: "avoid" }}>
          <Flash watch={[m.words, m.payment]} enabled={highlight} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "5mm" }}>
            <div>
              <div style={label}>Amount in words</div>
              <div style={{ fontWeight: 600 }}>{m.words}</div>
            </div>
            <PaymentInfo m={m} assets={assets} label={label} muted={C.muted} />
          </Flash>
          <Flash watch={m.totals} enabled={highlight}>
            <div style={{ background: C.black, color: "#fff", padding: "5mm 5mm 3mm", borderRadius: "1.5mm", overflow: "hidden" }}>
              <TotalsList m={m} s={{ color: "#fff", muted: C.grey, accent: C.soft, grand: { background: C.purple, margin: "3mm -5mm 0", padding: "3.5mm 5mm" }, grandValue: { fontSize: "15pt" } }} />
            </div>
          </Flash>
        </div>

        <div style={{ marginTop: "7mm" }}>
          <NotesTerms m={m} label={label} color={C.muted} />
        </div>
        <div style={{ marginTop: "auto", paddingTop: "10mm" }}>
          <SignatureArea m={m} assets={assets} color={C.ink} muted={C.muted} rule={C.black} />
        </div>
      </div>

      <footer style={{ marginTop: "8mm", background: C.black, color: C.grey, padding: "4mm 14mm", fontSize: "7.5pt", display: "flex", justifyContent: "space-between", gap: "6mm" }}>
        <span>{m.footer}</span>
        <span style={{ color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>{m.number}</span>
      </footer>
    </article>
  );
}
