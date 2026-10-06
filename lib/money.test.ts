import { describe, expect, it } from "vitest";
import { livingCostDisplay, tuitionDisplay } from "./money";
import { toUsd } from "./exchange-rates";

const base = { tuition: null, living_cost_per_year: null };

describe("tuitionDisplay", () => {
  it("says 'Not available' instead of $0 or a blank", () => {
    expect(tuitionDisplay(base).text).toBe("Not available");
  });

  it("shows US dollars as they are", () => {
    expect(tuitionDisplay({ ...base, tuition: 58000, tuition_currency: "USD" })).toMatchObject({
      text: "$58,000/yr",
      approximate: false,
    });
  });

  it("labels converted amounts as approximate, with the original and the rate date", () => {
    const shown = tuitionDisplay({
      ...base,
      tuition: 13225,
      tuition_local: 10000,
      tuition_currency: "GBP",
      fx_rate_date: "2026-10-05",
      tuition_basis: "Lowest published international undergraduate fee",
      tuition_year: "2025-26",
    });
    expect(shown.text).toBe("from ≈ $13,225/yr");
    expect(shown.approximate).toBe(true);
    expect(shown.note).toContain("£10,000");
    expect(shown.note).toContain("2026-10-05");
    expect(shown.note).toContain("2025-26");
  });

  it("shows the local amount, unconverted, when there's no official rate", () => {
    const shown = tuitionDisplay({ ...base, tuition: null, tuition_local: 100000, tuition_currency: "TWD" });
    expect(shown.text).toContain("100,000");
    expect(shown.note).toContain("No official exchange rate");
  });
});

describe("livingCostDisplay", () => {
  it("says 'Not available' when unknown", () => {
    expect(livingCostDisplay(base).text).toBe("Not available");
  });
});

describe("toUsd", () => {
  it("converts with the ECB rate, and never guesses a missing one", () => {
    expect(toUsd(100, "USD")).toBe(100);
    expect(toUsd(null, "GBP")).toBeNull();
    expect(toUsd(100, "TWD")).toBeNull(); // not published by the ECB
    expect(toUsd(36725, "AED")).toBe(10000); // official peg
  });
});
