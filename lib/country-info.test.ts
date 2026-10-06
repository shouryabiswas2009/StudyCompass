import { describe, expect, it } from "vitest";
import { checkAge, guidanceItems, oldestCheck, STALE_AFTER_DAYS, type CountryInfo } from "@/lib/country-info";

const today = new Date("2026-10-06T15:30:00Z");

const info = (overrides: Partial<CountryInfo> = {}): CountryInfo => ({
  country: "United Kingdom",
  post_study_text: "Graduate visa: 18 months",
  post_study_months: 18,
  post_study_source_url: "https://www.gov.uk/graduate-visa",
  post_study_checked_on: "2026-10-06",
  funds_text: "£1,171 a month",
  funds_amount: 1171,
  funds_currency: "GBP",
  funds_period: "month",
  funds_source_url: "https://www.gov.uk/student-visa/money",
  funds_checked_on: "2026-07-01",
  work_text: "20 hours a week in term time",
  work_hours_per_week: 20,
  work_source_url: "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-student",
  work_checked_on: "2026-10-05",
  notes: null,
  ...overrides,
});

describe("checkAge", () => {
  it("labels by calendar day, whatever the time of day", () => {
    expect(checkAge("2026-10-06", today)?.label).toBe("checked today");
    expect(checkAge("2026-10-05", today)?.label).toBe("checked yesterday");
    expect(checkAge("2026-09-26", today)?.label).toBe("checked 10 days ago");
    expect(checkAge("2026-07-01", today)?.label).toBe("checked 3 months ago");
    expect(checkAge("2026-09-01", today)?.label).toBe("checked 1 month ago");
    expect(checkAge("2025-01-01", today)?.label).toBe("checked over a year ago");
  });

  it("marks checks older than the limit as stale", () => {
    expect(checkAge("2026-07-01", today)?.stale).toBe(false);
    const old = new Date(Date.UTC(2026, 9, 6) - (STALE_AFTER_DAYS + 1) * 86_400_000).toISOString().slice(0, 10);
    expect(checkAge(old, today)?.stale).toBe(true);
  });

  it("never reports a negative age, and rejects bad dates", () => {
    expect(checkAge("2026-12-01", today)?.days).toBe(0);
    expect(checkAge("not a date", today)).toBeNull();
  });
});

describe("guidanceItems", () => {
  it("formats the three headline figures", () => {
    const [post, funds, work] = guidanceItems(info());
    expect(post.headline).toBe("18 months");
    expect(funds.headline).toBe("£1,171 / month");
    expect(work.headline).toBe("20 h / week");
  });

  it("uses years for whole years and keeps cents when the amount has them", () => {
    const [post, funds] = guidanceItems(info({ post_study_months: 36, funds_amount: 1130.77, funds_currency: "EUR" }));
    expect(post.headline).toBe("3 years");
    expect(funds.headline).toBe("€1,130.77 / month");
  });

  it("keeps a slot for every figure, showing missing ones as not available (null)", () => {
    const items = guidanceItems(null);
    expect(items.map((i) => i.key)).toEqual(["post_study", "funds", "work"]);
    expect(items.every((i) => i.text === null && i.headline === null)).toBe(true);
  });

  it("shows the wording without a headline when there's no single number", () => {
    const work = guidanceItems(info({ work_hours_per_week: null, work_text: "964 hours a year" }))[2];
    expect(work.headline).toBeNull();
    expect(work.text).toBe("964 hours a year");
  });
});

describe("oldestCheck", () => {
  it("reports the oldest filled-in figure's check", () => {
    expect(oldestCheck(info(), today)?.label).toBe("checked 3 months ago");
  });

  it("ignores empty figures, and is null when nothing is filled in", () => {
    expect(oldestCheck(info({ funds_text: null, funds_amount: null }), today)?.label).toBe("checked yesterday");
    expect(oldestCheck(null, today)).toBeNull();
  });
});
