"use client";

import { useEffect, useRef, useState } from "react";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import { fontStack, templateTokens as t } from "@/lib/invoice/template-tokens";
import { SignatureBlock } from "../preview/signature-block";

export type PaperAssets = { logoUrl?: string | null; signatureUrl?: string | null; qrDataUrl?: string | null };

function Flash({ watch, enabled, children, className }: { watch: string; enabled: boolean; children: React.ReactNode; className?: string }) {
  const prev = useRef(watch);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled || prev.current === watch) return;
    prev.current = watch;
    const id = setTimeout(() => setN((x) => x + 1), 400);
    return () => clearTimeout(id);
  }, [watch, enabled]);
  return (
    <div className={`relative ${className ?? ""}`}>
      {n > 0 && <span key={n} aria-hidden className="paper-flash pointer-events-none absolute -inset-[1.5mm] rounded-[1mm]" />}
      {children}
    </div>
  );
}

function Party({ p, mono }: { p: PaperParty; mono: string }) {
  return (
    <div className="min-w-0 bg-[#fff0f3] p-[5mm] rounded-xl border border-[#ffe4e8]">
      <div style={{ fontSize: `${t.tiny}pt`, color: "#b36b76", letterSpacing: "0.08em" }} className="mb-[1.5mm] uppercase font-semibold">
        {p.label}
      </div>
      <div style={{ fontWeight: 600, color: "#4a3c3d" }}>{p.name}</div>
      {p.lines.map((l) => (
        <div key={l} style={{ color: "#7a6a6b" }}>
          {l}
        </div>
      ))}
      {p.codes.map((c) => (
        <div key={c} className={mono} style={{ fontSize: `${t.small}pt`, color: "#7a6a6b" }}>
          {c}
        </div>
      ))}
    </div>
  );
}

