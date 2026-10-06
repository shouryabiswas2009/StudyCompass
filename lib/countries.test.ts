import { describe, expect, it } from "vitest";
import { canonicalCountry, countryCode } from "./countries";

describe("canonicalCountry", () => {
  it("maps common aliases and spellings to one name", () => {
    expect(canonicalCountry("UK")).toBe("United Kingdom");
    expect(canonicalCountry("England")).toBe("United Kingdom");
    expect(canonicalCountry("usa")).toBe("United States");
    expect(canonicalCountry("United States of America")).toBe("United States");
    expect(canonicalCountry("Holland")).toBe("Netherlands");
    expect(canonicalCountry("korea")).toBe("South Korea");
    expect(canonicalCountry("UAE")).toBe("United Arab Emirates");
    expect(canonicalCountry("  canada ")).toBe("Canada");
  });

  it("keeps a country it doesn't know instead of rejecting it", () => {
    expect(canonicalCountry(" Chile ")).toBe("Chile");
  });
});

describe("countryCode", () => {
  it("finds the flag for an alias too", () => {
    expect(countryCode("UK")).toBe("gb");
    expect(countryCode("Taiwan")).toBe("tw");
    expect(countryCode("Atlantis")).toBeNull();
  });
});
