"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Check } from "lucide-react";
import { TEMPLATES } from "../templates/registry";
import { cn } from "@/lib/utils";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

function Thumbnail({ id }: { id: string }) {
  switch (id) {
    case "rose":
      return (
        <div className="flex h-full w-full flex-col bg-[#fff5f7] p-2.5 text-[#b36b76]">
          <div className="mx-auto h-2 w-12 rounded bg-[#b36b76]/30" />
          <div className="mx-auto mt-1 h-1.5 w-16 rounded bg-[#b36b76]/20" />
          <div className="mt-2.5 grid grid-cols-2 gap-1">
            <div className="h-6 rounded bg-[#ffe4e8]" />
            <div className="h-6 rounded bg-[#ffe4e8]" />
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded bg-[#ffe4e8]" />
          <div className="mt-1.5 space-y-1">
            <div className="h-1 w-full rounded bg-[#b36b76]/20" />
            <div className="h-1 w-3/4 rounded bg-[#b36b76]/20" />
          </div>
        </div>
      );
    case "studio":
      return (
        <div className="flex h-full w-full flex-col bg-white">
          <div className="h-7 w-full bg-[#111014] p-1.5">
            <div className="h-1.5 w-10 rounded bg-white/60" />
            <div className="ml-auto mt-0.5 h-2 w-8 rounded-full bg-[#7b5cff]" />
          </div>
          <div className="h-0.5 w-full bg-[#7b5cff]" />
          <div className="p-2">
            <div className="grid grid-cols-2 gap-1">
              <div className="h-4 rounded bg-[#f6f4fa]" />
              <div className="h-4 border-l-2 border-[#111014] bg-[#f6f4fa]" />
            </div>
            <div className="mt-2 h-8 w-full rounded bg-[#111014]/90" />
          </div>
        </div>
      );
    case "creative":
      return (
        <div className="flex h-full w-full flex-col bg-white p-2">
          <div className="border-b-2 border-[#1c1917] pb-1.5">
            <div className="border-l-2 border-[#ea580c] pl-1">
              <div className="h-2 w-10 bg-[#1c1917]" />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full bg-[#e7e5e4]" />
            <div className="h-1 w-full bg-[#e7e5e4]" />
            <div className="h-1 w-2/3 bg-[#e7e5e4]" />
          </div>
          <div className="mt-auto ml-auto h-5 w-12 rounded bg-[#fff7ed] border border-[#ea580c]/30" />
        </div>
      );
    case "bakery":
      return (
        <div className="flex h-full w-full flex-col bg-[#fffbeb] p-2">
          <div className="rounded-lg border border-[#fde68a] bg-[#fef8ee] p-1.5">
            <div className="h-2 w-10 rounded bg-[#451a03]" />
            <div className="ml-auto h-2 w-6 rounded-full bg-[#d97706]" />
          </div>
          <div className="mt-1.5 flex gap-1">
            <div className="h-2.5 w-8 rounded-full bg-[#fef3c7]" />
            <div className="h-2.5 w-8 rounded-full bg-[#fef3c7]" />
          </div>
          <div className="mt-2 h-7 w-full rounded-md bg-[#fef3c7]" />
        </div>
      );
    case "pink_modern":
      return (
        <div className="flex h-full w-full flex-col border-l-4 border-[#db2777] bg-[#fdf2f8] p-2">
          <div className="border-b-2 border-[#db2777] pb-1">
            <div className="h-2 w-12 rounded bg-[#831843]" />
          </div>
          <div className="mt-1.5 h-3 w-full rounded bg-[#fce7f3] border border-[#fbcfe8]" />
          <div className="mt-2 h-6 w-full rounded bg-[#db2777]" />
        </div>
      );
    case "elegant":
      return (
        <div className="flex h-full w-full flex-col bg-white p-1">
          <div className="flex h-full w-full flex-col border border-[#292524] p-1">
            <div className="flex h-full w-full flex-col border border-[#292524] p-1">
              <div className="border-b-2 border-double border-[#292524] pb-1">
                <div className="h-2 w-10 bg-[#292524]" />
              </div>
              <div className="mt-1.5 h-3 w-full bg-[#fff1f2] border border-[#e7e5e4]" />
              <div className="mt-auto ml-auto h-4 w-10 bg-[#fff1f2] border border-[#e7e5e4]" />
            </div>
          </div>
        </div>
      );
    case "lime":
      return (
        <div className="flex h-full w-full flex-col bg-white p-2">
          <div className="rounded bg-[#1a2e05] p-1.5 text-[#84cc16]">
            <div className="h-2 w-10 rounded bg-[#84cc16]" />
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-1 border-2 border-[#1a2e05] bg-[#f7fee7] p-1">
            <div className="h-2 bg-[#1a2e05]/20" />
            <div className="h-2 bg-[#1a2e05]/20" />
          </div>
          <div className="mt-2 h-6 w-full bg-[#1a2e05]" />
        </div>
      );
    case "dynamic":
      return (
        <div className="flex h-full w-full flex-col border-t-4 border-[#881337] bg-white p-2">
          <div className="flex justify-between border-b-2 border-[#881337] pb-1">
            <div className="h-2 w-10 bg-[#881337]" />
            <div className="h-3 w-7 bg-[#be185d]" />
          </div>
          <div className="mt-1.5 h-3 w-full border-2 border-[#be185d] bg-[#fff1f2]" />
          <div className="mt-auto ml-auto h-5 w-12 rounded bg-[#881337]" />
        </div>
      );
    default:
      return (
        <div className="flex h-full w-full flex-col bg-white p-2">
          <div className="flex justify-between border-b border-[#E4E1D9] pb-2">
            <div className="h-2 w-10 rounded bg-[#17181B]" />
            <div className="h-2 w-6 rounded bg-[#676A72]" />
          </div>
          <div className="mt-2 h-2 w-full rounded bg-[#EDEDEB]" />
          <div className="mt-2 space-y-1">
            <div className="h-1 w-full rounded bg-[#EDEDEB]" />
            <div className="h-1 w-full rounded bg-[#EDEDEB]" />
          </div>
        </div>
      );
  }
}

export function TemplateSelector() {
  const { setValue, control } = useFormContext<InvoiceFormValues>();
  const templateId = useWatch({ control, name: "template_id" }) || "default";

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {TEMPLATES.map((t) => {
        const selected = templateId === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setValue("template_id", t.id, { shouldDirty: true, shouldTouch: true })}
            className={cn(
              "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all hover:border-ink-2",
              selected ? "border-ink-2 ring-1 ring-ink-2" : "border-border",
            )}
          >
            <div className="relative aspect-[1/1.4] w-full overflow-hidden bg-surface-2">
              <Thumbnail id={t.id} />
              {selected && (
                <div className="absolute right-2 top-2 z-10 grid size-6 place-items-center rounded-full bg-ink text-surface shadow-sm">
                  <Check className="size-3.5" strokeWidth={3} />
                </div>
              )}
            </div>
            <div className="border-t border-border bg-surface px-3 py-2">
              <div className="font-medium text-sm">{t.name}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
