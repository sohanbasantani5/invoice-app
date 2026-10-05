"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

/**
 * Single-series column chart in plain HTML. Columns ≤ 24px with a 4px rounded top,
 * square at the baseline; values live in a hover/focus tooltip and a screen-reader table.
 */
export function MonthlyChart({ months }: { months: { label: string; paise: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => m.paise), 1);
  const peak = months.reduce((best, m, i) => (m.paise > months[best].paise ? i : best), 0);

  return (
    <div className="mt-2 pt-8">
      <div className="relative h-48" aria-hidden>
        {[0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-dashed border-border" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 grid grid-cols-12 items-end gap-0.5 border-b border-border-strong">
          {months.map((m, i) => (
            <div
              key={m.label}
              className="relative flex h-full items-end justify-center"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <div
                className="w-full max-w-6 rounded-t-[4px] bg-accent transition-[height,opacity] duration-300"
                style={{ height: `${(m.paise / max) * 100}%`, opacity: active === null || active === i ? 1 : 0.55 }}
              />
              {(active === i || (active === null && i === peak && m.paise > 0)) && (
                <div className={`pointer-events-none absolute bottom-full z-10 mb-1 rounded-md border border-border bg-surface px-2 py-1 text-xs whitespace-nowrap shadow-float ${i < 2 ? "left-0" : i > 9 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
                  <span className="text-ink-3">{m.label} </span>
                  <span className="tnum font-medium text-ink">{formatMoney(m.paise)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-12 gap-0.5 text-center text-[11px] text-ink-3" aria-hidden>
        {months.map((m) => (
          <span key={m.label}>{m.label}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Amount billed per month</caption>
        <tbody>
          {months.map((m) => (
            <tr key={m.label}>
              <th scope="row">{m.label}</th>
              <td>{formatMoney(m.paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
