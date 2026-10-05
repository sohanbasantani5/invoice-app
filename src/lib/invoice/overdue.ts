import type { InvoiceStatus } from "@/types/database";

/** Is this invoice overdue today? (not stored, 03 §3). Tiny on purpose: every page's status pill imports it. */
export function isOverdue(status: InvoiceStatus, dueDate: string | null, today: string): boolean {
  return (status === "sent" || status === "partially_paid") && !!dueDate && dueDate < today;
}
