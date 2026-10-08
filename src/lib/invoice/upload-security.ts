export const SAFE_IMAGE_MAX_BYTES = 1024 * 1024;
export const SAFE_IMAGE_TYPES = ["image/png", "image/jpeg"] as const;
export type SafeImageType = (typeof SAFE_IMAGE_TYPES)[number];

export function validateSafeImage(file: { name: string; type: string; size: number }, bytes: Uint8Array): { ok: true; type: SafeImageType } | { ok: false; error: string } {
  if (file.size <= 0 || file.size > SAFE_IMAGE_MAX_BYTES) return { ok: false, error: "Image must be between 1 byte and 1 MB." };
  const ext = file.name.toLowerCase().split(".").pop();
  const isPng = file.type === "image/png" && ext === "png" && bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v);
  const isJpeg = file.type === "image/jpeg" && (ext === "jpg" || ext === "jpeg") && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng) return { ok: true, type: "image/png" };
  if (isJpeg) return { ok: true, type: "image/jpeg" };
  return { ok: false, error: "Use a valid PNG, JPG, or JPEG image." };
}
