"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { createGmailDraft } from "@/lib/actions/gmail";
import { calcDocument } from "@/lib/invoice/document";
import { buildPaperModel } from "@/lib/invoice/paper-model";
import { buildEmail, gmailUrl, type EmailConfig } from "@/lib/invoice/email";
import type { InvoiceDocument } from "@/lib/invoice/types";
import type { PaperAssets } from "./preview/invoice-paper";
import { qrDataUrl } from "./preview/use-assets";

const THIRTY_DAYS = 30 * 24 * 60 * 60;
const openSettings = () => window.open("/settings?tab=email", "_blank");

/**
 * Email. Gmail connected: a Gmail draft with the PDF attached, opened in a new tab.
 * Otherwise (or if anything fails): download the PDF, make a private 30-day link, open Gmail compose.
 * `prepare` returns the saved invoice (saving / marking it sent first if needed), or null to stop.
 */
export function EmailButton({
  prepare,
  config,
  assets,
  compact,
}: {
  prepare: () => Promise<{ invoiceId: string; doc: InvoiceDocument } | null>;
  config: EmailConfig;
  assets: PaperAssets;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function click() {
    if (busy) return;
    setBusy(true);
    // Open the tab now, while the click still counts; it is pointed at Gmail later.
    // Without this, browsers block a window opened after the PDF has been built.
    const tab = window.open("about:blank", "_blank");
    const go = (url: string) => (tab ? void (tab.location.href = url) : void window.open(url, "_blank"));
    try {
      const p = await prepare();
      if (!p) return void tab?.close();
      const { doc, invoiceId } = p;
      const calc = calcDocument(doc);
      const model = buildPaperModel(doc, calc);
      const qr = model.payment.upiText ? await qrDataUrl(model.payment.upiText) : null;
      const { buildInvoicePdf, saveBlob, pdfFileName } = await import("./pdf/download");
      const fileName = pdfFileName(doc.invoice_number, doc.buyer.name);
      const blob = await buildInvoicePdf(model, { ...assets, qrDataUrl: qr });

      // Private bucket, owner-only upload. The Gmail draft reads the PDF from here; the fallback links to it.
      const sb = createClient();
      const path = `${config.userId}/${invoiceId}.pdf`;
      const up = await sb.storage.from("invoice-pdfs").upload(path, blob, { upsert: true, contentType: "application/pdf" });
      if (up.error) console.error(up.error);

      if (config.gmailEmail && !up.error) {
        const mail = buildEmail(config.templates, doc, calc.total, "attached");
        const r = await createGmailDraft({ invoiceId, to: doc.buyer.email ?? "", subject: mail.subject, body: mail.body, fileName });
        if (r.ok) {
          go(r.draftUrl);
          toast.success("Draft created in Gmail with the PDF attached.", {
            description: "If it does not open, it is the top one in Drafts.",
            action: { label: "Open Drafts", onClick: () => window.open(r.draftsUrl, "_blank") },
          });
          if (!doc.buyer.email) toast("This client has no email yet. Add the address in Gmail, and under Bill to for next time.");
          return;
        }
        toast.error(r.reconnect ? "Gmail needs to be connected again, so this email uses the normal way." : "Couldn't create the Gmail draft, so this email uses the normal way.");
      }

      // Normal way: download + 30-day link + Gmail compose.
      saveBlob(blob, fileName);
      let link = "";
      if (!up.error) {
        const signed = await sb.storage.from("invoice-pdfs").createSignedUrl(path, THIRTY_DAYS);
        link = signed.data?.signedUrl ?? "";
      }
      if (!link) toast.error("Couldn't make the secure link, so the email goes without it. Attach the PDF yourself.");
      const mail = buildEmail(config.templates, doc, calc.total, "link", link);
      go(gmailUrl({ authuser: config.authuser, to: doc.buyer.email, subject: mail.subject, body: mail.body }));

      toast.success("PDF downloaded. Drag it into the Gmail window to attach it.");
      if (!doc.buyer.email) toast("This client has no email yet. Add one under Bill to so the To field fills in next time.");
      if (!config.gmailEmail) toast("Connect Gmail to attach the PDF automatically.", { action: { label: "Connect", onClick: openSettings } });
    } catch (e) {
      tab?.close();
      toast.error("Couldn't prepare the email. Try Download, then write the email yourself.");
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void click()} disabled={busy} aria-label={compact ? "Email invoice" : undefined}>
      <Mail aria-hidden /> {!compact && (busy ? "Preparing…" : "Email")}
    </Button>
  );
}
