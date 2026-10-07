import { describe, expect, it } from "vitest";
import { decide, impactRecord, matchSchool, nameSimilarity, normalizeName, percentiles, sameCountry, siteDomain } from "./lib.mjs";

describe("percentiles", () => {
  it("gives the best 100, the lowest 0 and the middle 50", () => {
    const p = percentiles([0.3, 0.1, 0.2]);
    expect(p.get(0.1)).toBe(0);
    expect(p.get(0.2)).toBe(50);
    expect(p.get(0.3)).toBe(100);
  });

  it("counts ties half", () => {
    // 0.2 twice: one value below, one tied other → (1 + 0.5) / 3 = 50
    const p = percentiles([0.1, 0.2, 0.2, 0.4]);
    expect(p.get(0.2)).toBe(50);
    expect(p.get(0.4)).toBe(100);
  });

  it("has nothing to compare with fewer than two values", () => {
    expect(percentiles([0.5]).size).toBe(0);
    expect(percentiles([]).size).toBe(0);
  });
});

describe("normalizeName and siteDomain", () => {
  it("ignores 'The', accents, punctuation and '&'", () => {
    expect(normalizeName("The University of Tokyo")).toBe("university of tokyo");
    expect(normalizeName("Université Paris-Saclay")).toBe("universite paris saclay");
    expect(normalizeName("Texas A&M University")).toBe("texas a and m university");
  });

  it("keeps the identifying part of a web address", () => {
    expect(siteDomain("https://www.ox.ac.uk/admissions")).toBe("ox.ac.uk");
    expect(siteDomain("http://www2.example.edu")).toBe("example.edu");
    expect(siteDomain("not a url")).toBeNull();
    expect(siteDomain(null)).toBeNull();
  });

  it("treats Hong Kong as Leiden's China, and nothing else", () => {
    expect(sameCountry("Hong Kong", "China")).toBe(true);
    expect(sameCountry("Taiwan", "China")).toBe(false);
  });

  it("measures word overlap", () => {
    expect(nameSimilarity("University of Oxford", "Oxford University")).toBe(1);
    expect(nameSimilarity("University of Oxford", "Oxford Brookes University")).toBeCloseTo(2 / 3);
  });
});

const LEIDEN = [
  { ror: "052gg0110", name: "University of Oxford", country: "United Kingdom", domain: "ox.ac.uk", alternatives: [] },
  { ror: "04v2twj65", name: "Oxford Brookes University", country: "United Kingdom", domain: "brookes.ac.uk", alternatives: [] },
  { ror: "042nb2s44", name: "Massachusetts Institute of Technology", country: "United States", domain: "mit.edu", alternatives: ["MIT"] },
  { ror: "00f54p054", name: "Stanford University", country: "United States", domain: "stanford.edu", alternatives: [] },
  { ror: "02zhqgq86", name: "University of Hong Kong", country: "China", domain: "hku.hk", alternatives: [] },
  { ror: "01aaaaaaa", name: "Miami University", country: "United States", domain: "miamioh.edu", alternatives: [] },
];

