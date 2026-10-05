"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { deleteDrafts, deleteInvoices, restoreDrafts } from "@/lib/actions/invoice";
import type { InvoiceStatus } from "@/types/database";

export type DeletableInvoice = { id: string; number: string; status: InvoiceStatus };

const UNDO_MS = 8000;

/**
 * One delete flow for every place that has a Delete button.
 * Drafts: a plain confirm, then an 8-second Undo toast.
 * Anything that was issued (Sent / Paid / Partially paid / Cancelled): a stronger warning and the invoice number
 * (or DELETE for several) has to be typed. The server checks that text again.
 */
export function DeleteInvoicesDialog({
  items,
  onClose,
  onDeleted,
  onRestored,
}: {
  items: DeletableInvoice[] | null;
  onClose: () => void;
  /** Called once the server has deleted them (hide the rows / leave the page). */
  onDeleted: (ids: string[]) => void;
  onRestored?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const list = items ?? [];
  const single = list.length === 1;
  const allDrafts = list.every((i) => i.status === "draft");
  const expected = single ? list[0].number : "DELETE";
  const label = single ? list[0].number : `${list.length} invoices`;

  function close() {
    setTyped("");
    onClose();
  }

  function submit() {
    const ids = list.map((i) => i.id);
    start(async () => {
      if (allDrafts) {
        const r = await deleteDrafts(ids);
        if (!r.ok) return void toast.error(r.error);
        close();
        onDeleted(ids);
        toast(single ? `Deleted draft ${list[0].number}` : `Deleted ${list.length} drafts`, {
          duration: UNDO_MS,
          action: {
            label: "Undo",
            onClick: () =>
              void restoreDrafts(r.snapshots).then((u) => {
                if (!u.ok) return void toast.error(u.error);
                toast.success("Restored");
                onRestored?.(ids);
                router.refresh();
              }),
          },
        });
      } else {
        const r = await deleteInvoices(ids, typed);
        if (!r.ok) return void toast.error(r.error);
        close();
        onDeleted(ids);
        toast.success(single ? `Deleted ${list[0].number}` : `Deleted ${list.length} invoices`);
      }
      router.refresh();
    });
  }

  return (
    <Dialog
      open={list.length > 0}
      onOpenChange={(o) => !o && close()}
      title={allDrafts ? (single ? `Delete draft ${label}?` : `Delete ${list.length} drafts?`) : `Delete ${single ? "invoice " : ""}${label}?`}
      description={allDrafts ? `You'll have ${UNDO_MS / 1000} seconds to undo.` : undefined}
    >
      {allDrafts ? (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Keep
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div role="alert" className="flex gap-3 rounded-lg bg-danger/10 p-3 text-sm text-ink-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-danger" aria-hidden />
            <div className="flex flex-col gap-2">
              <p>
                This permanently deletes {single ? "the invoice" : "these invoices"}, {single ? "its" : "their"} payments and the saved PDFs. It can&apos;t be undone.
              </p>
              <p>
                It also leaves a <strong className="font-medium text-ink">gap in your invoice number sequence</strong>, and GST rules expect numbers to run without gaps.
                For an invoice you have really issued, <strong className="font-medium text-ink">Cancel</strong> is usually better: it keeps the number and marks it CANCELLED.
              </p>
              {!single && (
                <ul className="list-disc pl-5 text-ink-3">
                  {list.slice(0, 6).map((i) => (
                    <li key={i.id}>
                      <span className="font-mono text-xs">{i.number}</span> ({i.status.replace("_", " ")})
                    </li>
                  ))}
                  {list.length > 6 && <li>and {list.length - 6} more</li>}
                </ul>
              )}
            </div>
          </div>
          <Field label={`Type ${expected} to confirm`} htmlFor="delete-confirm">
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Keep {single ? "invoice" : "them"}
            </Button>
            <Button variant="destructive" onClick={submit} disabled={pending || typed.trim() !== expected}>
              {pending ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
