// Shared by the HTML preview (InvoicePaper) and the PDF (InvoicePdf) so they match (02 §7).
import type { TemplateAccent } from "@/types/database";

export const ACCENTS: Record<TemplateAccent, { label: string; hex: string; soft: string }> = {
  pine: { label: "Pine", hex: "#1F5C4B", soft: "#E3EEE9" },
  ink: { label: "Ink", hex: "#17181B", soft: "#EDEDEB" },
  navy: { label: "Navy", hex: "#22396B", soft: "#E4E9F3" },
  terracotta: { label: "Terracotta", hex: "#A4503A", soft: "#F5E6E1" },
};

/**
 * The whole type palette, on purpose. Four families, one job each, shared by every template so
 * the nine designs stay coordinated instead of drifting apart:
 *
 *  - `serif`   → display serif (titles, business name) on the classic/elegant templates
 *  - `display` → tight grotesque for headings on the modern templates
 *  - `sans`    → body copy, tables, amounts — legibility everywhere
 *  - `mono`    → invoice numbers, GSTINs and codes, so they stay aligned and scannable
 *
 * `serif` is self-hosted (public/fonts + @font-face in globals.css) and registered under the same
 * family name in the PDF (pdf-parts.tsx), so the live preview and the downloaded file match.
 * The other three are the Next.js `next/font` families already loaded by the app; their CSS
 * variables are safe in both HTML and inline styles.
 */
export const fontStack = {
  sans: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  display: "var(--font-instrument), var(--font-inter), ui-sans-serif, sans-serif",
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  mono: "var(--font-jetbrains), ui-monospace, monospace",
} as const;

export const templateTokens = {
  ink: "#17181B",
  ink2: "#4A4D55",
  ink3: "#676A72",
  rule: "#E4E1D9",
  paper: "#FFFFFF",
  marginMm: 16,
  base: 9.5,
  small: 8,
  tiny: 7.5,
  title: 16,
  number: 14,
  total: 14,
};
