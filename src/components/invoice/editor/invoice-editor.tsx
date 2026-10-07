"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, FileText, Info, MoreHorizontal, Printer, RefreshCw, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { Section } from "./section";
import { BillTo } from "./bill-to";
import { DetailsCard } from "./details-card";
import { ItemsTable } from "./items-table";
import { Ticker, TotalsCard } from "./totals-card";
import { PaymentNotes } from "./payment-notes";
import { ComplianceBadge } from "./compliance-badge";
import { InvoicePaper, type PaperAssets } from "../preview/invoice-paper";
import { ScaledPaper } from "../preview/scaled-paper";
import { qrDataUrl, useQr } from "../preview/use-assets";
import { StatusPill } from "../status-pill";
import { EmailButton } from "../email-button";
import { calcDocument, formToDocument } from "@/lib/invoice/document";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { complianceChecklist } from "@/lib/invoice/compliance";
import { chargesTax } from "@/lib/invoice/doc-type";
import { saveInvoice, type SaveMode } from "@/lib/actions/invoice";
import { DeleteInvoicesDialog, type DeletableInvoice } from "../delete-invoices";
import type { EmailConfig } from "@/lib/invoice/email";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { SellerSnapshot } from "@/lib/invoice/types";
import type { ClientRow, InvoiceStatus, ItemRow } from "@/types/database";
import { stateLabel } from "@/lib/india/states";
import { cn } from "@/lib/utils";

export type EditorProps = {
  initial: InvoiceFormValues;
  seller: SellerSnapshot;
  /** Today's profile as a snapshot, for "Refresh my details from profile". */
  profileSeller: SellerSnapshot;
  status: InvoiceStatus;
  amountPaidPaise: number;
  clients: ClientRow[];
  items: ItemRow[];
  assets: PaperAssets;
  defaultGst: number;
  email: EmailConfig;
  /** Rendered under the form for saved invoices (payments). */
  children?: React.ReactNode;
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** JSON with sorted keys, so "did anything change?" doesn't depend on key order. */
function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  );
}

