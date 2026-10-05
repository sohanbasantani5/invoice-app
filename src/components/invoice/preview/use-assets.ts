"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** UPI QR as a data URL — used by both the preview and the PDF. */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, width: 360, errorCorrectionLevel: "M", color: { dark: "#17181B", light: "#FFFFFF" } });
}

export function useQr(text: string | null): string | null {
  const [url, setUrl] = useState<{ text: string; url: string } | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    const id = setTimeout(() => {
      qrDataUrl(text).then((u) => alive && setUrl({ text, url: u }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [text]);
  return text && url ? url.url : null;
}

/** Fetch any image URL into a data URL (the PDF renderer embeds images reliably this way). */
export async function toDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const blob = await fetch(url).then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))));
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
