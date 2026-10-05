// Hand-written to match supabase/migrations/0001_schema.sql (same shape as `supabase gen types`).
// Regenerate with `npm run db:types` once the Supabase CLI is logged in.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type GstStatus = "unregistered" | "regular" | "composition";
export type DocType = "tax_invoice" | "bill_of_supply" | "invoice" | "credit_note";
export type InvoiceStatus = "draft" | "sent" | "paid" | "partially_paid" | "cancelled";
export type ClientType = "individual" | "business_registered" | "business_unregistered" | "overseas";
export type PaymentMethod = "upi" | "bank_transfer" | "cash" | "cheque" | "other";
export type TemplateAccent = "pine" | "ink" | "navy" | "terracotta";

export type ProfileRow = {
  user_id: string;
  business_name: string | null;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  pincode: string | null;
  gst_status: GstStatus;
  gstin: string | null;
  pan: string | null;
  logo_path: string | null;
  signature_path: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  upi_id: string | null;
  invoice_prefix: string;
  default_due_days: number;
  default_notes: string | null;
  default_terms: string | null;
  round_off_default: boolean;
  template_accent: TemplateAccent;
  show_logo: boolean;
  email_subject_template: string | null;
  email_body_template: string | null;
  email_body_fallback_template: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  user_id: string;
  name: string;
  client_type: ClientType;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_code: string | null;
  pincode: string | null;
  country: string;
  gstin: string | null;
  pan: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  sac_hsn: string | null;
  unit: string | null;
  rate_paise: number;
  gst_rate: number;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  user_id: string;
  client_id: string | null;
  doc_type: DocType;
  invoice_number: string;
  financial_year: string;
  sequence: number | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  place_of_supply_code: string | null;
  reverse_charge: boolean;
  currency: string;
  reference: string | null;
  original_invoice_id: string | null;
  seller: Json;
  buyer: Json;
  ship_to: Json | null;
  round_off_enabled: boolean;
  tds_enabled: boolean;
  tds_rate: number;
  tds_label: string;
  subtotal_paise: number;
  discount_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  round_off_paise: number;
  total_paise: number;
  tds_paise: number;
  amount_paid_paise: number;
  notes: string | null;
  terms: string | null;
  show_bank: boolean;
  show_upi_qr: boolean;
  show_signature: boolean;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  user_id: string;
  position: number;
  name: string;
  description: string | null;
  sac_hsn: string | null;
  unit: string | null;
  quantity: number;
  rate_paise: number;
  discount_paise: number;
  gst_rate: number;
  taxable_paise: number;
  tax_paise: number;
  amount_paise: number;
};

export type PaymentRow = {
  id: string;
  invoice_id: string;
  user_id: string;
  amount_paise: number;
  paid_on: string;
  method: PaymentMethod | null;
  reference: string | null;
  created_at: string;
};

export type GmailConnectionRow = { user_id: string; email: string; refresh_token_enc: string; created_at: string };

export type InvoiceCounterRow = { user_id: string; financial_year: string; last_seq: number };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, "user_id">;
      clients: Table<ClientRow, "name">;
      items: Table<ItemRow, "name">;
      invoices: Table<InvoiceRow, "invoice_number" | "financial_year">;
      invoice_items: Table<InvoiceItemRow, "invoice_id" | "position" | "name">;
      payments: Table<PaymentRow, "invoice_id" | "amount_paise">;
      invoice_counters: Table<InvoiceCounterRow, "financial_year">;
      gmail_connections: Table<GmailConnectionRow, "email" | "refresh_token_enc">;
    };
    Views: { [_ in never]: never };
    Functions: {
      next_invoice_number: { Args: { p_fy: string }; Returns: number };
      save_invoice: { Args: { p_invoice: Json; p_items: Json }; Returns: string };
      record_items: { Args: { p_items: Json }; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
