"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/field";
import { Section } from "./section";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { PaperModel } from "@/lib/invoice/paper-model";
import type { CalcResult } from "@/lib/invoice/calc";
import { formatMoney } from "@/lib/format";

/** Short 150ms count to the new value; no bounce (02 §8). */
export function Ticker({ paise, currency = "INR" }: { paise: number; currency?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(paise);
  const from = useRef(paise);
  useEffect(() => {
    if (reduce) {
      from.current = paise;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced motion: jump straight to the value
      setShown(paise);
      return;
    }
    const c = animate(from.current, paise, {
      duration: 0.15,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    from.current = paise;
    return () => c.stop();
  }, [paise, reduce]);
  return <span className="tnum">{formatMoney(shown, currency)}</span>;
}

export function TotalsCard({ model, calc, currency }: { model: PaperModel; calc: CalcResult; currency: string }) {
  const { register } = useFormContext<InvoiceFormValues>();
  const r = register;
  return (
    <Section id="totals" title="Tax & totals" summary={formatMoney(calc.total, currency)}>
      <dl className="flex flex-col gap-1.5 text-sm">
        {model.totals.map((t) => (
          <div
            key={t.label}
            className={
              t.rule
                ? "mt-1 flex justify-between border-t border-ink pt-2.5 text-[1.0625rem] font-semibold"
                : `flex justify-between ${t.strong ? "font-semibold" : "text-ink-2"} ${t.accent ? "text-accent" : ""}`
            }
          >
            <dt>{t.label}</dt>
            <dd className="tnum">{t.rule ? <Ticker paise={calc.total} currency={currency} /> : t.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-caption">{model.words}</p>
      <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4">
        <Switch label="Round off to the nearest rupee" {...r("round_off_enabled")} />
      </div>
    </Section>
  );
}
