import type { InvoiceStatus } from "@/types/database";
import { isOverdue } from "@/lib/invoice/overdue";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

const STYLE: Record<InvoiceStatus | "overdue", { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-ink-3/10 text-ink-2 [--dot:var(--ink-3)]" },
  sent: { label: "Sent", cls: "bg-info/10 text-info [--dot:var(--info)]" },
  partially_paid: { label: "Part paid", cls: "bg-warning/10 text-warning [--dot:var(--warning)]" },
  paid: { label: "Paid", cls: "bg-success/10 text-success [--dot:var(--success)]" },
  cancelled: { label: "Cancelled", cls: "bg-ink-3/10 text-ink-3 line-through [--dot:var(--ink-3)]" },
  overdue: { label: "Overdue", cls: "bg-danger/10 text-danger [--dot:var(--danger)]" },
};

export function effectiveStatus(status: InvoiceStatus, dueDate: string | null, today = todayISO()) {
  return isOverdue(status, dueDate, today) ? "overdue" : status;
}

/** Soft tinted pill + dot (02 §2). Overdue is computed, never stored. */
export function StatusPill({ status, dueDate, className }: { status: InvoiceStatus; dueDate: string | null; className?: string }) {
  const s = STYLE[effectiveStatus(status, dueDate)];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", s.cls, className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-[var(--dot)]" />
      {s.label}
    </span>
  );
}
