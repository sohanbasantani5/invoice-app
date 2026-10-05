"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as m from "motion/react-m";
import { Ban, Copy, Download, IndianRupee, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatusPill } from "@/components/invoice/status-pill";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Button, buttonVariants } from "@/components/ui/button";
import dynamic from "next/dynamic";
import type { DeletableInvoice } from "@/components/invoice/delete-invoices";
import { changeStatus } from "@/lib/actions/invoice";
import { booted } from "@/components/motion/boot";
import { formatDate, formatMoney } from "@/lib/format";
import type { InvoiceStatus } from "@/types/database";

export type ListInvoice = {
  id: string;
  number: string;
  client: string;
  issueDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  totalPaise: number;
  balancePaise: number;
  currency: string;
};

// Rarely used, so they are fetched when first opened instead of weighing down every page load.
const DeleteInvoicesDialog = dynamic(() => import("@/components/invoice/delete-invoices").then((m) => m.DeleteInvoicesDialog));
const PayDialog = dynamic(() => import("@/components/invoice/pay-dialog").then((m) => m.PayDialog));

/** Stagger 30ms when rows first mount, max 8 rows; refetches keep mounted rows still (02 §8). */
const firstLoad = (i: number) =>
  i >= 8 || !booted()
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.03, duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } };

/** Drafts open straight in the editor; everything else opens the read-only view. */
const openHref = (inv: ListInvoice) => (inv.status === "draft" ? `/invoices/${inv.id}/edit` : `/invoices/${inv.id}`);

