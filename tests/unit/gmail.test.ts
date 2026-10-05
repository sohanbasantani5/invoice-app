import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { buildMime, toBase64Url } from "@/lib/gmail/mime";

describe("gmail draft MIME", () => {
  const pdf = Buffer.from("%PDF-1.4 hello ₹");
  const raw = buildMime({ to: "a@b.com", subject: "Invoice ₹1\r\nBcc: evil@x.com", body: "Hi\nBye ₹", fileName: 'IN"V/1.pdf', pdf, boundary: "B" });

  it("has To, an encoded one-line subject, and a PDF attachment", () => {
    expect(raw).toContain("To: a@b.com\r\n");
    expect(raw).not.toMatch(/^Bcc:/m); // header injection through the subject is flattened
    const subject = raw.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)![1];
    expect(Buffer.from(subject, "base64").toString()).toBe("Invoice ₹1 Bcc: evil@x.com");
    expect(raw).toContain('Content-Type: application/pdf; name="IN_V/1.pdf"');
    expect(raw).toContain('Content-Disposition: attachment; filename="IN_V/1.pdf"');
    const parts = raw.split("--B");
    const text = Buffer.from(parts[1].split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64").toString();
    expect(text).toBe("Hi\r\nBye ₹");
    const att = Buffer.from(parts[2].split("\r\n\r\n")[1].replace(/\r\n/g, ""), "base64");
    expect(att.equals(pdf)).toBe(true);
    expect(raw.trimEnd().endsWith("--B--")).toBe(true);
  });
  it("leaves To out when there is no client email, and url-safe encodes", () => {
    expect(buildMime({ subject: "s", body: "b", fileName: "f.pdf", pdf, boundary: "B" })).not.toContain("To:");
    expect(toBase64Url("???>>>")).toBe("Pz8_Pj4-");
  });
});

describe("token encryption", () => {
  it("round-trips, is random per call, and rejects tampering or a wrong key", async () => {
    process.env.GMAIL_TOKEN_KEY = Buffer.alloc(32, 7).toString("base64");
    const { encryptToken, decryptToken } = await import("@/lib/gmail/crypto");
    const a = encryptToken("1//refresh-token");
    expect(a).not.toContain("refresh-token");
    expect(a).not.toBe(encryptToken("1//refresh-token"));
    expect(decryptToken(a)).toBe("1//refresh-token");
    const parts = a.split(".");
    parts[3] = Buffer.from("tampered!").toString("base64");
    expect(() => decryptToken(parts.join("."))).toThrow();
    process.env.GMAIL_TOKEN_KEY = Buffer.alloc(32, 9).toString("base64");
    expect(() => decryptToken(a)).toThrow();
  });
});