function relativeTime(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function InvoiceEditor({ initial, seller: initialSeller, profileSeller, status: initialStatus, amountPaidPaise, clients, items, assets, defaultGst, email, children }: EditorProps) {
  const router = useRouter();
  const form = useForm<InvoiceFormValues>({ defaultValues: initial, mode: "onBlur" });
  const { control, getValues, setValue } = form;
  const values = useWatch({ control }) as InvoiceFormValues;
  const preview = useDebounced(values, 150);

  const [seller, setSeller] = useState(initialSeller);
  const [refreshSeller, setRefreshSeller] = useState(false);
  // Signature uploaded in the editor (profile-level, like the logo). Kept in state so the preview,
  // the downloaded PDF and the emailed PDF all use the new image before/without a reload.
  const [signaturePath, setSignaturePath] = useState<string | null>(initialSeller.signature_path ?? null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(assets.signatureUrl ?? null);
  const [deleting, setDeleting] = useState<DeletableInvoice[] | null>(null);
  const [id, setId] = useState(initial.id);
  const [status, setStatus] = useState<InvoiceStatus>(initialStatus);
  const [savedAt, setSavedAt] = useState<number | null>(() => (initial.id ? Date.now() : null));
  const [now, setNow] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [fromOpen, setFromOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const lastSaved = useRef(stable(initial));
  const posTouched = useRef(!!initial.place_of_supply_code && !!initial.id);
  const savingRef = useRef(false);

  // eslint-disable-next-line react-hooks/refs -- compare against the last saved snapshot on every render
  const dirty = stable(values) !== lastSaved.current;

  const doc = useMemo(() => formToDocument(preview, seller, { status, amountPaidPaise }), [preview, seller, status, amountPaidPaise]);
  const calc = useMemo(() => calcDocument(doc), [doc]);
  const model = useMemo(() => buildPaperModel(doc, calc), [doc, calc]);
  const qr = useQr(model.payment.upiText);
  const fileAssets = useMemo(() => ({ ...assets, signatureUrl }), [assets, signatureUrl]);
  const paperAssets = useMemo(() => ({ ...fileAssets, qrDataUrl: qr }), [fileAssets, qr]);
  const checklist = useMemo(
    () =>
      complianceChecklist({
        docType: doc.doc_type,
        invoiceNumber: doc.invoice_number,
        issueDate: doc.issue_date,
        dueDate: doc.due_date,
        placeOfSupplyCode: doc.place_of_supply_code,
        seller: doc.seller,
        buyer: doc.buyer,
        lines: doc.lines,
        taxablePaise: calc.taxable,
      }),
    [doc, calc],
  );
  const canTax = chargesTax(values.doc_type, seller.gst_status);

  // ─── Saving ────────────────────────────────────────────────────────────────
  const doSave = useCallback(
    async (mode: SaveMode): Promise<boolean> => {
      savingRef.current = true;
      setSaving(true);
      const snapshot = getValues();
      try {
        const res = await saveInvoice({ ...snapshot, id: snapshot.id ?? id }, mode, { refreshSeller });
        if (!res.ok) {
          if (res.field === "invoice_number") setNumberError(res.error);
          if (mode !== "autosave" || res.field === "invoice_number") toast.error(res.error);
          return false;
        }
        setNumberError(null);
        const patched = { ...snapshot, id: res.id, invoice_number: res.invoice_number, auto_number: false, client_id: res.client_id };
        if (!id) window.history.replaceState(null, "", `/invoices/${res.id}/edit`);
        setRefreshSeller(false);
        setId(res.id);
        setValue("id", res.id);
        setValue("auto_number", false);
        setValue("invoice_number", res.invoice_number);
        setValue("client_id", res.client_id);
        // Anything typed while the save was in flight stays dirty.
        lastSaved.current = stable(patched);
        setStatus(res.status);
        setSavedAt(Date.now());
        if (mode === "save") toast.success(`Saved ${res.invoice_number}`);
        if (mode === "send") toast.success(`${res.invoice_number} marked as sent`);
        return true;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [getValues, id, setValue, refreshSeller],
  );

  /** One save at a time. Autosave skips if one is running; Save / Email wait for it, then run (so a click never silently does nothing). */
  const inflight = useRef<Promise<boolean> | null>(null);
  const save = useCallback(
    (mode: SaveMode): Promise<boolean> => {
      if (mode === "autosave" && savingRef.current) return Promise.resolve(false);
      const prev = inflight.current;
      const run = (async () => {
        if (prev) await prev.catch(() => false);
        return doSave(mode);
      })();
      inflight.current = run;
      return run;
    },
    [doSave],
  );

  // Auto-save drafts every 5s when something changed (03 §7).
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      const v = getValues();
      if (stable(v) === lastSaved.current || savingRef.current) return;
      const meaningful = !!v.buyer?.name?.trim() || v.lines.some((l) => l.name?.trim());
      if (!meaningful) return;
      // Sent / paid invoices are only changed by an explicit Save, never behind your back.
      if (status !== "draft") return;
      void save("autosave");
    }, 5000);
    return () => clearInterval(t);
  }, [getValues, save, status]);

  // ─── PDF ───────────────────────────────────────────────────────────────────
  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const d = formToDocument(getValues(), seller, { status, amountPaidPaise });
      const m = buildPaperModel(d, calcDocument(d));
      const qrUrl = m.payment.upiText ? await qrDataUrl(m.payment.upiText) : null;
      const { downloadInvoicePdf, pdfFileName } = await import("../pdf/download");
      await downloadInvoicePdf(m, { ...fileAssets, qrDataUrl: qrUrl }, pdfFileName(d.invoice_number, d.buyer.name));
    } catch (e) {
      toast.error("Couldn't create the PDF. Try the print view instead.");
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }, [getValues, seller, status, amountPaidPaise, fileAssets]);

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

  // ─── Keyboard + unsaved-changes guard ──────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        void save("save");
      } else if (k === "p") {
        e.preventDefault();
        void download();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, download]);

  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || e.defaultPrevented || !a.href || a.href.startsWith("blob:")) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  // Place of supply follows the client's state until the user picks one.
  const onClientState = useCallback(
    (code: string) => {
      if (!posTouched.current && code) setValue("place_of_supply_code", code, { shouldDirty: true });
    },
    [setValue],
  );

  /** Email: save first (marks a draft as sent), then hand the saved invoice over. */
  const prepareEmail = useCallback(async () => {
    if (!(await save("send"))) return null;
    const v = getValues();
    if (!v.id) return null;
    return {
      invoiceId: v.id,
      doc: formToDocument(v, seller, { status: status === "draft" ? "sent" : status, amountPaidPaise }),
    };
  }, [save, getValues, seller, status, amountPaidPaise]);

  const sellerSummary = [seller.business_name || "Your business", seller.city, seller.gstin ? `GSTIN ${seller.gstin}` : seller.gst_status === "unregistered" ? "Not GST-registered" : null]
    .filter(Boolean)
    .join(" · ");

  const savedLabel = saving ? "Saving…" : dirty ? (id ? "Unsaved changes" : "Not saved yet") : savedAt ? `Saved · ${relativeTime(savedAt, now)}` : "";

  const actions = (
    <div className="flex items-center gap-2">
      <ComplianceBadge
        items={checklist}
        onOpenSection={(f) => {
          if (f.startsWith("seller")) setFromOpen(true);
        }}
      />
      <Menu
        triggerLabel="More actions"
        triggerClassName={buttonVariants({ variant: "ghost", size: "icon" })}
        trigger={<MoreHorizontal aria-hidden />}
      >
        {id && (
          <MenuItem onClick={() => router.push(`/invoices/new?from=${id}`)}>
            <Copy aria-hidden /> Duplicate
          </MenuItem>
        )}
        {id && (
          <MenuItem onClick={() => window.open(`/invoices/${id}/print`, "_blank")}>
            <Printer aria-hidden /> Print view
          </MenuItem>
        )}
        {id && (
          <>
            <MenuSeparator />
            <MenuItem danger onClick={() => setDeleting([{ id, number: values.invoice_number || "this invoice", status }])}>
              <Trash2 aria-hidden /> Delete
            </MenuItem>
          </>
        )}
      </Menu>
    </div>
  );

  const viewTabs = (
    <div className="mt-3 lg:hidden">
    <div role="tablist" aria-label="Editor view" className="grid grid-cols-2 rounded-lg bg-surface-2 p-1 lg:hidden">
      {(["edit", "preview"] as const).map((v) => (
        <button
          key={v}
          role="tab"
          type="button"
          aria-selected={view === v}
          onClick={() => setView(v)}
          className={cn("h-9 rounded-md text-sm capitalize", view === v ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2")}
        >
          {v}
        </button>
      ))}
    </div>
    </div>
  );

  return (
    <FormProvider {...form}>
      <div className="lg:grid lg:h-dvh lg:grid-cols-[45fr_55fr]">
        {/* ── Form column ── */}
        <div data-lenis-prevent className={cn("min-w-0 lg:overflow-y-auto", view === "preview" && "hidden lg:block")}>
          <div className="sticky top-0 z-20 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <Link href={id ? `/invoices/${id}` : "/invoices"} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={id ? "Back to invoice" : "Back to invoices"}>
                <ArrowLeft aria-hidden />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-heading text-[1.0625rem] font-semibold">{values.invoice_number || "New invoice"}</h1>
                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  <StatusPill status={status} dueDate={values.due_date || null} />
                  <p className="truncate text-caption" aria-live="polite">
                    {savedLabel}
                  </p>
                </div>
              </div>
              <div className="lg:hidden">{actions}</div>
            </div>
            <div className="mt-3 hidden items-center gap-2 lg:flex">
              {actions}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" onClick={download} disabled={downloading}>
                  <Download aria-hidden /> {downloading ? "Preparing…" : "Download"}
                </Button>
                <EmailButton prepare={prepareEmail} config={email} assets={fileAssets} />
                <Button onClick={() => void save("save")} disabled={saving}>
                  Save
                </Button>
              </div>
            </div>
            {viewTabs}
          </div>

          {id && (status === "sent" || status === "paid" || status === "partially_paid") && (
            <p role="note" className="mx-4 mt-4 flex items-start gap-2.5 rounded-lg bg-info/10 px-3.5 py-3 text-sm text-ink-2 md:mx-6">
              <Info className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-info" aria-hidden />
              This invoice was already sent. Saving will update it, so send the new PDF to your client.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save("save");
            }}
            className="flex flex-col gap-4 px-4 pt-5 pb-32 md:px-6 lg:pb-16"
            noValidate
          >
            <Section
              id="from"
              title="From"
              summary={sellerSummary}
              defaultOpen={false}
              open={fromOpen}
              onOpenChange={setFromOpen}
            >
              <div className="flex flex-col gap-1 text-sm text-ink-2">
                <p className="font-medium text-ink">{seller.business_name || "Your business name"}</p>
                {seller.legal_name && <p>{seller.legal_name}</p>}
                <p>{[seller.address_line1, seller.address_line2, seller.city, seller.pincode].filter(Boolean).join(", ") || "No address yet"}</p>
                {seller.state_code && <p>{stateLabel(seller.state_code)}</p>}
                <p className="font-mono text-xs">{[seller.gstin && `GSTIN ${seller.gstin}`, seller.pan && `PAN ${seller.pan}`].filter(Boolean).join(" · ")}</p>
                {status === "draft" ? (
                  <Link href="/settings" className="mt-2 w-fit text-xs text-accent hover:underline">
                    Edit your business details in Settings
                  </Link>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-caption">Saved with this invoice. Profile changes don&apos;t affect it.</p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      onClick={() => {
                        setSeller(profileSeller);
                        setRefreshSeller(true);
                        toast.success("Details refreshed from your profile. Save to keep them.");
                      }}
                    >
                      <RefreshCw className="size-3 stroke-[1.5]" aria-hidden /> Refresh my details from profile
                    </button>
                  </div>
                )}
              </div>
            </Section>
            <BillTo clients={clients} taxInvoice={values.doc_type === "tax_invoice"} onClientState={onClientState} />
            <DetailsCard
              gstStatus={seller.gst_status ?? "unregistered"}
              numberError={numberError}
              isNew={!id}
              onPlaceOfSupplyTouched={() => {
                posTouched.current = true;
              }}
            />
            <ItemsTable items={items} canTax={canTax} calc={calc} defaultGst={canTax ? defaultGst : 0} />
            <TotalsCard model={model} calc={calc} currency={values.currency ?? "INR"} />
            <PaymentNotes
              seller={seller}
              signatureUserId={email.userId}
              signaturePath={signaturePath}
              signatureUrl={signatureUrl}
              onSignatureChange={(next) => {
                setSignaturePath(next.path);
                setSignatureUrl(next.url);
              }}
            />
            {children}
          </form>
        </div>

        {/* ── Preview column ── */}
        <div
          data-lenis-prevent
          className={cn("min-w-0 bg-surface-2 lg:overflow-y-auto lg:border-l lg:border-border", view === "edit" && "hidden lg:block")}
        >
          <div className="sticky top-0 z-20 border-b border-border bg-bg/95 px-4 pb-3 backdrop-blur lg:hidden">{viewTabs}</div>
          <div className="px-4 pt-4 pb-32 md:px-8 lg:pt-8 lg:pb-12">
            <p className="sr-only" aria-live="polite">
              Preview total {model.totals.find((t) => t.rule)?.value}
            </p>
            <ScaledPaper>
              <InvoicePaper model={model} assets={paperAssets} highlight />
            </ScaledPaper>
          </div>
        </div>
      </div>

      <DeleteInvoicesDialog
        items={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          lastSaved.current = stable(getValues()); // nothing left to lose: skip the unsaved-changes prompt
          router.push("/invoices");
        }}
      />

      {/* ── Mobile sticky action bar ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-caption">Total</p>
          <p className="truncate font-heading text-[1.0625rem] font-semibold">
            <Ticker paise={calc.total} currency={values.currency ?? "INR"} />
          </p>
        </div>
        <Button variant="secondary" size="lg" onClick={download} disabled={downloading} aria-label="Download PDF">
          <Download aria-hidden />
        </Button>
        <EmailButton prepare={prepareEmail} config={email} assets={fileAssets} compact />
        <Button size="lg" onClick={() => void save("save")} disabled={saving}>
          <FileText aria-hidden /> Save
        </Button>
      </div>
    </FormProvider>
  );
}
