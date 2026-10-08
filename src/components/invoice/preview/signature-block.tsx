"use client";

import type { PaperModel } from "@/lib/invoice/paper-model";
import { templateTokens as t } from "@/lib/invoice/template-tokens";
import type { PaperAssets } from "./invoice-paper";

/**
 * The bottom of the invoice. One shared block so every template renders signatures and the
 * electronic-document notice identically (see `lib/invoice/signature.ts`).
 *
 * Signature ON  → "For {business}" + the image (or a space to sign) + the signatory line.
 * Signature OFF → the electronic-document notice, bottom-left, with no reserved blank space.
 */
export function SignatureBlock({ model: m, assets }: { model: PaperModel; assets: PaperAssets }) {
  const s = m.signature;

  if (!s.enabled) {
    return (
      <div className="mt-auto pt-[10mm]">
        <p style={{ fontSize: `${t.small}pt`, color: t.ink3 }}>{s.notice}</p>
      </div>
    );
  }

  return (
    <div className="mt-auto flex justify-end pt-[7mm]">
      <div className="text-center" style={{ width: "50mm" }}>
        <div style={{ fontSize: `${t.tiny}pt`, letterSpacing: "0.06em", color: t.ink3 }}>{s.forLine}</div>
        <div className="flex items-end justify-center" style={{ height: "12mm", padding: "1mm 0 0.8mm" }}>
          {assets.signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
            <img src={assets.signatureUrl} alt="" style={{ maxHeight: "10mm", maxWidth: "36mm" }} className="object-contain" />
          )}
        </div>
        <div style={{ borderTop: `1px solid ${t.rule}`, paddingTop: "1mm", fontSize: `${t.tiny}pt`, letterSpacing: "0.08em", fontWeight: 500, color: t.ink2 }}>
          Authorised signatory
        </div>
      </div>
    </div>
  );
}
