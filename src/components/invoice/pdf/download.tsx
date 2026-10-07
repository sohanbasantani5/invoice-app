"use client";

import type { PaperModel } from "@/lib/invoice/paper-model";
import type { PaperAssets } from "../preview/invoice-paper";

/** Any image (PNG/JPG/SVG/WebP) → PNG data URL. react-pdf only embeds PNG/JPG. */
async function toPng(url: string | null | undefined, maxPx = 600): Promise<string | null> {
  if (!url) return null;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const ratio = Math.min(1, maxPx / Math.max(img.naturalWidth || maxPx, img.naturalHeight || maxPx));
    const w = Math.max(1, Math.round((img.naturalWidth || maxPx) * ratio));
    const h = Math.max(1, Math.round((img.naturalHeight || maxPx) * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function pdfFileName(invoiceNumber: string, client: string | null | undefined): string {
  const clean = (v: string) => v.replace(/[\\/]/g, "-").replace(/[^\w\- .]/g, "").trim().replace(/\s+/g, "_");
  return `${clean(invoiceNumber || "invoice")}${client ? "_" + clean(client) : ""}.pdf`;
}

/** Builds the vector PDF in the browser. The PDF library loads only now. */
export async function buildInvoicePdf(model: PaperModel, assets: PaperAssets, templateId: string = "default"): Promise<Blob> {
  const [{ pdf }, registry, logoUrl, signatureUrl] = await Promise.all([
    import("@react-pdf/renderer"),
    import("../templates/registry"),
    toPng(assets.logoUrl),
    toPng(assets.signatureUrl),
  ]);
  const PdfTemplate = registry.getTemplate(templateId).pdf;
  return pdf(<PdfTemplate model={model} assets={{ ...assets, logoUrl, signatureUrl }} />).toBlob();
}

export function saveBlob(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function downloadInvoicePdf(model: PaperModel, assets: PaperAssets, fileName: string, templateId: string = "default") {
  saveBlob(await buildInvoicePdf(model, assets, templateId), fileName);
}
