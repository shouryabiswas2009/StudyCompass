import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL, without a trailing slash", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://studycompass.com/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://studycompass.com"
    );
  });

  it("falls back to Vercel's production domain, adding https://", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "studycompass.vercel.app" })).toBe("https://studycompass.vercel.app");
  });

  it("uses localhost when nothing is set (local development)", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "  " })).toBe("http://localhost:3000");
  });
});
