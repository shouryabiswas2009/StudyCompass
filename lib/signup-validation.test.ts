import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordErrors, validateSignup } from "@/lib/signup-validation";

describe("passwordErrors", () => {
  it("accepts matching passwords of the minimum length", () => {
    expect(passwordErrors("secret1", "secret1")).toEqual({});
    expect(passwordErrors("a".repeat(MIN_PASSWORD_LENGTH), "a".repeat(MIN_PASSWORD_LENGTH))).toEqual({});
  });

  it("says when the passwords don't match", () => {
    expect(passwordErrors("secret1", "secret2")).toEqual({ confirmPassword: "Passwords don't match." });
  });

  it("asks for the confirmation when it's empty", () => {
    expect(passwordErrors("secret1", "")).toEqual({ confirmPassword: "Type your password again to confirm it." });
  });

  it("keeps the minimum-length rule", () => {
    expect(passwordErrors("abc", "abc")).toEqual({ password: `Use at least ${MIN_PASSWORD_LENGTH} characters.` });
    expect(passwordErrors("", "")).toMatchObject({ password: "Enter a password." });
  });

  it("reports both problems at once (too short and not matching)", () => {
    expect(passwordErrors("abc", "abd")).toEqual({
      password: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
      confirmPassword: "Passwords don't match.",
    });
  });

  it("compares exactly (case and spaces count)", () => {
    expect(passwordErrors("Secret1", "secret1").confirmPassword).toBe("Passwords don't match.");
    expect(passwordErrors("secret1 ", "secret1").confirmPassword).toBe("Passwords don't match.");
  });
});

describe("validateSignup", () => {
  it("passes a valid sign-up through, trimming only the email", () => {
    expect(validateSignup("  me@example.com ", "secret1", "secret1")).toEqual({
      ok: true,
      email: "me@example.com",
      password: "secret1",
    });
  });

  it("returns field errors, never the passwords", () => {
    const result = validateSignup("not-an-email", "secret1", "different");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({ email: "Enter a valid email address.", confirmPassword: "Passwords don't match." });
      expect(JSON.stringify(result)).not.toContain("secret1");
      expect(JSON.stringify(result)).not.toContain("different");
    }
  });

  it("requires an email", () => {
    const result = validateSignup("", "secret1", "secret1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBe("Enter your email address.");
  });
});