export function InvoiceList({ invoices }: { invoices: ListInvoice[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState<ListInvoice | null>(null);
  const [shown, setShown] = useState<Record<string, InvoiceStatus>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<DeletableInvoice[] | null>(null);
  const [, start] = useTransition();

  /** Status change that shows instantly and rolls back if the server refuses. */
  function setStatus(inv: ListInvoice, to: "sent" | "cancelled", done: string) {
    setShown((m) => ({ ...m, [inv.id]: to }));
    start(async () => {
      const r = await changeStatus({ id: inv.id, to });
      if (!r.ok) {
        toast.error(r.error);
        setShown((m) => {
          const n = { ...m };
          delete n[inv.id];
          return n;
        });
        return;
      }
      toast.success(done);
      router.refresh();
    });
  }

  const rows = invoices.filter((i) => !hidden.has(i.id)).map((i) => (shown[i.id] ? { ...i, status: shown[i.id] } : i));
  const chosen = rows.filter((r) => selected.has(r.id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toDelete = (list: ListInvoice[]) => setDeleting(list.map((i) => ({ id: i.id, number: i.number, status: i.status })));
  const checkbox = (inv: ListInvoice) => (
    <input
      type="checkbox"
      checked={selected.has(inv.id)}
      onChange={() => toggle(inv.id)}
      aria-label={`Select ${inv.number}`}
      className="size-4 shrink-0 cursor-pointer accent-[var(--accent)]"
    />
  );

  const actions = (inv: ListInvoice) => (
    <Menu
      triggerLabel={`Actions for ${inv.number}`}
      triggerClassName={buttonVariants({ variant: "ghost", size: "icon-sm" })}
      trigger={<MoreHorizontal aria-hidden />}
    >
      {inv.status !== "cancelled" && (
        <MenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
          <Pencil aria-hidden /> Edit
        </MenuItem>
      )}
      <MenuItem onClick={() => router.push(`/invoices/${inv.id}?download=1`)}>
        <Download aria-hidden /> Download PDF
      </MenuItem>
      <MenuItem onClick={() => router.push(`/invoices/new?from=${inv.id}`)}>
        <Copy aria-hidden /> Duplicate
      </MenuItem>
      {inv.status === "draft" && (
        <MenuItem onClick={() => setStatus(inv, "sent", `${inv.number} marked as sent`)}>
          <Send aria-hidden /> Mark as sent
        </MenuItem>
      )}
      {(inv.status === "sent" || inv.status === "partially_paid") && (
        <MenuItem onClick={() => setPaying(inv)}>
          <IndianRupee aria-hidden /> Mark as paid
        </MenuItem>
      )}
      {inv.status !== "draft" && inv.status !== "cancelled" && (
        <>
          <MenuSeparator />
          <MenuItem
            danger
            onClick={() => {
              if (window.confirm(`Cancel ${inv.number}? It keeps its number and gets a CANCELLED mark.`))
                setStatus(inv, "cancelled", `${inv.number} cancelled`);
            }}
          >
            <Ban aria-hidden /> Cancel invoice
          </MenuItem>
        </>
      )}
      <MenuSeparator />
      <MenuItem danger onClick={() => toDelete([inv])}>
        <Trash2 aria-hidden /> Delete
      </MenuItem>
    </Menu>
  );

  return (
    <>
      {chosen.length > 0 && (
        <div role="region" aria-label="Selected invoices" className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 shadow-float">
          <p className="text-sm font-medium">{chosen.length} selected</p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => toDelete(chosen)}>
              <Trash2 aria-hidden /> Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2 text-left text-xs text-ink-3">
            <tr>
              <th className="w-10 py-2.5 pl-4">
                <input
                  type="checkbox"
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(rows.map((r) => r.id)))}
                  aria-label="Select all invoices"
                  className="size-4 cursor-pointer accent-[var(--accent)]"
                />
              </th>
              <th className="px-4 py-2.5 font-medium">Number</th>
              <th className="px-4 py-2.5 font-medium">Client</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-right font-medium">Balance</th>
              <th className="w-20 px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv, i) => (
              <m.tr key={inv.id} {...firstLoad(i)} className={`border-t border-border hover:bg-surface-2/60 ${selected.has(inv.id) ? "bg-accent-soft/50" : ""}`}>
                <td className="w-10 py-3 pl-4">{checkbox(inv)}</td>
                <td className="px-4 py-3 font-mono text-[0.8125rem]">
                  <Link href={openHref(inv)} className="hover:text-accent hover:underline">
                    {inv.number}
                  </Link>
                </td>
                <td className="max-w-56 truncate px-4 py-3">
                  <Link href={openHref(inv)} className="hover:text-accent">
                    {inv.client}
                  </Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(inv.issueDate)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-2">{formatDate(inv.dueDate) || "—"}</td>
                <td className="px-4 py-3">
                  <StatusPill status={inv.status} dueDate={inv.dueDate} />
                </td>
                <td className="tnum px-4 py-3 text-right whitespace-nowrap">{formatMoney(inv.totalPaise, inv.currency)}</td>
                <td className="tnum px-4 py-3 text-right whitespace-nowrap text-ink-2">
                  {inv.status === "draft" || inv.status === "cancelled" ? "—" : formatMoney(Math.max(0, inv.balancePaise), inv.currency)}
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    {inv.status !== "cancelled" && (
                      <Link href={`/invoices/${inv.id}/edit`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`Edit ${inv.number}`} title="Edit">
                        <Pencil aria-hidden />
                      </Link>
                    )}
                    {actions(inv)}
                  </div>
                </td>
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((inv, i) => (
          <m.li key={inv.id} {...firstLoad(i)} className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3">
            {checkbox(inv)}
            <Link href={openHref(inv)} className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{inv.client}</span>
                <span className="tnum shrink-0 font-medium">{formatMoney(inv.totalPaise, inv.currency)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-ink-3">
                  {inv.number} · {formatDate(inv.issueDate)}
                </span>
                <StatusPill status={inv.status} dueDate={inv.dueDate} />
              </div>
            </Link>
            {actions(inv)}
          </m.li>
        ))}
      </ul>

      {deleting && (
        <DeleteInvoicesDialog
          items={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(ids) => {
            setHidden((h) => new Set([...h, ...ids]));
            setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
          }}
          onRestored={(ids) =>
            setHidden((h) => {
              const n = new Set(h);
              ids.forEach((id) => n.delete(id));
              return n;
            })
          }
        />
      )}

      {paying && <PayDialog invoice={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
