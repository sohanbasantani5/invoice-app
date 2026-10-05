import { z } from "zod";
import { INVOICE_NUMBER_RE } from "./india";

const text = (max = 300) => z.string().max(max).default("");
const decimal = z
  .string()
  .max(20)
  .regex(/^\s*-?[\d,]*\.?\d*\s*$/, "Enter a number.")
  .default("");

export const buyerSchema = z.object({
  name: text(200),
  client_type: z.enum(["individual", "business_registered", "business_unregistered", "overseas"]).default("individual"),
  contact_person: text(120),
  email: text(200),
  phone: text(30),
  address_line1: text(),
  address_line2: text(),
  city: text(80),
  state_code: z.string().regex(/^(\d{2})?$/).default(""),
  pincode: text(10),
  country: text(60),
  gstin: text(15),
  pan: text(10),
});

export const lineSchema = z.object({
  key: z.string().max(64),
  name: text(200),
  description: text(1000),
  sac_hsn: text(10),
  unit: text(20),
  quantity: decimal,
  rate: decimal,
  discount: decimal,
  gst_rate: z.coerce.number().min(0).max(100),
});

/** The editor's form values. Numbers stay strings while typing; converted in document.ts. */
export const invoiceFormSchema = z.object({
  id: z.uuid().optional(),
  doc_type: z.enum(["tax_invoice", "bill_of_supply", "invoice", "credit_note"]),
  invoice_number: z
    .string()
    .trim()
    .max(16, "Invoice number can be at most 16 characters.")
    .refine((v) => v === "" || INVOICE_NUMBER_RE.test(v), "Use only letters, digits, - and /."),
  /** true until the user types their own number; the server then assigns the next one. */
  auto_number: z.boolean().default(true),
  issue_date: z.iso.date("Pick a valid date."),
  due_date: z.union([z.literal(""), z.iso.date()]).default(""),
  place_of_supply_code: z.string().regex(/^(\d{2})?$/).default(""),
  reverse_charge: z.boolean().default(false),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  reference: text(60),
  client_id: z.uuid().nullable().default(null),
  save_client: z.boolean().default(true),
  buyer: buyerSchema,
  ship_to_enabled: z.boolean().default(false),
  ship_to: z.object({
    name: text(200),
    address_line1: text(),
    address_line2: text(),
    city: text(80),
    state_code: z.string().regex(/^(\d{2})?$/).default(""),
    pincode: text(10),
  }),
  lines: z.array(lineSchema).max(200),
  round_off_enabled: z.boolean().default(true),
  tds_enabled: z.boolean().default(false),
  tds_rate: decimal,
  tds_label: text(40),
  notes: text(2000),
  terms: text(2000),
  show_bank: z.boolean().default(true),
  show_upi_qr: z.boolean().default(true),
  show_signature: z.boolean().default(true),
});

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
export type InvoiceFormParsed = z.output<typeof invoiceFormSchema>;
export type LineFormValues = z.input<typeof lineSchema>;
export type BuyerFormValues = z.input<typeof buyerSchema>;

export const paymentSchema = z.object({
  invoice_id: z.uuid(),
  amount: decimal.refine((v) => v.trim() !== "", "Enter an amount."),
  paid_on: z.iso.date(),
  method: z.enum(["upi", "bank_transfer", "cash", "cheque", "other"]),
  reference: text(100),
});
