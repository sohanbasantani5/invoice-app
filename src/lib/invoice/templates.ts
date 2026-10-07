// Invoice templates are PRESENTATION ONLY. This file is the single list of valid template ids,
// shared by validation, the save action, the preview registry and the PDF registry.
// It has no React / PDF imports so it is safe to use on the server.

export const TEMPLATE_IDS = ["default", "rose", "studio", "creative", "bakery", "pink_modern", "elegant", "lime", "dynamic"] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];
export const DEFAULT_TEMPLATE_ID: TemplateId = "default";

/** Unknown, empty or missing ids (old invoices, removed templates) fall back to the Classic template. */
export function normalizeTemplateId(id: string | null | undefined): TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(id ?? "") ? (id as TemplateId) : DEFAULT_TEMPLATE_ID;
}
