import { describe, expect, it } from "vitest";
import { SAFE_IMAGE_MAX_BYTES, validateSafeImage } from "@/lib/invoice/upload-security";

const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const jpg = new Uint8Array([0xff,0xd8,0xff,0xe0]);

describe("safe image upload validation", () => {
  it("accepts matching PNG and JPEG signatures", () => {
    expect(validateSafeImage({ name: "logo.png", type: "image/png", size: png.length }, png).ok).toBe(true);
    expect(validateSafeImage({ name: "logo.jpg", type: "image/jpeg", size: jpg.length }, jpg).ok).toBe(true);
    expect(validateSafeImage({ name: "logo.jpeg", type: "image/jpeg", size: jpg.length }, jpg).ok).toBe(true);
  });
  it("rejects SVG and MIME/extension mismatches", () => {
    const svg = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
    expect(validateSafeImage({ name: "logo.svg", type: "image/svg+xml", size: svg.length }, svg).ok).toBe(false);
    expect(validateSafeImage({ name: "logo.jpg", type: "image/jpeg", size: png.length }, png).ok).toBe(false);
  });
  it("rejects oversized files", () => {
    expect(validateSafeImage({ name: "logo.png", type: "image/png", size: SAFE_IMAGE_MAX_BYTES + 1 }, png).ok).toBe(false);
  });
});
