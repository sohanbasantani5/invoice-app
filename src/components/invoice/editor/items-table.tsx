"use client";

import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Reorder, useDragControls } from "motion/react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { Field, Input, Select, controlCls } from "@/components/ui/field";
import { Section } from "./section";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { ItemRow } from "@/types/database";
import type { CalcResult } from "@/lib/invoice/calc";
import { ALL_GST_RATES, GST_RATES, MORE_GST_RATES, gstRateLabel } from "@/lib/india/gst-rates";
import { SAC_PRESETS, UNITS } from "@/lib/india/sac-presets";
import { formatAmount, formatMoney, paiseToInput } from "@/lib/format";
import { emptyLine } from "@/lib/invoice/document";
import { cn } from "@/lib/utils";

function Line({
  index,
  count,
  canTax,
  intra,
  options,
  amount,
  onAddAfter,
}: {
  index: number;
  count: number;
  canTax: boolean;
  intra: boolean;
  options: ComboOption<ItemRow>[];
  amount: number;
  onAddAfter: () => void;
}) {
  const { register, setValue, control } = useFormContext<InvoiceFormValues>();
  const name = useWatch({ control, name: `lines.${index}.name` });
  const gst = useWatch({ control, name: `lines.${index}.gst_rate` });
  const p = `lines.${index}` as const;
  const enterAdds = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && index === count - 1) {
      e.preventDefault();
      onAddAfter();
    }
  };
  const r = register;

  function pick(item: ItemRow) {
    setValue(`${p}.name`, item.name, { shouldDirty: true });
    setValue(`${p}.description`, item.description ?? "", { shouldDirty: true });
    setValue(`${p}.sac_hsn`, item.sac_hsn ?? "", { shouldDirty: true });
    setValue(`${p}.unit`, item.unit ?? "nos", { shouldDirty: true });
    setValue(`${p}.rate`, item.rate_paise ? paiseToInput(item.rate_paise) : "", { shouldDirty: true });
    setValue(`${p}.gst_rate`, canTax ? Number(item.gst_rate) : 0, { shouldDirty: true });
  }

  const rateOptions = ALL_GST_RATES.includes(Number(gst)) ? null : Number(gst);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <Combobox
          id={`line-${index}-name`}
          className="flex-1"
          ariaLabel={`Item ${index + 1}`}
          value={name ?? ""}
          onChange={(v) => setValue(`${p}.name`, v, { shouldDirty: true })}
          options={options}
          onSelect={(o) => pick(o.value)}
          placeholder="Podcast edit"
          inputClassName="font-medium"
          onKeyDown={enterAdds}
        />
        <span className="tnum hidden h-10 min-w-24 items-center justify-end text-sm font-medium sm:flex">{formatAmount(amount)}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.3fr_1.6fr]">
        <Field label="Qty" htmlFor={`line-${index}-qty`}>
          <Input id={`line-${index}-qty`} inputMode="decimal" className="tnum" placeholder="1" {...r(`${p}.quantity`)} onKeyDown={enterAdds} />
        </Field>
        <Field label="Unit" htmlFor={`line-${index}-unit`}>
          <Select id={`line-${index}-unit`} {...r(`${p}.unit`)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Rate (₹)" htmlFor={`line-${index}-rate`}>
          <Input id={`line-${index}-rate`} inputMode="decimal" className="tnum" placeholder="4,000" {...r(`${p}.rate`)} onKeyDown={enterAdds} />
        </Field>
        <Field label="GST" htmlFor={`line-${index}-gst`}>
          <Select id={`line-${index}-gst`} disabled={!canTax} {...r(`${p}.gst_rate`, { valueAsNumber: true })}>
            {GST_RATES.map((g) => (
              <option key={g} value={g}>
                {gstRateLabel(g, intra)}
              </option>
            ))}
            <optgroup label="More rates">
              {MORE_GST_RATES.map((g) => (
                <option key={g} value={g}>
                  {gstRateLabel(g, intra)}
                </option>
              ))}
            </optgroup>
            {rateOptions !== null && <option value={rateOptions}>{gstRateLabel(rateOptions, intra)}</option>}
          </Select>
        </Field>
      </div>
      <details className="group">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-xs text-ink-3 hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Description, SAC, discount</span>
          <span className="hidden group-open:inline">− Hide details</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Description" htmlFor={`line-${index}-desc`}>
            <Input id={`line-${index}-desc`} placeholder="Episode 12 – 45 min, colour + sound" {...r(`${p}.description`)} />
          </Field>
          <Field label="SAC / HSN" htmlFor={`line-${index}-sac`} badge={canTax ? "gst" : undefined}>
            <Input id={`line-${index}-sac`} list="sac-presets" className="font-mono" placeholder="999613" maxLength={10} {...r(`${p}.sac_hsn`)} />
          </Field>
          <Field label="Discount (₹)" htmlFor={`line-${index}-disc`}>
            <Input id={`line-${index}-disc`} inputMode="decimal" className="tnum" placeholder="0" {...r(`${p}.discount`)} onKeyDown={enterAdds} />
          </Field>
        </div>
      </details>
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-caption">Amount</span>
        <span className="tnum text-sm font-medium">{formatMoney(amount)}</span>
      </div>
    </div>
  );
}

