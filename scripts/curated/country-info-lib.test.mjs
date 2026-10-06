import { describe, expect, it } from "vitest";
import { createInMemoryDb } from "../in-memory-db.mjs";
import { countryInfoSql, isOfficialUrl, validateCountryInfo } from "./country-info-lib.mjs";

// A complete, valid row; each test breaks one thing.
const good = (overrides = {}) => ({
  _line: 2,
  country: "Canada",
  post_study_text: "Up to 3 years",
  post_study_months: "36",
  post_study_source_url: "https://www.canada.ca/en/pgwp.html",
  post_study_checked_on: "2026-10-06",
  funds_text: "CA$23,448 a year",
  funds_amount: "23448",
  funds_currency: "CAD",
  funds_period: "year",
  funds_source_url: "https://www.canada.ca/en/funds.html",
  funds_checked_on: "2026-10-06",
  work_text: "24 hours a week",
  work_hours_per_week: "24",
  work_source_url: "https://www.canada.ca/en/work.html",
  work_checked_on: "2026-10-06",
  notes: "",
  ...overrides,
});

const errorsFor = (row, required) => validateCountryInfo([row], required).errors;

describe("isOfficialUrl", () => {
  it("accepts government domains and listed national agencies", () => {
    expect(isOfficialUrl("https://www.gov.uk/graduate-visa")).toBe(true);
    expect(isOfficialUrl("https://immi.homeaffairs.gov.au/visas")).toBe(true);
    expect(isOfficialUrl("https://www.sem.admin.ch/faq.html")).toBe(true);
    expect(isOfficialUrl("https://ind.nl/en")).toBe(true);
    expect(isOfficialUrl("https://www.uscis.gov/opt")).toBe(true);
  });

  it("rejects universities, look-alikes, plain http and junk", () => {
    expect(isOfficialUrl("https://www.ox.ac.uk/fees")).toBe(false);
    expect(isOfficialUrl("https://gov.uk.example.com/visa")).toBe(false);
    expect(isOfficialUrl("https://notcanada.ca/visa")).toBe(false);
    expect(isOfficialUrl("http://www.gov.uk/graduate-visa")).toBe(false);
    expect(isOfficialUrl("not a url")).toBe(false);
  });
});

describe("validateCountryInfo", () => {
  it("accepts a complete row", () => {
    expect(errorsFor(good())).toEqual([]);
  });

  it("accepts a row with every figure empty (shown as not available)", () => {
    const empty = good();
    for (const key of Object.keys(empty)) if (key !== "_line" && key !== "country") empty[key] = "";
    expect(errorsFor(empty)).toEqual([]);
  });

  it("requires an official source page for each figure", () => {
    expect(errorsFor(good({ work_source_url: "" })).join()).toMatch(/work_source_url is required/);
    expect(errorsFor(good({ funds_source_url: "https://www.studyabroad-blog.com/canada" })).join()).toMatch(
      /official government website/
    );
  });

  it("requires the date each figure was checked", () => {
    expect(errorsFor(good({ post_study_checked_on: "" })).join()).toMatch(/post_study_checked_on must be a date/);
    expect(errorsFor(good({ post_study_checked_on: "2026-13-45" })).join()).toMatch(/post_study_checked_on/);
  });

  it("requires the rule in words when a number is given", () => {
    expect(errorsFor(good({ post_study_text: "" })).join()).toMatch(/post_study_text is required/);
  });

  it("rejects out-of-range numbers", () => {
    expect(errorsFor(good({ work_hours_per_week: "100" })).join()).toMatch(/work_hours_per_week/);
    expect(errorsFor(good({ post_study_months: "-1" })).join()).toMatch(/post_study_months/);
  });

  it("requires a currency and period with a money amount", () => {
    expect(errorsFor(good({ funds_currency: "dollars" })).join()).toMatch(/funds_currency/);
    expect(errorsFor(good({ funds_period: "week" })).join()).toMatch(/funds_period/);
  });

  it("flags a source left behind without a figure", () => {
    expect(errorsFor(good({ work_text: "", work_hours_per_week: "" })).join()).toMatch(/source or date without a figure/);
  });

  it("requires a row for every country that has schools, and no duplicates", () => {
    expect(errorsFor(good(), ["Canada", "Japan"]).join()).toMatch(/missing a row for Japan/);
    const { errors } = validateCountryInfo([good(), good({ _line: 3 })]);
    expect(errors.join()).toMatch(/duplicate country/);
  });
});

describe("countryInfoSql", () => {
  it("runs on the real schema, twice, and overwrites removed figures with null", async () => {
    const { db } = await createInMemoryDb();
    await db.exec(countryInfoSql([good(), good({ country: "Japan", work_text: "", work_hours_per_week: "", work_source_url: "", work_checked_on: "" })]));
    await db.exec(countryInfoSql([good({ funds_text: "", funds_amount: "", funds_currency: "", funds_period: "", funds_source_url: "", funds_checked_on: "" })]));
    const { rows } = await db.query(
      "select country, funds_amount, work_hours_per_week, post_study_checked_on::text as checked from public.country_info order by country"
    );
    expect(rows).toEqual([
      { country: "Canada", funds_amount: null, work_hours_per_week: "24", checked: "2026-10-06" },
      { country: "Japan", funds_amount: "23448", work_hours_per_week: null, checked: "2026-10-06" },
    ]);
  }, 30_000);

  it("the database refuses a figure without its source", async () => {
    const { db } = await createInMemoryDb();
    await expect(
      db.exec("insert into public.country_info (country, work_hours_per_week) values ('Peru', 20)")
    ).rejects.toThrow(/country_info_work_sourced/);
  }, 30_000);
});
