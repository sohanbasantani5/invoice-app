"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/shell/empty-state";
import { deleteItem, saveItem, type ItemInput } from "@/lib/actions/library";
import { ALL_GST_RATES } from "@/lib/india/gst-rates";
import { SAC_PRESETS, UNITS } from "@/lib/india/sac-presets";
import { formatMoney, paiseToInput } from "@/lib/format";
import type { ItemRow } from "@/types/database";

function ItemForm({ item, canTax, onDone }: { item: ItemRow | null; canTax: boolean; onDone: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<ItemInput>({
    name: item?.name ?? "",
    description: item?.description ?? "",
    sac_hsn: item?.sac_hsn ?? "",
    unit: item?.unit ?? "nos",
    rate: item ? paiseToInput(item.rate_paise) : "",
    gst_rate: item ? Number(item.gst_rate) : canTax ? 18 : 0,
  });
  const [pending, start] = useTransition();
  const set = (k: keyof ItemInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="grid grid-cols-2 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveItem(item?.id ?? null, v);
          if (!r.ok) return void toast.error(r.error);
          toast.success(item ? "Item updated" : "Item added");
          onDone();
          router.refresh();
        });
      }}
    >
      <Field label="Name" htmlFor="it-name" badge="required" className="col-span-2">
        <Input id="it-name" placeholder="Podcast edit" value={v.name} onChange={set("name")} />
      </Field>
      <Field label="Description" htmlFor="it-desc" badge="optional" className="col-span-2">
        <Input id="it-desc" value={v.description} onChange={set("description")} />
      </Field>
      <Field label="SAC / HSN" htmlFor="it-sac" badge="optional">
        <Input id="it-sac" list="sac-presets-lib" className="font-mono" value={v.sac_hsn} onChange={set("sac_hsn")} />
        <datalist id="sac-presets-lib">
          {SAC_PRESETS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </datalist>
      </Field>
      <Field label="Unit" htmlFor="it-unit">
        <Select id="it-unit" value={v.unit} onChange={set("unit")}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
      </Field>
      <Field label="Rate (₹)" htmlFor="it-rate">
        <Input id="it-rate" inputMode="decimal" className="tnum" placeholder="4,000" value={v.rate} onChange={set("rate")} />
      </Field>
      <Field label="GST %" htmlFor="it-gst">
        <Select id="it-gst" value={String(v.gst_rate)} onChange={set("gst_rate")}>
          {ALL_GST_RATES.map((g) => (
            <option key={g} value={g}>
              {g}%
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending} className="col-span-2">
        {pending ? "Saving…" : item ? "Save changes" : "Add item"}
      </Button>
    </form>
  );
}

export function ItemsLibrary({ items, canTax }: { items: ItemRow[]; canTax: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ItemRow | "new" | null>(null);
  const [, start] = useTransition();

  function remove(it: ItemRow) {
    if (!window.confirm(`Remove “${it.name}” from your library? Past invoices aren't affected.`)) return;
    start(async () => {
      const r = await deleteItem(it.id);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Item removed");
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")}>
          <Plus aria-hidden /> Add item
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Package} text="Items you type on invoices are saved here automatically." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">SAC</th>
                <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">GST</th>
                <th className="hidden px-4 py-2.5 text-right font-medium md:table-cell">Used</th>
                <th className="w-24 px-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="max-w-64 px-4 py-3">
                    <div className="truncate font-medium">{it.name}</div>
                    {it.description && <div className="truncate text-xs text-ink-3">{it.description}</div>}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-ink-2 sm:table-cell">{it.sac_hsn ?? "—"}</td>
                  <td className="tnum px-4 py-3 text-right whitespace-nowrap">
                    {formatMoney(it.rate_paise)}
                    <span className="text-ink-3"> / {it.unit ?? "nos"}</span>
                  </td>
                  <td className="tnum hidden px-4 py-3 text-right sm:table-cell">{Number(it.gst_rate)}%</td>
                  <td className="tnum hidden px-4 py-3 text-right text-ink-3 md:table-cell">{it.use_count}×</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${it.name}`} onClick={() => setEditing(it)}>
                      <Pencil aria-hidden />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${it.name}`} onClick={() => remove(it)}>
                      <Trash2 aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? "Add item" : "Edit item"}>
        {editing !== null && <ItemForm key={editing === "new" ? "new" : editing.id} item={editing === "new" ? null : editing} canTax={canTax} onDone={() => setEditing(null)} />}
      </Dialog>
    </>
  );
}
