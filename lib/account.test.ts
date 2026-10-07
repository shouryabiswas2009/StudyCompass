import { describe, expect, it } from "vitest";
import { isDeleteConfirmed } from "@/lib/account";

describe("isDeleteConfirmed", () => {
  it("accepts the word, ignoring case and surrounding spaces", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
    expect(isDeleteConfirmed(" delete ")).toBe(true);
  });

  it("rejects anything else, including nothing at all", () => {
    for (const typed of ["", "DELET", "delete please", "yes", null, undefined, 42]) {
      expect(isDeleteConfirmed(typed)).toBe(false);
    }
  });
});
