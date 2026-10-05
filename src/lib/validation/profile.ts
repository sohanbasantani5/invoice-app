import { z } from "zod";
import { normalizeCode } from "./india";

// Lenient on purpose: optional fields with bad formats are warnings, not errors (04 §1, §6).
export const optText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const optCode = (max: number) =>
  z
    .string()
    .transform((v) => normalizeCode(v))
    .pipe(z.string().max(max, `At most ${max} characters.`))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const stateCode = z
  .string()
  .regex(/^(\d{2})?$/, "Pick a state from the list.")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const businessSchema = z.object({
  business_name: optText(120),
  legal_name: optText(120),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.")])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  phone: optText(30),
});

export const addressTaxSchema = z.object({
  address_line1: optText(),
  address_line2: optText(),
  city: optText(80),
  state_code: stateCode,
  pincode: optText(10),
  gst_status: z.enum(["unregistered", "regular", "composition"]),
  gstin: optCode(15),
  pan: optCode(10),
});

export const paymentsSchema = z.object({
  bank_name: optText(120),
  bank_account_name: optText(120),
  bank_account_number: optCode(34),
  bank_ifsc: optCode(11),
  upi_id: optText(256),
});

export const defaultsSchema = z.object({
  invoice_prefix: z
    .string()
    .trim()
    .max(8, "Keep the prefix to 8 characters so numbers stay under 16.")
    .regex(/^[A-Za-z0-9-]*$/, "Use letters, digits or -.")
    .transform((v) => v.toUpperCase() || "INV"),
  default_due_days: z.coerce.number().int().min(0).max(365),
  default_notes: optText(1000),
  default_terms: optText(1000),
  round_off_default: z.boolean(),
  template_accent: z.enum(["pine", "ink", "navy", "terracotta"]),
  show_logo: z.boolean(),
});

/** Empty = use the built-in wording. */
export const emailTemplateSchema = z.object({
  email_subject_template: optText(200),
  email_body_template: optText(3000),
  email_body_fallback_template: optText(3000),
});

export const brandingSchema = z.object({
  logo_path: z.string().max(200).nullable().optional(),
  signature_path: z.string().max(200).nullable().optional(),
});

export const profileSections = {
  business: businessSchema,
  address: addressTaxSchema,
  payments: paymentsSchema,
  defaults: defaultsSchema,
  email: emailTemplateSchema,
  branding: brandingSchema,
} as const;
export type ProfileSection = keyof typeof profileSections;

export type BusinessInput = z.input<typeof businessSchema>;
export type AddressTaxInput = z.input<typeof addressTaxSchema>;
export type PaymentsInput = z.input<typeof paymentsSchema>;
export type DefaultsInput = z.input<typeof defaultsSchema>;
