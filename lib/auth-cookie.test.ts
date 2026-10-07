import { describe, expect, it } from "vitest";
import { AUTH_STATE_SCRIPT, hasAuthCookie } from "@/lib/auth-cookie";

describe("hasAuthCookie", () => {
  it("finds the Supabase login cookie, whole or split into chunks", () => {
    expect(hasAuthCookie("sb-abcdefghijklmnop-auth-token=base64-xyz")).toBe(true);
    expect(hasAuthCookie("theme=dark; sb-abc-auth-token.0=part1; sb-abc-auth-token.1=part2")).toBe(true);
  });

  it("ignores other cookies and empty values", () => {
    expect(hasAuthCookie("")).toBe(false);
    expect(hasAuthCookie("theme=dark; other-auth-token=1")).toBe(false);
    expect(hasAuthCookie("sb-abc-auth-token=")).toBe(false);
    expect(hasAuthCookie("sb-abc-auth-token-code-verifier=xyz")).toBe(false);
  });

  it("the inline script uses the same pattern", () => {
    const run = (cookie: string) => {
      const doc = { cookie, documentElement: { dataset: {} as Record<string, string> } };
      new Function("document", AUTH_STATE_SCRIPT)(doc);
      return doc.documentElement.dataset.auth;
    };
    expect(run("sb-abc-auth-token=x")).toBe("in");
    expect(run("theme=dark")).toBe("out");
  });
});
