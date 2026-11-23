// Record-Payment TDS math (pure, unit-tested). Two inputs drive each other:
//   - TDS (%)  → TDS Withheld (₹) = round(base × % / 100)
//   - TDS Withheld (₹) → TDS (%) = withheld / base × 100
// The base is the invoice's taxable value (the GST-exclusive amount), which equals the
// total when the invoice carries no GST — per the product rule. Amount to settle is
// Amount Received + TDS Withheld.

/** Percent → withheld paise. basePaise is the taxable/total paise. */
export function tdsWithheldFromPercent(basePaise: number, percent: number): number {
  if (!Number.isFinite(percent) || percent <= 0 || !(basePaise > 0)) return 0;
  return Math.round((basePaise * percent) / 100);
}

/** Withheld paise → percent (up to 1 decimal). Guarded against a zero/absent base. */
export function percentFromTdsWithheld(basePaise: number, withheldPaise: number): number {
  if (!(basePaise > 0) || !(withheldPaise > 0)) return 0;
  return Math.round((withheldPaise / basePaise) * 1000) / 10;
}

/** Net cash received after the client deducts TDS from the amount due. Never negative. */
export function netReceivedFromDue(duePaise: number, deductedPaise: number): number {
  return Math.max(0, duePaise - Math.max(0, deductedPaise));
}

/** Settlement math for a single payment decision (mirrors the sync trigger's rule). */
export function settlementMath(input: {
  totalPaise: number;
  receivedPaise: number; // already on the invoice
  tdsPaise: number; // already on the invoice
  amountPaise: number; // cash being recorded now
  tdsAddedPaise: number; // TDS being recorded now
}): {
  amountPaidPaise: number;
  tdsPaise: number;
  settled: number;
  balanceDue: number;
  paid: boolean;
} {
  const amountPaidPaise = input.receivedPaise + input.amountPaise;
  const tdsPaise = input.tdsPaise + input.tdsAddedPaise;
  const settled = amountPaidPaise + tdsPaise;
  return {
    amountPaidPaise,
    tdsPaise,
    settled,
    balanceDue: Math.max(0, input.totalPaise - settled),
    paid: settled >= input.totalPaise,
  };
}

/** The exact row we insert into `payments` — user_id is always explicit (no auth.uid() defaults). */
export function buildPaymentInsert(args: {
  invoiceId: string;
  userId: string;
  amountPaise: number;
  tdsPaise: number;
  tdsRate: number;
  paidOn: string;
  method?: string | null;
  reference?: string | null;
}) {
  return {
    invoice_id: args.invoiceId,
    user_id: args.userId,
    amount_paise: args.amountPaise,
    tds_paise: args.tdsPaise,
    tds_rate: args.tdsRate,
    paid_on: args.paidOn,
    method: args.method ?? null,
    reference: args.reference?.trim() || null,
  };
}
