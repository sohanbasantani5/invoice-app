import { describe, expect, it } from "vitest";
import { amountInWords, indianWords, internationalWords } from "@/lib/invoice/words";

describe("amountInWords (Indian system)", () => {
  it.each([
    [0, "Indian Rupees Zero Only"],
    [100, "Indian Rupees One Only"],
    [1500, "Indian Rupees Fifteen Only"],
    [10000, "Indian Rupees One Hundred Only"],
    [100000, "Indian Rupees One Thousand Only"],
    [400000, "Indian Rupees Four Thousand Only"],
    [10000000, "Indian Rupees One Lakh Only"],
    [1000000000, "Indian Rupees One Crore Only"],
    [12345060, "Indian Rupees One Lakh Twenty-Three Thousand Four Hundred Fifty and Sixty Paise Only"],
    [50, "Indian Rupees Zero and Fifty Paise Only"],
    [2101, "Indian Rupees Twenty-One and One Paise Only"],
  ])("%i paise", (paise, words) => {
    expect(amountInWords(paise)).toBe(words);
  });

  it("supports up to 99,99,99,99,999", () => {
    expect(indianWords(99_99_99_99_999)).toBe(
      "Nine Thousand Nine Hundred Ninety-Nine Crore Ninety-Nine Lakh Ninety-Nine Thousand Nine Hundred Ninety-Nine",
    );
  });

  it("negative amounts (credit notes)", () => {
    expect(amountInWords(-150000)).toBe("Indian Rupees Minus One Thousand Five Hundred Only");
  });
});

describe("foreign currencies use the international system", () => {
  it("USD", () => {
    expect(amountInWords(123456789, "USD")).toBe(
      "US Dollars One Million Two Hundred Thirty-Four Thousand Five Hundred Sixty-Seven and Eighty-Nine Cents Only",
    );
  });
  it("GBP and EUR", () => {
    expect(amountInWords(5, "GBP")).toBe("Pounds Sterling Zero and Five Pence Only");
    expect(amountInWords(200000000000, "EUR")).toBe("Euros Two Billion Only");
  });
  it("unknown currency falls back to rupee names", () => {
    expect(amountInWords(100, "XYZ")).toBe("Indian Rupees One Only");
  });
  it("international zero", () => {
    expect(internationalWords(0)).toBe("Zero");
  });
});
