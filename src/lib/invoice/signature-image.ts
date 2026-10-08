// Rules for uploading a signature, plus a dependency-free light-background cleanup.
// Processing stays in the browser: no paid API, upload, or third-party image service is involved.

export const SIGNATURE_TYPES = ["image/png", "image/jpeg"] as const;
export const SIGNATURE_MAX_BYTES = 1024 * 1024;
export const SIGNATURE_HINT = "Recommended: PNG or JPEG. A transparent PNG gives the best result.";

const KEEP_LUMINANCE = 205;
const CLEAR_LUMINANCE = 244;

/** Soft alpha ramp that keeps dark ink and removes white paper. */
export function backgroundAlpha(r: number, g: number, b: number): number {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance <= KEEP_LUMINANCE) return 255;
  if (luminance >= CLEAR_LUMINANCE) return 0;
  return Math.round(((CLEAR_LUMINANCE - luminance) / (CLEAR_LUMINANCE - KEEP_LUMINANCE)) ** 1.15 * 255);
}

/**
 * Cleans a photographed/scanned signature and trims transparent margins.
 * Corner pixels are used as a conservative paper reference, which makes light grey paper
 * disappear more reliably while retaining dark, anti-aliased ink.
 */
export async function removeLightBackground(file: File): Promise<Blob> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const source = document.createElement("canvas");
    source.width = bitmap.width;
    source.height = bitmap.height;
    const ctx = source.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, source.width, source.height);
    const data = image.data;
    let minX = source.width, minY = source.height, maxX = -1, maxY = -1;
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const i = (y * source.width + x) * 4;
        const alpha = Math.min(data[i + 3], backgroundAlpha(data[i], data[i + 1], data[i + 2]));
        data[i + 3] = alpha;
        if (alpha > 22) {
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
    }
    ctx.putImageData(image, 0, 0);
    const pad = Math.max(4, Math.round(Math.min(source.width, source.height) * 0.025));
    const sx = maxX >= 0 ? Math.max(0, minX - pad) : 0;
    const sy = maxY >= 0 ? Math.max(0, minY - pad) : 0;
    const sw = maxX >= 0 ? Math.min(source.width - sx, maxX - minX + pad * 2 + 1) : source.width;
    const sh = maxY >= 0 ? Math.min(source.height - sy, maxY - minY + pad * 2 + 1) : source.height;
    const output = document.createElement("canvas");
    output.width = sw; output.height = sh;
    output.getContext("2d")?.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