describe("matchSchool", () => {
  it("matches a US school through its IPEDS id → ROR id (high)", () => {
    const m = matchSchool({ name: "MIT", country: "United States", ipedsRors: ["042nb2s44"] }, LEIDEN);
    expect(m).toMatchObject({ confidence: "high", method: "IPEDS id → Wikidata → ROR id" });
    expect(m.leiden.ror).toBe("042nb2s44");
  });

  it("matches by website domain within the same country (high)", () => {
    const m = matchSchool({ name: "Oxford", country: "United Kingdom", website: "https://www.ox.ac.uk" }, LEIDEN);
    expect(m).toMatchObject({ confidence: "high", method: "website domain + country" });
    expect(m.leiden.ror).toBe("052gg0110");
  });

  it("matches Hong Kong schools against Leiden's China", () => {
    const m = matchSchool({ name: "The University of Hong Kong", country: "Hong Kong", website: "https://www.hku.hk" }, LEIDEN);
    expect(m.leiden.ror).toBe("02zhqgq86");
  });

  it("matches the exact name + country (medium), including aliases", () => {
    expect(matchSchool({ name: "Stanford University", country: "United States" }, LEIDEN)).toMatchObject({ confidence: "medium" });
    expect(matchSchool({ name: "MIT", aliases: ["Massachusetts Institute of Technology"], country: "United States" }, LEIDEN)).toMatchObject({ confidence: "medium" });
  });

  it("only suggests a match on one of OpenAlex's other (possibly historical) names", () => {
    const leiden = [{ ror: "00hj8s172", name: "Columbia University", country: "United States", domain: "columbia.edu", alternatives: ["King's College"] }];
    expect(matchSchool({ name: "King's College", country: "United States" }, leiden)).toMatchObject({ confidence: "low" });
  });

  it("never matches across countries", () => {
    expect(matchSchool({ name: "Stanford University", country: "Canada" }, LEIDEN)).toBeNull();
  });

  it("only suggests a similar name (low)", () => {
    const m = matchSchool({ name: "Oxford University", country: "United Kingdom" }, LEIDEN);
    expect(m).toMatchObject({ confidence: "low" });
    expect(m.leiden.ror).toBe("052gg0110");
  });

  it("doesn't confuse 'University of Miami' with 'Miami University'", () => {
    const m = matchSchool({ name: "University of Miami", country: "United States" }, LEIDEN);
    // Same words, so at most a suggestion for a person to reject.
    expect(m?.confidence ?? "none").not.toBe("high");
    expect(m?.confidence ?? "none").not.toBe("medium");
  });

  it("returns null when nothing is close", () => {
    expect(matchSchool({ name: "Tiny Art College", country: "United States" }, LEIDEN)).toBeNull();
  });
});

describe("decide", () => {
  const base = { leiden_name: "X", method: "m" };
  it("accepts high and medium, not low", () => {
    const out = decide(
      [
        { ...base, key: "a", ror: "1", confidence: "high" },
        { ...base, key: "b", ror: "2", confidence: "medium" },
        { ...base, key: "c", ror: "3", confidence: "low" },
      ],
      new Map()
    );
    expect(out.map((m) => m.accepted)).toEqual(["yes", "yes", "no"]);
    expect(out[2].note).toBe("needs review");
  });

  it("drops a similar-name suggestion when the Leiden university already has a strong match", () => {
    const out = decide(
      [
        { ...base, key: "umich", ror: "1", confidence: "high" },
        { ...base, key: "eastern-michigan", ror: "1", confidence: "low" },
      ],
      new Map()
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ key: "umich", accepted: "yes" });
  });

  it("sends two schools claiming one Leiden university back for review", () => {
    const out = decide(
      [
        { ...base, key: "a", ror: "1", confidence: "high" },
        { ...base, key: "b", ror: "1", confidence: "medium" },
      ],
      new Map()
    );
    expect(out.every((m) => m.accepted === "no")).toBe(true);
  });

  it("follows a person's review in overrides.csv", () => {
    const out = decide(
      [{ ...base, key: "c", ror: "3", confidence: "low" }],
      new Map([["c|3", { accepted: "yes", reason: "same university, checked its website" }]])
    );
    expect(out[0]).toMatchObject({ accepted: "yes", note: "reviewed: same university, checked its website" });
  });
});

describe("impactRecord", () => {
  it("keeps the percentiles, the figure behind them and where they come from", () => {
    const r = impactRecord({
      ror: "052gg0110",
      overall: { percentile: 97, pp: 0.21234, p: 41234.6 },
      fields: { math_cs: { percentile: 95 } },
      source: { name: "Leiden", url: "https://doi.org/x", licence: "CC0 1.0", period: "2020–2023" },
      checkedOn: "2026-10-07",
    });
    expect(r).toEqual({
      overall: 97,
      pp_top10: 0.212,
      publications: 41235,
      fields: { math_cs: 95 },
      ror: "052gg0110",
      source: "Leiden",
      source_url: "https://doi.org/x",
      data_year: "2020–2023",
      licence: "CC0 1.0",
      checked_on: "2026-10-07",
    });
  });
});