function DraggableLine({
  value,
  children,
  onRemove,
  index,
}: {
  value: string;
  children: React.ReactNode;
  onRemove: () => void;
  index: number;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={value}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 40 }}
      className="relative list-none overflow-hidden border-b border-border bg-surface last:border-b-0"
    >
      <div className="flex gap-2 py-4">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="-ml-1 grid h-10 w-6 shrink-0 cursor-grab touch-none place-items-center text-ink-3 hover:text-ink active:cursor-grabbing"
          aria-label={`Drag to reorder item ${index + 1}`}
        >
          <GripVertical className="size-4 stroke-[1.5]" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="button"
          onClick={onRemove}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-danger"
          aria-label={`Remove item ${index + 1}`}
        >
          <Trash2 className="size-4 stroke-[1.5]" aria-hidden />
        </button>
      </div>
    </Reorder.Item>
  );
}

export function ItemsTable({ items, canTax, calc, defaultGst }: { items: ItemRow[]; canTax: boolean; calc: CalcResult; defaultGst: number }) {
  const { control, getValues } = useFormContext<InvoiceFormValues>();
  const { fields, append, remove, insert, move } = useFieldArray({ control, name: "lines", keyName: "_id" });

  const options = useMemo<ComboOption<ItemRow>[]>(
    () =>
      items.map((it) => ({
        id: it.id,
        label: it.name,
        hint: it.rate_paise ? formatMoney(it.rate_paise) : undefined,
        value: it,
      })),
    [items],
  );

  function add() {
    append(emptyLine(defaultGst), { shouldFocus: false });
    const next = fields.length;
    setTimeout(() => document.getElementById(`line-${next}-name`)?.focus(), 50);
  }

  function removeAt(i: number) {
    const removed = getValues(`lines.${i}`);
    remove(i);
    if (removed.name?.trim() || removed.rate?.trim())
      toast(`Removed “${removed.name || "item"}”`, { action: { label: "Undo", onClick: () => insert(i, removed) } });
  }

  const ids = fields.map((f) => f._id);
  return (
    <Section
      id="items"
      title="Items"
      summary={`${fields.filter((_, i) => getValues(`lines.${i}.name`)?.trim()).length} item(s)`}
    >
      <datalist id="sac-presets">
        {SAC_PRESETS.map((s) => (
          <option key={s.code} value={s.code}>
            {s.label}
          </option>
        ))}
      </datalist>
      {!canTax && (
        <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
          You can only charge GST after registering. Add your GSTIN in Settings to enable tax.
        </p>
      )}
      <Reorder.Group
        axis="y"
        values={ids}
        onReorder={(next: string[]) => {
          const from = ids.findIndex((id, i) => next[i] !== id);
          if (from < 0) return;
          const to = next.indexOf(ids[from]);
          move(from, to);
        }}
        className="-my-1"
      >
        {fields.map((f, i) => (
          <DraggableLine key={f._id} value={f._id} index={i} onRemove={() => removeAt(i)}>
            <Line
              index={i}
              count={fields.length}
              canTax={canTax}
              intra={calc.intraState}
              options={options}
              amount={calc.lines[i]?.amount ?? 0}
              onAddAfter={add}
            />
          </DraggableLine>
        ))}
      </Reorder.Group>
      <button
        type="button"
        onClick={add}
        className={cn(controlCls, "mt-3 flex items-center justify-center gap-2 border-dashed text-sm text-ink-2 hover:border-accent hover:text-accent")}
      >
        <Plus className="size-4 stroke-[1.5]" aria-hidden /> Add item
      </button>
      <p className="mt-2 text-caption">Tip: press Enter in the last row to add another. SAC codes are suggestions — confirm with your CA.</p>
    </Section>
  );
}
