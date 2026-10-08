import { describe, expect, it } from "vitest";
import { balancePaise, invoiceSummary, type SummaryInput } from "@/lib/invoice/summary";

const inv = (o: Partial<SummaryInput> = {}): SummaryInput => ({
  status: "sent",
  currency: "INR",
  total_paise: 0,
  tds_paise: 0,
  amount_paid_paise: 0,
  ...o,
});

describe("balancePaise", () => {
  it("is total minus TDS minus what was received", () => {
    expect(balancePaise({ total_paise: 118_000_00, tds_paise: 10_000_00, amount_paid_paise: 0 })).toBe(108_000_00);
  });

  it("is never negative (an overpayment is not a credit we track)", () => {
    expect(balancePaise({ total_paise: 100_00, tds_paise: 0, amount_paid_paise: 150_00 })).toBe(0);
  });
});

describe("invoiceSummary", () => {
  const rows: SummaryInput[] = [
    inv({ total_paise: 100_00 }),
    inv({ status: "partially_paid", total_paise: 200_00, tds_paise: 20_00, amount_paid_paise: 180_00 }),
    inv({ status: "paid", total_paise: 300_00, tds_paise: 30_00, amount_paid_paise: 270_00 }),
    inv({ status: "draft", total_paise: 400_00 }),
    inv({ status: "cancelled", total_paise: 500_00 }),
    inv({ currency: "USD", total_paise: 1000_00 }),
  ];

  it("counts every row but totals only issued INR invoices", () => {
    const s = invoiceSummary(rows);
    expect(s.count).toBe(6);
    expect(s.issued).toBe(3);
    expect(s.invoiced).toBe(600_00);
    expect(s.received).toBe(450_00);
    expect(s.outstanding).toBe(100_00);
    expect(s.tds).toBe(50_00);
  });

  it("reports drafts/cancelled and other currencies so nothing looks silently dropped", () => {
    const s = invoiceSummary(rows);
    expect(s.excludedDraftsCancelled).toBe(2);
    expect(s.otherCurrency).toBe(1);
  });

  it("counts open invoices and splits TDS into pending vs accounted", () => {
    const s = invoiceSummary(rows);
    expect(s.open).toBe(2);
    expect(s.tdsPending).toBe(20_00);
    expect(s.tdsAccounted).toBe(30_00);
  });

  it("is all zeros for an empty result", () => {
    const s = invoiceSummary([]);
    expect(s).toMatchObject({ count: 0, issued: 0, invoiced: 0, received: 0, outstanding: 0, tds: 0 });
  });

  it("keeps the currency it was asked for", () => {
    expect(invoiceSummary([inv({ currency: "USD", total_paise: 5_00 })], "USD").invoiced).toBe(5_00);
  });
});
