import { describe, expect, it } from "vitest";
import { addDaysISO, formatAmount, formatDate, formatMoney, paiseToInput, parseRupeesToPaise, todayISO } from "@/lib/format";

describe("format", () => {
  it("formats money in Indian grouping", () => {
    expect(formatMoney(10000000)).toBe("₹1,00,000.00");
    expect(formatMoney(0)).toBe("₹0.00");
    expect(formatAmount(12345678)).toBe("1,23,456.78");
    expect(formatMoney(5000, "USD")).toContain("50.00");
  });
  it("parses rupee input to integer paise", () => {
    expect(parseRupeesToPaise("4,000")).toBe(400000);
    expect(parseRupeesToPaise("₹ 4000.5")).toBe(400050);
    expect(parseRupeesToPaise("0.07")).toBe(7);
    expect(parseRupeesToPaise("-12.30")).toBe(-1230);
    expect(parseRupeesToPaise("1.234")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise(".")).toBeNull();
  });
  it("round-trips paise to input text", () => {
    expect(paiseToInput(400000)).toBe("4000");
    expect(paiseToInput(400050)).toBe("4000.50");
    expect(paiseToInput(-5)).toBe("-0.05");
  });
  it("formats dates without timezone shifts", () => {
    expect(formatDate("2026-10-04")).toBe("04 Oct 2026");
    expect(formatDate("2026-10-04T23:00:00Z")).toBe("04 Oct 2026");
    expect(formatDate(null)).toBe("");
    expect(formatDate("bad")).toBe("");
    expect(addDaysISO("2026-12-28", 7)).toBe("2027-01-04");
    expect(todayISO(new Date("2026-03-31T20:00:00Z"))).toBe("2026-04-01");
  });
});
