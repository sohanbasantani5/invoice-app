// Shared by the HTML preview (InvoicePaper) and the PDF (InvoicePdf) so they match (02 §7).
import type { TemplateAccent } from "@/types/database";

export const ACCENTS: Record<TemplateAccent, { label: string; hex: string; soft: string }> = {
  pine: { label: "Pine", hex: "#1F5C4B", soft: "#E3EEE9" },
  ink: { label: "Ink", hex: "#17181B", soft: "#EDEDEB" },
  navy: { label: "Navy", hex: "#22396B", soft: "#E4E9F3" },
  terracotta: { label: "Terracotta", hex: "#A4503A", soft: "#F5E6E1" },
};

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
