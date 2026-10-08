"use client";

import { useRef, useState, useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveProfileSection, uploadBrandingImage } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import {
  removeLightBackground,
  SIGNATURE_HINT,
  SIGNATURE_MAX_BYTES,
  SIGNATURE_TYPES,
} from "@/lib/invoice/signature-image";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

export type SignatureChange = { path: string | null; url: string | null };

/**
 * Signature ON / OFF in the invoice editor.
 * ON  → upload (PNG/JPEG), preview, replace or remove. Stored on the profile like the logo, so
 *       future invoices and the saved snapshot pick it up (no new table needed).
 * OFF → no upload UI; the invoice shows the electronic-document notice instead.
 */
export function SignatureField({
  userId: _userId,
  path,
  url,
  onChange,
}: {
  userId: string;
  path: string | null;
  url: string | null;
  onChange: (next: SignatureChange) => void;
}) {
  const { register, control } = useFormContext<InvoiceFormValues>();
  void _userId;
  const on = useWatch({ control, name: "show_signature" }) !== false;
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [cleanup, setCleanup] = useState(false);
  const [cleanedPreview, setCleanedPreview] = useState<string | null>(null);

  function pick() {
    input.current?.click();
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!SIGNATURE_TYPES.includes(file.type as (typeof SIGNATURE_TYPES)[number]))
      return void toast.error("Use a PNG or JPEG image.");
    if (file.size > SIGNATURE_MAX_BYTES) return void toast.error("Image must be 1 MB or smaller.");
    start(async () => {
      try {
        const blob = cleanup ? await removeLightBackground(file) : file;
        if (cleanup) {
          setCleanedPreview(URL.createObjectURL(blob));
        } else {
          setCleanedPreview(null);
        }
        const upload = new File([blob], cleanup ? "signature.png" : file.name, { type: blob.type || file.type });
        const saved = await uploadBrandingImage("signature", upload, path);
        if (!saved.ok) throw new Error(saved.error);
        onChange({ path: saved.path, url: saved.url });
        toast.success("Signature uploaded");
      } catch (e) {
        toast.error("Couldn't upload the signature. " + (e instanceof Error ? e.message : "Try again."));
      }
    });
  }

  function remove() {
    start(async () => {
      const saved = await saveProfileSection("branding", { signature_path: null });
      if (!saved.ok) return void toast.error(saved.error);
      if (path) await createClient().storage.from("branding").remove([path]);
      onChange({ path: null, url: null });
      toast.success("Signature removed");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Switch
        label="Signature"
        description={
          on
            ? path
              ? "Your uploaded signature is shown on this invoice."
              : "No signature uploaded — a space to sign is shown."
            : "Shows the electronic-document notice instead."
        }
        {...register("show_signature")}
      />

      {on ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-3">
          <button
            type="button"
            onClick={pick}
            className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface text-ink-3 hover:border-accent hover:text-accent"
            aria-label="Upload signature"
          >
            {cleanedPreview || url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL/blob preview from private storage
              <img src={cleanedPreview || url || ""} alt="" className="max-h-full max-w-full object-contain p-1" />
            ) : (
              <ImagePlus className="size-5 stroke-[1.5]" aria-hidden />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-label text-ink-2">Upload signature</p>
            <p className="text-caption">{SIGNATURE_HINT}</p>
            <label className="mt-1.5 flex items-center gap-2 text-caption">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={cleanup}
                onChange={(e) => setCleanup(e.target.checked)}
              />
              Remove white background (best effort, for photos)
            </label>
            {cleanedPreview && <p className="mt-1 text-[11px] text-accent">Cleaned preview · transparent PNG</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={pick} disabled={pending}>
              {pending ? "Saving…" : "Choose image"}
            </Button>
            {url && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={remove} disabled={pending} aria-label="Remove signature">
                <Trash2 aria-hidden />
              </Button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept={SIGNATURE_TYPES.join(",")}
            className="sr-only"
            aria-label="Upload signature"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onFile(file);
            }}
          />
        </div>
      ) : (
        <p className="text-caption">This invoice will show the electronic-document notice instead of a signature.</p>
      )}
    </div>
  );
}
