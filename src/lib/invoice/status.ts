// Effective (display) invoice status. `overdue` is computed, never stored — the database keeps
// the single source of truth (draft/sent/paid/partially_paid/cancelled) and this is the only
// place that turns it into what the user sees, so the list, exports and the report agree.

import type { InvoiceStatus } from "@/types/database";
import { isOverdue } from "./overdue";
import { todayISO } from "@/lib/format";

export type EffectiveStatus = InvoiceStatus | "overdue";

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Part paid",
  paid: "Paid",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export function effectiveStatus(status: InvoiceStatus, dueDate: string | null, today = todayISO()): EffectiveStatus {
  return isOverdue(status, dueDate, today) ? "overdue" : status;
}

export function statusLabel(status: InvoiceStatus, dueDate: string | null, today = todayISO()): string {
  return STATUS_LABELS[effectiveStatus(status, dueDate, today)];
}
