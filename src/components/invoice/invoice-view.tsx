"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, MoreHorizontal, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { EmailButton } from "./email-button";
import { StatusControl, type StatusState } from "./status-control";
import { StatusPill } from "./status-pill";
import { InvoicePaper, type PaperAssets } from "./preview/invoice-paper";
import { ScaledPaper } from "./preview/scaled-paper";
import { qrDataUrl, useQr } from "./preview/use-assets";
import { calcDocument } from "@/lib/invoice/document";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { changeStatus } from "@/lib/actions/invoice";
import { DeleteInvoicesDialog, type DeletableInvoice } from "./delete-invoices";
import type { EmailConfig } from "@/lib/invoice/email";
import type { InvoiceDocument } from "@/lib/invoice/types";
import type { PaymentMethod } from "@/types/database";

/** Read-only invoice page: the A4 paper, one status control, and Edit / Email / Download. */
export function InvoiceView({
  doc: base,
  invoiceId,
  email,
  assets,
  lastMethod,
  children,
}: {
  doc: InvoiceDocument;
  invoiceId: string;
  email: EmailConfig;
  assets: PaperAssets;
  lastMethod: PaymentMethod;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<StatusState>({ status: base.status, amountPaidPaise: base.amount_paid_paise });
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState<DeletableInvoice[] | null>(null);

  const doc = useMemo(() => ({ ...base, status: state.status, amount_paid_paise: state.amountPaidPaise }), [base, state]);
  const calc = useMemo(() => calcDocument(doc), [doc]);
  const model = useMemo(() => buildPaperModel(doc, calc), [doc, calc]);
  const qr = useQr(model.payment.upiText);
  const paperAssets = useMemo(() => ({ ...assets, qrDataUrl: qr }), [assets, qr]);
  const cancelled = state.status === "cancelled";

  async function download() {
    setDownloading(true);
    try {
      const qrUrl = model.payment.upiText ? await qrDataUrl(model.payment.upiText) : null;
      const { downloadInvoicePdf, pdfFileName } = await import("./pdf/download");
      await downloadInvoicePdf(model, { ...assets, qrDataUrl: qrUrl }, pdfFileName(doc.invoice_number, doc.buyer.name));
    } catch (e) {
      toast.error("Couldn't create the PDF. Try the print view instead.");
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  // Opened from the list's "Download PDF" (?download=1).
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("download") !== "1") return;
    url.searchParams.delete("download");
    window.history.replaceState(null, "", url.pathname + url.search);
    const t = setTimeout(() => void download(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /** Email marks a draft as sent (01 §2). */
  async function prepareEmail() {
    if (state.status === "draft") {
      const prev = state;
      setState({ status: "sent", amountPaidPaise: 0 });
      const r = await changeStatus({ id: invoiceId, to: "sent" });
      if (!r.ok) {
        setState(prev);
        toast.error(r.error);
        return null;
      }
      router.refresh();
    }
    return { invoiceId, doc: { ...doc, status: state.status === "draft" ? ("sent" as const) : state.status } };
  }

  const editButton = cancelled ? (
    <Button variant="secondary" disabled title="Cancelled invoices are read-only. Change the status to reopen.">
      <Pencil aria-hidden /> Edit
    </Button>
  ) : (
    <Link href={`/invoices/${invoiceId}/edit`} className={buttonVariants({ variant: "primary" })}>
      <Pencil aria-hidden /> Edit
    </Link>
  );

  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 md:px-6 md:py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/invoices" className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label="Back to invoices">
          <ArrowLeft aria-hidden />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate font-heading text-[1.25rem] font-semibold">{doc.invoice_number}</h1>
          <StatusPill status={state.status} dueDate={doc.due_date} />
        </div>
        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
          {editButton}
          <EmailButton prepare={prepareEmail} config={email} assets={assets} />
          <Button variant="secondary" onClick={() => void download()} disabled={downloading} aria-label="Download PDF">
            <Download aria-hidden /> <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download"}</span>
          </Button>
          <Menu triggerLabel="More actions" triggerClassName={buttonVariants({ variant: "ghost", size: "icon", className: "ml-auto sm:ml-0" })} trigger={<MoreHorizontal aria-hidden />}>
            <MenuItem onClick={() => router.push(`/invoices/new?from=${invoiceId}`)}>
              <Copy aria-hidden /> Duplicate
            </MenuItem>
            <MenuItem onClick={() => window.open(`/invoices/${invoiceId}/print`, "_blank")}>
              <Printer aria-hidden /> Print view
            </MenuItem>
            <MenuSeparator />
            <MenuItem danger onClick={() => setDeleting([{ id: invoiceId, number: doc.invoice_number, status: state.status }])}>
              <Trash2 aria-hidden /> Delete
            </MenuItem>
          </Menu>
        </div>
      </div>

      <div className="mt-5">
        <StatusControl
          invoiceId={invoiceId}
          number={doc.invoice_number}
          state={state}
          payablePaise={calc.total - calc.tds}
          currency={doc.currency}
          lastMethod={lastMethod}
          onChange={setState}
        />
      </div>

      <div className="mt-6 rounded-xl bg-surface-2 p-3 sm:p-6">
        <ScaledPaper>
          <InvoicePaper model={model} assets={paperAssets} />
        </ScaledPaper>
      </div>

      {children && <div className="mt-6">{children}</div>}

      <DeleteInvoicesDialog items={deleting} onClose={() => setDeleting(null)} onDeleted={() => router.push("/invoices")} />
    </div>
  );
}
