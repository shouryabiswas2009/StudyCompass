import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

describe("siteUrl", () => {
  it("prefers SITE_URL, without a trailing slash", () => {
    expect(siteUrl({ SITE_URL: "https://www.unicelerate.com/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://www.unicelerate.com"
    );
    expect(siteUrl({ SITE_URL: "https://www.unicelerate.com", NEXT_PUBLIC_SITE_URL: "https://old.example.com" })).toBe(
      "https://www.unicelerate.com"
    );
  });

  it("still accepts the older NEXT_PUBLIC_SITE_URL name", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://www.unicelerate.com/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://www.unicelerate.com"
    );
  });

  it("falls back to Vercel's production domain, adding https://", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "unicelerate.vercel.app" })).toBe("https://unicelerate.vercel.app");
  });

  it("uses localhost when nothing is set (local development)", () => {
    expect(siteUrl({})).toBe("http://localhost:3000");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "  " })).toBe("http://localhost:3000");
  });
});