export function RosePaper({ model: m, assets = {}, highlight = false }: { model: PaperModel; assets?: PaperAssets; highlight?: boolean; }) {
  const mono = "font-mono";
  const th = { fontSize: `${t.tiny}pt`, color: "#b36b76", letterSpacing: "0.06em" } as const;
  const num = "tnum text-right whitespace-nowrap text-[#4a3c3d]";
  return (
    <article
      className="invoice-paper relative flex flex-col"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: `${t.marginMm}mm`,
        background: "#fff5f7",
        color: "#4a3c3d",
        fontSize: `${t.base}pt`,
        lineHeight: 1.5,
        fontFamily: fontStack.sans
      }}
    >
      {m.cancelled && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          <span style={{ color: "#B4413A", opacity: 0.14, fontSize: "64pt", fontWeight: 600, transform: "rotate(-28deg)", letterSpacing: "0.1em" }}>
            CANCELLED
          </span>
        </div>
      )}

      {/* 1. Header (Centered) */}
      <Flash watch={JSON.stringify([m.seller, m.title, m.number])} enabled={highlight}>
        <header className="flex flex-col items-center text-center pb-[5mm] border-b border-[#ffe4e8]">
          {assets.logoUrl && (
            <img src={assets.logoUrl} alt="" style={{ maxHeight: "40px", maxWidth: "50mm" }} className="mb-[4mm] object-contain" />
          )}
          <div style={{ fontFamily: fontStack.serif, fontSize: `${t.title}pt`, fontWeight: 600, lineHeight: 1.15, color: "#4a3c3d", letterSpacing: "-0.005em" }}>
            {m.seller.name}
          </div>
          {m.seller.legalName && <div style={{ color: "#7a6a6b" }}>{m.seller.legalName}</div>}
          <div className="flex flex-wrap justify-center gap-x-2 mt-1" style={{ color: "#7a6a6b", fontSize: `${t.small}pt` }}>
            {m.seller.lines.map((l, i) => (
              <span key={l}>{l}{i < m.seller.lines.length - 1 ? " • " : ""}</span>
            ))}
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div style={{ fontFamily: fontStack.serif, color: "#c76574", fontSize: "10pt", letterSpacing: "0.2em", fontWeight: 600, textTransform: "uppercase" }}>{m.title}</div>
            <div style={{ fontFamily: fontStack.serif, fontSize: `${t.number}pt`, fontWeight: 600, marginTop: "1mm", color: "#4a3c3d" }}>
              {m.number}
            </div>
          </div>
        </header>
      </Flash>

      {/* 2. Meta strip (Minimal centered) */}
      <Flash watch={JSON.stringify(m.meta)} enabled={highlight} className="mt-[4mm]">
        <div className="flex justify-center gap-[4mm] flex-wrap text-center">
          {m.meta.map((x, i) => (
            <div key={x.label} className="flex gap-[2mm] items-center">
              <span className="uppercase font-semibold" style={th}>{x.label}:</span>
              <span style={{ color: "#4a3c3d" }}>{x.value}</span>
              {i < m.meta.length - 1 && <span style={{ color: "#ffe4e8" }}>|</span>}
            </div>
          ))}
        </div>
      </Flash>

      {/* 3. Parties */}
      <Flash watch={JSON.stringify([m.billTo, m.shipTo])} enabled={highlight} className="mt-[8mm]">
        <div className="grid grid-cols-2 gap-[8mm]">
          <Party p={m.billTo} mono={mono} />
          {m.shipTo && <Party p={m.shipTo} mono={mono} />}
        </div>
      </Flash>

      {/* 4. Items */}
      <Flash watch={JSON.stringify(m.rows)} enabled={highlight} className="mt-[8mm]">
        <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            <tr style={{ backgroundColor: "#ffe4e8", borderRadius: "8px" }}>
              <th className="py-[3mm] px-[2mm] text-left font-medium uppercase rounded-l-lg" style={th}>#</th>
              <th className="w-full py-[3mm] pr-[2mm] text-left font-medium uppercase" style={th}>Description</th>
              <th className="py-[3mm] pl-[3mm] text-right font-medium uppercase" style={th}>Qty</th>
              <th className="py-[3mm] pl-[3mm] text-right font-medium uppercase" style={th}>Rate</th>
              {m.showDiscount && <th className="py-[3mm] pl-[3mm] text-right font-medium uppercase" style={th}>Disc.</th>}
              {m.showGst && (
                <>
                  <th className="py-[3mm] pl-[3mm] text-right font-medium uppercase" style={th}>Taxable</th>
                  <th className="py-[3mm] pl-[3mm] text-right font-medium uppercase" style={th}>GST</th>
                </>
              )}
              <th className="py-[3mm] pl-[3mm] pr-[2mm] text-right font-medium uppercase rounded-r-lg" style={th}>Amount</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: `${t.small}pt` }}>
            {m.rows.map((r, i) => (
              <tr key={r.n} style={{ borderBottom: i === m.rows.length - 1 ? "none" : "1px solid #ffe4e8" }}>
                <td className="py-[3mm] px-[2mm] align-top text-[#7a6a6b]">{r.n}</td>
                <td className="py-[3mm] pr-[2mm] align-top">
                  <div style={{ fontWeight: 500, color: "#4a3c3d" }}>{r.name}</div>
                  {r.description && <div className="mt-[1mm] whitespace-pre-wrap" style={{ color: "#7a6a6b" }}>{r.description}</div>}
                  {r.sac && <div className="mt-[1mm]" style={{ color: "#7a6a6b" }}>SAC/HSN: {r.sac}</div>}
                </td>
                <td className={`py-[3mm] pl-[3mm] align-top ${num}`}>{r.qty}</td>
                <td className={`py-[3mm] pl-[3mm] align-top ${num}`}>{r.rate}</td>
                {m.showDiscount && <td className={`py-[3mm] pl-[3mm] align-top ${num}`}>{r.discount}</td>}
                {m.showGst && (
                  <>
                    <td className={`py-[3mm] pl-[3mm] align-top ${num}`}>{r.taxable}</td>
                    <td className={`py-[3mm] pl-[3mm] align-top ${num}`}>{r.gst}</td>
                  </>
                )}
                <td className={`py-[3mm] pl-[3mm] pr-[2mm] align-top ${num}`} style={{ fontWeight: 500 }}>
                  {r.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Flash>

      <div className="mt-auto pt-[8mm] flex items-end justify-between gap-[12mm]" style={{ pageBreakInside: "avoid" }}>
        {/* 5. Left: Bank, QR, Notes */}
        <div className="min-w-0 flex-1">
          {m.words && (
            <div className="mb-[4mm]">
              <div style={{ ...th }}>Total in words</div>
              <div style={{ fontFamily: fontStack.serif, fontWeight: 600, color: "#4a3c3d" }}>{m.words}</div>
            </div>
          )}
          {(m.payment.lines.length > 0 || m.payment.upiText) && (
            <div className="mb-[4mm] flex items-start gap-[6mm] bg-[#fff0f3] p-[4mm] rounded-xl border border-[#ffe4e8]">
              {m.payment.lines.length > 0 && (
                <div className="min-w-0 flex-1">
                  <div style={{ ...th, marginBottom: "1.5mm" }}>Payment Details</div>
                  {m.payment.lines.map((l) => (
                    <div key={l.label} className="flex gap-[2mm]" style={{ fontSize: `${t.small}pt` }}>
                      <span style={{ color: "#7a6a6b" }}>{l.label}:</span>
                      <span className={mono} style={{ color: "#4a3c3d", fontWeight: 500 }}>{l.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {assets.qrDataUrl && (
                <div className="shrink-0 text-center">
                  <img src={assets.qrDataUrl} alt="UPI QR" className="size-[22mm] mix-blend-multiply" />
                </div>
              )}
            </div>
          )}
          {m.notes && (
            <div className="mb-[3mm]">
              <div style={th}>Notes</div>
              <div className="whitespace-pre-wrap" style={{ fontSize: `${t.small}pt`, color: "#7a6a6b" }}>{m.notes}</div>
            </div>
          )}
          {m.terms && (
            <div>
              <div style={th}>Terms & Conditions</div>
              <div className="whitespace-pre-wrap" style={{ fontSize: `${t.small}pt`, color: "#7a6a6b" }}>{m.terms}</div>
            </div>
          )}
        </div>

        {/* 6. Right: Totals block */}
        <Flash watch={JSON.stringify(m.totals)} enabled={highlight} className="shrink-0 w-[80mm] bg-[#fff0f3] p-[5mm] rounded-xl border border-[#ffe4e8]">
          <div className="flex flex-col gap-[2mm]">
            {m.totals.map((tr, i) => (
              <div
                key={i}
                className="flex items-center justify-between"
                style={{
                  fontWeight: tr.strong ? 600 : 400,
                  fontSize: tr.strong ? `${t.base}pt` : `${t.small}pt`,
                  paddingTop: tr.rule ? "2mm" : 0,
                  borderTop: tr.rule ? "1px solid #ffe4e8" : "none",
                  color: tr.accent ? "#c76574" : "#4a3c3d",
                }}
              >
                <div>{tr.label}</div>
                <div className={num}>{tr.value}</div>
              </div>
            ))}
          </div>
        </Flash>
      </div>

      {/* 7. Signatory & Footer */}
      <div className="mt-[10mm] flex items-end justify-between" style={{ pageBreakInside: "avoid" }}>
        <div style={{ fontSize: "8pt", color: "#7a6a6b" }}>
          {m.signature.enabled ? "" : <div className="italic">{m.signature.notice}</div>}
        </div>
        {m.signature.enabled && (
          <div className="w-[60mm]">
            <SignatureBlock model={m} assets={assets} />
          </div>
        )}
      </div>

      <div className="mt-[6mm] text-center border-t border-[#ffe4e8] pt-[4mm]" style={{ fontSize: "8pt", color: "#b36b76" }}>
        {m.footer}
      </div>
    </article>
  );
}
