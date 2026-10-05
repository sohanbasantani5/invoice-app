// Plain-Node helpers for the Gmail draft: an RFC 2822 message with one text part and one PDF.

const b64 = (b: Buffer | string) => (typeof b === "string" ? Buffer.from(b, "utf8") : b).toString("base64");
const wrap = (s: string) => s.replace(/(.{76})/g, "$1\r\n");
/** Header values must never contain a line break (header injection). */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
/** RFC 2047 encoded-word so ₹ and other non-ASCII survive in the subject / file name. */
const word = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);

export function buildMime(p: { to?: string | null; subject: string; body: string; fileName: string; pdf: Buffer; boundary?: string }): string {
  const boundary = p.boundary ?? `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const name = oneLine(p.fileName).replace(/["\\]/g, "_");
  const headers = [
    p.to && oneLine(p.to) ? `To: ${oneLine(p.to)}` : "",
    `Subject: ${word(oneLine(p.subject))}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ].filter(Boolean);
  return [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap(b64(p.body.replace(/\r?\n/g, "\r\n"))),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${word(name)}"`,
    `Content-Disposition: attachment; filename="${word(name)}"`,
    "Content-Transfer-Encoding: base64",
    "",
    wrap(b64(p.pdf)),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

export const toBase64Url = (s: string) => Buffer.from(s, "utf8").toString("base64url");
