import type { ClientType, DocType, GstStatus, InvoiceStatus, TemplateAccent } from "@/types/database";

/** Copied from the profile when the invoice is saved (rule 4: invoices are snapshots). */
export type SellerSnapshot = {
  business_name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  pincode?: string | null;
  gst_status?: GstStatus;
  gstin?: string | null;
  pan?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  upi_id?: string | null;
  logo_path?: string | null;
  signature_path?: string | null;
  template_accent?: TemplateAccent;
  show_logo?: boolean;
};

/** Copied from the client when the invoice is saved. */
export type BuyerSnapshot = {
  name?: string | null;
  client_type?: ClientType;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  pincode?: string | null;
  country?: string | null;
  gstin?: string | null;
  pan?: string | null;
};

export type ShipTo = {
  name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_code?: string | null;
  pincode?: string | null;
};

export type InvoiceLine = {
  name: string;
  description?: string | null;
  sac_hsn?: string | null;
  unit?: string | null;
  quantity: number;
  rate_paise: number;
  discount_paise: number;
  gst_rate: number;
};

/** Everything the preview, the PDF and the save action need — one shape for all three. */
export type InvoiceDocument = {
  id?: string;
  doc_type: DocType;
  status: InvoiceStatus;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  place_of_supply_code: string | null;
  reverse_charge: boolean;
  currency: string;
  reference?: string | null;
  seller: SellerSnapshot;
  buyer: BuyerSnapshot;
  ship_to?: ShipTo | null;
  lines: InvoiceLine[];
  round_off_enabled: boolean;
  tds_enabled: boolean;
  tds_rate: number;
  tds_label: string;
  amount_paid_paise: number;
  notes?: string | null;
  terms?: string | null;
  show_bank: boolean;
  show_upi_qr: boolean;
  show_signature: boolean;
};
