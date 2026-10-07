"use client";

import { useEffect, useRef, useState } from "react";
import type { PaperModel, PaperParty } from "@/lib/invoice/paper-model";
import { templateTokens as t } from "@/lib/invoice/template-tokens";
import { SignatureBlock } from "./signature-block";

export type PaperAssets = { logoUrl?: string | null; signatureUrl?: string | null; qrDataUrl?: string | null };

/**
 * Accent-soft wash that fades out over 600ms on the region whose content just changed.
 * Waits 400ms after the last change, so it never flickers while typing (02 §8).
 */
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
    <div className="min-w-0">
      <div style={{ fontSize: `${t.tiny}pt`, color: t.ink3, letterSpacing: "0.08em" }} className="mb-[1.5mm] uppercase">
        {p.label}
      </div>
      <div style={{ fontWeight: 600 }}>{p.name}</div>
      {p.lines.map((l) => (
        <div key={l} style={{ color: t.ink2 }}>
          {l}
        </div>
      ))}
      {p.codes.map((c) => (
        <div key={c} className={mono} style={{ fontSize: `${t.small}pt`, color: t.ink2 }}>
          {c}
        </div>
      ))}
    </div>
  );
}

/** The A4 invoice, in HTML. Same layout as InvoicePdf, same model (02 §7). */
export function InvoicePaper({
  model: m,
  assets = {},
  highlight = false,
}: {
  model: PaperModel;
  assets?: PaperAssets;
  highlight?: boolean;
}) {
  const mono = "font-mono";
  const th = { fontSize: `${t.tiny}pt`, color: t.ink3, letterSpacing: "0.06em" } as const;
  const num = "tnum text-right whitespace-nowrap";
  return (
    <article
      className="invoice-paper relative flex flex-col font-sans"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: `${t.marginMm}mm`,
        background: t.paper,
        color: t.ink,
        fontSize: `${t.base}pt`,
        lineHeight: 1.45,
      }}
    >
      {m.cancelled && (
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
          <span style={{ color: "#B4413A", opacity: 0.14, fontSize: "64pt", fontWeight: 600, transform: "rotate(-28deg)", letterSpacing: "0.1em" }}>
            CANCELLED
          </span>
        </div>
      )}

      {/* 1. Header */}
      <Flash watch={JSON.stringify([m.seller, m.title, m.number])} enabled={highlight}>
        <header className="flex items-start justify-between gap-[8mm]">
          <div className="min-w-0">
            {assets.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img src={assets.logoUrl} alt="" style={{ maxHeight: "40px", maxWidth: "50mm" }} className="mb-[3mm] object-contain" />
            )}
            <div className="font-heading" style={{ fontSize: `${t.title}pt`, fontWeight: 600, lineHeight: 1.2 }}>
              {m.seller.name}
            </div>
            {m.seller.legalName && <div style={{ color: t.ink2 }}>{m.seller.legalName}</div>}
            {m.seller.lines.map((l) => (
              <div key={l} style={{ color: t.ink2 }}>
                {l}
              </div>
            ))}
            {m.seller.codes && (
              <div className={mono} style={{ fontSize: "8.5pt", color: t.ink2, marginTop: "1mm" }}>
                {m.seller.codes}
              </div>
            )}
            {m.seller.contact && <div style={{ color: t.ink2 }}>{m.seller.contact}</div>}
          </div>
          <div className="shrink-0 text-right">
            <div style={{ color: m.accent, fontSize: "8pt", letterSpacing: "0.2em", fontWeight: 600 }}>{m.title}</div>
            <div className="font-heading" style={{ fontSize: `${t.number}pt`, fontWeight: 600, marginTop: "1mm" }}>
              {m.number}
            </div>
          </div>
        </header>
      </Flash>

      {/* 2. Meta strip */}
      <Flash watch={JSON.stringify(m.meta)} enabled={highlight} className="mt-[8mm]">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${m.meta.length}, 1fr)`, border: `1px solid ${t.rule}` }}>
          {m.meta.map((x, i) => (
            <div key={x.label} style={{ padding: "2mm 3mm", borderLeft: i ? `1px solid ${t.rule}` : undefined }}>
              <div className="uppercase" style={th}>
                {x.label}
              </div>
              <div>{x.value}</div>
            </div>
          ))}
        </div>
      </Flash>

      {/* 3. Parties */}
      <Flash watch={JSON.stringify([m.billTo, m.shipTo])} enabled={highlight} className="mt-[7mm]">
        <div className="grid grid-cols-2 gap-[8mm]">
          <Party p={m.billTo} mono={mono} />
          {m.shipTo && <Party p={m.shipTo} mono={mono} />}
        </div>
      </Flash>

      {/* 4. Items */}
      <Flash watch={JSON.stringify(m.rows)} enabled={highlight} className="mt-[7mm]">
        <table className="w-full border-collapse" style={{ tableLayout: "auto" }}>
          <thead>
            <tr style={{ borderTop: `1px solid ${t.ink}`, borderBottom: `1px solid ${t.ink}` }}>
              <th className="py-[2mm] pr-[2mm] text-left font-medium uppercase" style={th}>#</th>
              <th className="w-full py-[2mm] pr-[2mm] text-left font-medium uppercase" style={th}>Description</th>
              <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>Qty</th>
              <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>Rate</th>
              {m.showDiscount && <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>Disc.</th>}
              {m.showGst && <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>Taxable</th>}
              {m.showGst && <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>GST</th>}
              <th className="py-[2mm] pl-[3mm] text-right font-medium uppercase" style={th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {m.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-[4mm] text-center" style={{ color: t.ink3 }}>
                  Your items will appear here.
                </td>
              </tr>
            )}
            {m.rows.map((r) => (
              <tr key={r.n} style={{ borderBottom: `1px solid ${t.rule}` }} className="align-top">
                <td className="tnum py-[2.2mm] pr-[2mm]" style={{ color: t.ink3 }}>{r.n}</td>
                <td className="py-[2.2mm] pr-[2mm]">
                  <div style={{ fontWeight: 500 }}>{r.name}</div>
                  {r.description && <div style={{ color: t.ink2, fontSize: `${t.small}pt` }}>{r.description}</div>}
                  {r.sac && <div className={mono} style={{ color: t.ink3, fontSize: `${t.small}pt` }}>SAC {r.sac}</div>}
                </td>
                <td className={`${num} py-[2.2mm] pl-[3mm]`}>{r.qty}</td>
                <td className={`${num} py-[2.2mm] pl-[3mm]`}>{r.rate}</td>
                {m.showDiscount && <td className={`${num} py-[2.2mm] pl-[3mm]`}>{r.discount}</td>}
                {m.showGst && <td className={`${num} py-[2.2mm] pl-[3mm]`}>{r.taxable}</td>}
                {m.showGst && <td className={`${num} py-[2.2mm] pl-[3mm]`}>{r.gst}</td>}
                <td className={`${num} py-[2.2mm] pl-[3mm]`} style={{ fontWeight: 500 }}>{r.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Flash>

      {/* 5. Bottom: words + payment | totals */}
      <div className="mt-[6mm] grid grid-cols-[1fr_auto] gap-[10mm]">
        <Flash watch={JSON.stringify([m.words, m.payment])} enabled={highlight}>
          <div className="uppercase" style={th}>Amount in words</div>
          <div style={{ fontWeight: 500 }}>{m.words}</div>
          {(m.payment.lines.length > 0 || assets.qrDataUrl) && (
            <div className="mt-[5mm] flex items-start gap-[5mm]">
              {m.payment.lines.length > 0 && (
                <div className="min-w-0">
                  <div className="mb-[1mm] uppercase" style={th}>Payment details</div>
                  {m.payment.lines.map((l) => (
                    <div key={l.label} className="flex gap-[2mm]">
                      <span style={{ color: t.ink3, minWidth: "16mm" }}>{l.label}</span>
                      <span className={l.label === "Bank" || l.label === "A/C name" ? "" : mono} style={{ fontSize: l.label === "Bank" || l.label === "A/C name" ? undefined : "8.5pt" }}>
                        {l.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {assets.qrDataUrl && m.payment.upiCaption && (
                <div className="shrink-0 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
                  <img src={assets.qrDataUrl} alt="UPI QR code" style={{ width: "24mm", height: "24mm" }} />
                  <div style={{ fontSize: `${t.tiny}pt`, color: t.ink2, marginTop: "1mm" }}>{m.payment.upiCaption}</div>
                </div>
              )}
            </div>
          )}
        </Flash>
        <Flash watch={JSON.stringify(m.totals)} enabled={highlight}>
          <table className="border-collapse" style={{ minWidth: "64mm" }}>
            <tbody>
              {m.totals.map((r) => (
                <tr key={r.label} style={r.rule ? { borderTop: `1.5px solid ${t.ink}` } : undefined}>
                  <td className="py-[1.2mm] pr-[6mm]" style={{ color: r.strong ? t.ink : t.ink2, fontWeight: r.strong ? 600 : 400, paddingTop: r.rule ? "2.5mm" : undefined }}>
                    {r.label}
                  </td>
                  <td
                    className="tnum py-[1.2mm] text-right whitespace-nowrap"
                    style={{
                      fontWeight: r.strong ? 600 : 400,
                      fontSize: r.rule ? `${t.total}pt` : undefined,
                      color: r.accent ? m.accent : t.ink,
                      paddingTop: r.rule ? "2.5mm" : undefined,
                    }}
                  >
                    {r.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Flash>
      </div>

      {/* 6. Notes & terms */}
      {(m.notes || m.terms) && (
        <Flash watch={JSON.stringify([m.notes, m.terms])} enabled={highlight} className="mt-[7mm]">
          <div className="grid grid-cols-2 gap-[8mm]" style={{ fontSize: `${t.small}pt`, color: t.ink2 }}>
            {m.notes && (
              <div>
                <div className="uppercase" style={th}>Notes</div>
                <div className="whitespace-pre-line">{m.notes}</div>
              </div>
            )}
            {m.terms && (
              <div>
                <div className="uppercase" style={th}>Terms</div>
                <div className="whitespace-pre-line">{m.terms}</div>
              </div>
            )}
          </div>
        </Flash>
      )}

      {/* 7. Signature, or the electronic-document notice */}
      <SignatureBlock model={m} assets={assets} />

      {/* 8. Footer */}
      <div className="mt-[6mm] text-center" style={{ fontSize: `${t.tiny}pt`, color: t.ink3 }}>
        {m.footer}
      </div>
    </article>
  );
}
