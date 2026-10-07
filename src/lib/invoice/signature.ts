// One definition of the signature area, shared by every invoice template.
// The HTML preview and the PDF both render only from `PaperModel.signature`, so they can never
// disagree (rule 5), and a future template only has to read these fields.

/**
 * Shown near the bottom of the invoice when the signature is switched off.
 * An asterisk is kept at the front on purpose — it reads as a printed document note.
 */
export const ELECTRONIC_DOCUMENT_NOTICE = "*This is an electronically generated document. No signature is required.";

export type SignatureState = {
  /** true = draw the signature (image, or a space to sign). false = show the notice only. */
  enabled: boolean;
  /** "For {business name}" above the signatory line, when enabled. */
  forLine: string;
  /** The electronic-document notice, shown when disabled. */
  notice: string;
};

/**
 * Decide what the bottom of the invoice shows. Invoices saved before the toggle existed have no
 * value — those keep the historic behaviour (a signature area), which is what `!== false` means.
 */
export function buildSignatureState(showSignature: boolean | null | undefined, sellerName: string): SignatureState {
  return {
    enabled: showSignature !== false,
    forLine: `For ${sellerName}`,
    notice: ELECTRONIC_DOCUMENT_NOTICE,
  };
}
