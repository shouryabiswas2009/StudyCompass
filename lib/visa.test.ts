import { describe, expect, it } from "vitest";
import type { CountryInfo } from "@/lib/country-info";
import { USD_PER_UNIT } from "@/lib/exchange-rates";
import { visaFit, visaLine, visaModeOf } from "@/lib/visa";

const info = (fields: Partial<CountryInfo>): CountryInfo => ({
  country: "Testland",
  post_study_text: null, post_study_months: null, post_study_source_url: null, post_study_checked_on: null,
  funds_text: null, funds_amount: null, funds_currency: null, funds_period: null, funds_source_url: null, funds_checked_on: null,
  work_text: null, work_hours_per_week: null, work_source_url: null, work_checked_on: null, notes: null,
  ...fields,
});
const student = (fields = {}) => ({ budget_max: 40000, stay_after: "yes" as const, ...fields });

describe("visaFit", () => {
  it("scores a long post-study window higher than a short one", () => {
    const long = visaFit(student(), info({ post_study_months: 36 }), { tuition: 20000 });
    const short = visaFit(student(), info({ post_study_months: 6 }), { tuition: 20000 });
    expect(long.score).toBe(1);
    expect(short.score).toBeCloseTo(6 / 36);
    expect(long.reasons).toEqual(["3-year post-study work window"]);
    expect(short.concerns).toEqual(["Shorter post-study work window (6-month)"]);
  });

  it("flags proof of funds above what the budget leaves after tuition (per month, converted)", () => {
    // £1,171 a month ≈ $1,549; $40,000 − $30,000 tuition leaves ≈ $833 a month.
    const fit = visaFit(student(), info({ funds_amount: 1171, funds_currency: "GBP", funds_period: "month" }), { tuition: 30000 });
    const required = 1171 * USD_PER_UNIT.GBP;
    expect(fit.score).toBeCloseTo(10000 / 12 / Math.round(required), 2);
    expect(fit.concerns[0]).toMatch(/^Required funds are above your budget/);
    // A budget that covers it is a strength, at full marks.
    const rich = visaFit(student({ budget_max: 60000 }), info({ funds_amount: 1171, funds_currency: "GBP", funds_period: "month" }), { tuition: 30000 });
    expect(rich.score).toBe(1);
    expect(rich.reasons).toEqual(["Your budget covers the proof-of-funds requirement"]);
  });

  it("drops the post-study part for a student going home, and halves it when unsure", () => {
    const home = visaFit(student({ stay_after: "no" }), info({ post_study_months: 36, work_hours_per_week: 0 }), { tuition: 0 });
    expect(home.parts.map((p) => p.key)).toEqual(["work"]);
    expect(home.score).toBe(0);
    expect(home.notes).toContain("You plan to return home, so the post-study work window isn't counted.");
    const unsure = visaFit(student({ stay_after: "unsure" }), info({ post_study_months: 36 }), { tuition: 0 });
    expect(unsure.parts[0].weight).toBe(3);
  });

  it("leaves out what it doesn't know, and says nothing is known rather than scoring zero", () => {
    expect(visaFit(student(), null, { tuition: 1 }).score).toBeNull();
    expect(visaFit(student(), info({}), { tuition: 1 }).score).toBeNull();
    // Funds without a tuition figure: can't compare, so left out.
    const noTuition = visaFit(student(), info({ funds_amount: 800, funds_currency: "EUR", funds_period: "month", work_hours_per_week: 30 }), { tuition: null });
    expect(noTuition.parts.map((p) => p.key)).toEqual(["work"]);
  });

  it("treats 0 work hours as a real figure and uses neutral wording", () => {
    const fit = visaFit(student(), info({ work_hours_per_week: 0 }), { tuition: 0 });
    expect(fit.score).toBe(0);
    expect(fit.concerns).toEqual(["No work allowed during study"]);
    const all = JSON.stringify(visaFit(student(), info({ post_study_months: 6, work_hours_per_week: 10 }), { tuition: 0 }));
    expect(all).not.toMatch(/easy|hard|difficult|approval/i);
  });
});

describe("visaLine and visaModeOf", () => {
  it("summarises the cited figures or says they aren't available", () => {
    expect(visaLine(info({ post_study_months: 18, work_hours_per_week: 20 }))).toBe("Visa: 18-month post-study work · 20 h/week work in study");
    expect(visaLine(info({}))).toBe("Visa information not available");
    expect(visaLine(null)).toBe("Visa information not available");
  });
  it("defaults to ignore", () => {
    expect(visaModeOf(null)).toBe("ignore");
    expect(visaModeOf({ visa_mode: null })).toBe("ignore");
    expect(visaModeOf({ visa_mode: "factor" })).toBe("factor");
  });
});
