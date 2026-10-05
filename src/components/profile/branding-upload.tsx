"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveProfileSection } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

/** Upload a logo or signature to the private `branding` bucket at `{user_id}/{kind}.{ext}`. */
export function BrandingUpload({
  kind,
  userId,
  path,
  label,
  hint,
}: {
  kind: "logo" | "signature";
  userId: string;
  path: string | null;
  label: string;
  hint: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(path);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!current) return;
    let alive = true;
    createClient()
      .storage.from("branding")
      .createSignedUrl(current, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [current]);

  function save(newPath: string | null) {
    return saveProfileSection("branding", { [`${kind}_path`]: newPath });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Use a PNG, JPG, SVG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Image must be 1 MB or smaller.");
    start(async () => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const p = `${userId}/${kind}-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("branding").upload(p, file, { upsert: true, contentType: file.type });
      if (error) return void toast.error("Upload failed. " + error.message);
      const res = await save(p);
      if (!res.ok) return void toast.error(res.error);
      if (current) await supabase.storage.from("branding").remove([current]);
      setCurrent(p);
      toast.success(`${label} uploaded`);
    });
  }

  function remove() {
    start(async () => {
      const res = await save(null);
      if (!res.ok) return void toast.error(res.error);
      if (current) await createClient().storage.from("branding").remove([current]);
      setCurrent(null);
      setUrl(null);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-border-strong bg-surface-2 text-ink-3 hover:border-accent hover:text-accent"
        aria-label={`Upload ${label.toLowerCase()}`}
      >
        {current && url ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed URL from private storage
          <img src={url} alt="" className="max-h-full max-w-full object-contain p-1" />
        ) : (
          <ImagePlus className="size-5 stroke-[1.5]" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-label text-ink-2">
          {label} <span className="ml-1 text-[11px] font-normal text-ink-3">Optional</span>
        </p>
        <p className="text-caption">{hint}</p>
      </div>
      {current && (
        <Button variant="ghost" size="icon-sm" onClick={remove} disabled={pending} aria-label={`Remove ${label.toLowerCase()}`}>
          <Trash2 aria-hidden />
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept={TYPES.join(",")}
        className="sr-only"
        aria-label={`Upload ${label.toLowerCase()}`}
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
