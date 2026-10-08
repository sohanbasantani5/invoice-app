import { describe, expect, it } from "vitest";
import { TDS_STATE_LABELS, tdsState } from "@/lib/invoice/tds";
import type { InvoiceStatus } from "@/types/database";

const ALL: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "cancelled"];

describe("tdsState", () => {
  it("is 'none' when no TDS is deducted, whatever the status", () => {
    for (const status of ALL) expect(tdsState(0, status)).toBe("none");
  });

  it("is 'none' when the switch is on but the rate is 0 (nothing is deducted)", () => {
    expect(tdsState(0, "sent")).toBe("none");
  });

  it("is 'none' for a cancelled invoice even when TDS was set (no live claim)", () => {
    expect(tdsState(10_000_00, "cancelled")).toBe("none");
  });

  it("is 'pending' while the invoice is not settled", () => {
    expect(tdsState(10_000_00, "draft")).toBe("pending");
    expect(tdsState(10_000_00, "sent")).toBe("pending");
    expect(tdsState(10_000_00, "partially_paid")).toBe("pending");
  });

  it("is 'accounted' once the invoice is fully paid", () => {
    expect(tdsState(10_000_00, "paid")).toBe("accounted");
  });

  it("has full labels and never invents a fourth state", () => {
    expect(Object.keys(TDS_STATE_LABELS).sort()).toEqual(["accounted", "none", "pending"]);
  });
});
