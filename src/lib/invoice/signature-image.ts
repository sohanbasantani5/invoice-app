// Rules for uploading a signature, plus a best-effort white-background removal.
// Kept dependency-free: the removal is a plain canvas pass in the browser, nothing is sent anywhere.
// The pixel rule is a pure function so it can be unit-tested without a DOM.

/** Signatures are drawn, not photographed — PNG/JPEG only. */
export const SIGNATURE_TYPES = ["image/png", "image/jpeg"] as const;
export const SIGNATURE_MAX_BYTES = 1024 * 1024;
export const SIGNATURE_HINT = "Recommended: PNG or JPEG. A transparent PNG gives the best result.";

/** Luminance at/below this is kept in full (ink). */
const KEEP_LUMINANCE = 205;
/** Luminance at/above this becomes fully transparent (paper). */
const CLEAR_LUMINANCE = 244;

/**
 * Alpha (0–255) for one pixel when removing a light background: near-white goes transparent, darker
 * ink is kept, and a soft ramp between the two keeps antialiased edges from turning jagged.
 * Best effort — a photo with shadows or a grey background will not clean up perfectly.
 */
export function backgroundAlpha(r: number, g: number, b: number): number {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance <= KEEP_LUMINANCE) return 255;
  if (luminance >= CLEAR_LUMINANCE) return 0;
  return Math.round(((CLEAR_LUMINANCE - luminance) / (CLEAR_LUMINANCE - KEEP_LUMINANCE)) * 255);
}

/**
 * Best-effort removal of a white/light background from an uploaded signature photo.
 * Returns a PNG blob, or the original file if the canvas is unavailable. Opt-in, never silent.
 */
export async function removeLightBackground(file: File): Promise<Blob> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) data[i + 3] = backgroundAlpha(data[i], data[i + 1], data[i + 2]);
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
