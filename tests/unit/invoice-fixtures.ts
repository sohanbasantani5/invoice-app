import type { ListInvoiceRow } from "@/lib/invoice/list-query";

export const TODAY = "2026-10-08";

/** A complete row with every field the list/export reads, so tests only state what they change. */
export function row(overrides: Partial<ListInvoiceRow> = {}): ListInvoiceRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    invoice_number: "INV-2026-27/001",
    issue_date: "2026-09-01",
    due_date: "2026-09-15",
    status: "sent",
    currency: "INR",
    doc_type: "tax_invoice",
    buyer: { name: "Acme Studios", gstin: "29ABCDE1234F1Z5" },
    client_id: "22222222-2222-2222-2222-222222222222",
    subtotal_paise: 100_000_00,
    discount_paise: 0,
    taxable_paise: 100_000_00,
    cgst_paise: 9_000_00,
    sgst_paise: 9_000_00,
    igst_paise: 0,
    round_off_paise: 0,
    total_paise: 118_000_00,
    tds_enabled: false,
    tds_rate: 0,
    tds_label: "TDS",
    tds_paise: 0,
    amount_paid_paise: 0,
    ...overrides,
  };
}

/** Issued, TDS deducted at 10%, not settled yet (TDS pending). */
export const tdsPending = () =>
  row({ invoice_number: "INV-2026-27/002", tds_enabled: true, tds_rate: 10, tds_paise: 10_000_00 });

/** Issued, TDS deducted, fully paid (TDS accounted). */
export const tdsAccounted = () =>
  row({
    invoice_number: "INV-2026-27/003",
    status: "paid",
    tds_enabled: true,
    tds_rate: 10,
    tds_paise: 10_000_00,
    amount_paid_paise: 108_000_00,
  });
