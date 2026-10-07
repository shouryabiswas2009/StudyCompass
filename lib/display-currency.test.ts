import { describe, expect, it } from "vitest";
import {
  DISPLAY_CURRENCIES,
  approxInCurrency,
  currencyName,
  fromUsd,
  isDisplayCurrency,
  roundApprox,
} from "@/lib/display-currency";
import { USD_PER_UNIT } from "@/lib/exchange-rates";

describe("roundApprox", () => {
  it("keeps three significant figures", () => {
    expect(roundApprox(3_252_914)).toBe(3_250_000);
    expect(roundApprox(45_678)).toBe(45_700);
    expect(roundApprox(987)).toBe(987);
    expect(roundApprox(42)).toBe(42);
    expect(roundApprox(0)).toBe(0);
  });
});

describe("fromUsd", () => {
  it("divides by the dated ECB rate (US dollars per unit)", () => {
    // 10,000 USD at 0.0103845 USD per rupee = 962,973 rupees → 963,000
    expect(fromUsd(10_000, "INR")).toBe(roundApprox(10_000 / USD_PER_UNIT.INR));
    expect(fromUsd(10_000, "INR")).toBe(963_000);
    expect(fromUsd(13_224.7, "GBP")).toBe(10_000);
  });

  it("adds nothing for US dollars, unknown currencies or unknown amounts", () => {
    expect(fromUsd(10_000, "USD")).toBeNull();
    expect(fromUsd(10_000, "XYZ")).toBeNull();
    expect(fromUsd(null, "INR")).toBeNull();
    expect(fromUsd(10_000, null)).toBeNull();
  });
});

describe("approxInCurrency and the currency list", () => {
  it("formats with the currency's symbol and a ≈", () => {
    expect(approxInCurrency(10_000, "EUR")).toBe("≈ €8,930");
    expect(approxInCurrency(10_000, "USD")).toBeNull();
  });

  it("offers US dollars first and only currencies with a rate", () => {
    expect(DISPLAY_CURRENCIES[0]).toBe("USD");
    expect(DISPLAY_CURRENCIES.every((c) => c in USD_PER_UNIT)).toBe(true);
    expect(isDisplayCurrency("AED")).toBe(true); // the pegged dirham
    expect(isDisplayCurrency("BTC")).toBe(false);
  });

  it("names currencies", () => {
    expect(currencyName("INR")).toBe("Indian Rupee (INR)");
  });
});
