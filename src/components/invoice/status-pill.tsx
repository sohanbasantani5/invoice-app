import type { InvoiceStatus } from "@/types/database";
import { effectiveStatus, STATUS_LABELS, type EffectiveStatus } from "@/lib/invoice/status";
import { cn } from "@/lib/utils";

const CLS: Record<EffectiveStatus, string> = {
  draft: "bg-ink-3/10 text-ink-2 [--dot:var(--ink-3)]",
  sent: "bg-info/10 text-info [--dot:var(--info)]",
  partially_paid: "bg-warning/10 text-warning [--dot:var(--warning)]",
  paid: "bg-success/10 text-success [--dot:var(--success)]",
  cancelled: "bg-ink-3/10 text-ink-3 line-through [--dot:var(--ink-3)]",
  overdue: "bg-danger/10 text-danger [--dot:var(--danger)]",
};

export { effectiveStatus } from "@/lib/invoice/status";

/** Soft tinted pill + dot (02 §2). Overdue is computed, never stored. */
export function StatusPill({ status, dueDate, className }: { status: InvoiceStatus; dueDate: string | null; className?: string }) {
  const s = effectiveStatus(status, dueDate);
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", CLS[s], className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--dot)]" />
      {STATUS_LABELS[s]}
    </span>
  );
}
