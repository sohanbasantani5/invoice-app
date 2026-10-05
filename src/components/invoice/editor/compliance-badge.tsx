"use client";

import { useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import type { ComplianceItem } from "@/lib/invoice/compliance";
import { cn } from "@/lib/utils";

/** Where each checklist field lives in the editor (element id to scroll + focus). */
const TARGET: Record<string, string> = {
  "buyer.name": "buyer-name",
  "buyer.gstin": "buyer-gstin",
  "buyer.pan": "buyer-pan",
  "buyer.address": "buyer-address",
  "buyer.state_code": "buyer-state_code",
  lines: "line-0-name",
  "lines.sac_hsn": "items",
  invoice_number: "invoice_number",
  issue_date: "issue_date",
  due_date: "due_date",
  place_of_supply: "place_of_supply_code",
  "seller.address": "from",
  "seller.gstin": "from",
  "seller.payment": "from",
};

export function goToField(field: string) {
  const el = document.getElementById(TARGET[field] ?? field);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) setTimeout(() => el.focus({ preventScroll: true }), 300);
}

/** "All set ✓" or "3 to review": never red, never blocking (04 §7). Popover on desktop, bottom sheet on a phone. */
export function ComplianceBadge({ items, onOpenSection }: { items: ComplianceItem[]; onOpenSection: (field: string) => void }) {
  const [open, setOpen] = useState(false);
  const ok = items.length === 0;
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Compliance checklist"
      description={ok ? "Everything a complete invoice needs is here." : "Nothing here blocks saving or downloading."}
      triggerClassName={cn(
        "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium",
        ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      )}
      trigger={
        <>
          {ok ? <Check className="size-3.5" aria-hidden /> : <CircleAlert className="size-3.5" aria-hidden />}
          <span className={ok ? "max-sm:sr-only" : ""}>{ok ? "All set" : <>{items.length}<span className="max-sm:sr-only"> to review</span></>}</span>
        </>
      }
    >
      <p className="hidden px-2 pt-1 pb-2 text-caption sm:block">
        {ok ? "Everything a complete invoice needs is here." : "Nothing here blocks saving or downloading."}
      </p>
      <ul className="flex flex-col">
        {items.map((i) => (
          <li key={i.field}>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenSection(i.field);
                // Wait for the popover / sheet to close and the section to open, then scroll to the field.
                setTimeout(() => goToField(i.field), 260);
              }}
              className="flex w-full flex-col items-start rounded-lg px-2 py-2.5 text-left hover:bg-surface-2"
            >
              <span className="flex items-center gap-2 text-sm text-ink">
                {i.label}
                {i.severity === "required_for_gst" && <span className="rounded bg-warning/10 px-1.5 text-[10px] font-medium text-warning">GST</span>}
              </span>
              <span className="text-caption">{i.reason}</span>
            </button>
          </li>
        ))}
      </ul>
      <a
        href="https://cbic-gst.gov.in/gst-acts.html"
        target="_blank"
        rel="noreferrer"
        className="block px-2 pt-2 pb-1 text-xs text-ink-3 hover:text-ink"
      >
        Check with your CA for special cases ↗
      </a>
    </Popover>
  );
}
