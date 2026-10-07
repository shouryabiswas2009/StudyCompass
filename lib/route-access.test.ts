import { describe, expect, it } from "vitest";
import { isProtectedPath, isPublicUniversityPage } from "@/lib/route-access";

describe("isProtectedPath", () => {
  it("keeps the student's own pages members-only", () => {
    for (const path of ["/profile", "/recommendations", "/saved", "/applications", "/offers", "/compare", "/universities"]) {
      expect(isProtectedPath(path)).toBe(true);
    }
  });

  it("keeps adding and editing a university members-only", () => {
    expect(isProtectedPath("/universities/new")).toBe(true);
    expect(isProtectedPath("/universities/abc-123/edit")).toBe(true);
  });

  it("lets anyone open a single university's page", () => {
    expect(isPublicUniversityPage("/universities/0b9f3c2e-1d2a-4c1b-9e7a-1234567890ab")).toBe(true);
    expect(isProtectedPath("/universities/0b9f3c2e-1d2a-4c1b-9e7a-1234567890ab")).toBe(false);
  });

  it("leaves public pages alone and doesn't match look-alike paths", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/privacy")).toBe(false);
    expect(isProtectedPath("/profiles-of-students")).toBe(false);
  });
});
