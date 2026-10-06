import { describe, expect, it } from "vitest";
import { validateApplicationForm } from "@/lib/application-validation";

function makeForm(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    status: "admitted",
    program: "BSc Computer Science",
    deadline: "2027-01-15",
    tuition_per_year: "30000",
    scholarship_per_year: "5000",
    living_cost_per_year: "15000",
    duration_years: "4",
    notes: "",
    ...overrides,
  };
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.append(name, value);
  return formData;
}

describe("validateApplicationForm", () => {
  it("accepts a complete offer", () => {
    const result = validateApplicationForm(makeForm());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.scholarship_per_year).toBe(5000);
      expect(result.data.deadline).toBe("2027-01-15");
    }
  });

  it("treats blanks as unknown, and a blank scholarship as 0", () => {
    const result = validateApplicationForm(
      makeForm({ deadline: "", living_cost_per_year: "", scholarship_per_year: "" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.deadline).toBeNull();
      expect(result.data.living_cost_per_year).toBeNull();
      expect(result.data.scholarship_per_year).toBe(0);
    }
  });

  it.each([
    ["status", "maybe", /Choose a status/],
    ["deadline", "2027-02-30", /valid date/],
    ["deadline", "next week", /valid date/],
    ["scholarship_per_year", "-1", /0 or more/],
    ["duration_years", "0", /more than 0/],
    ["duration_years", "12", /at most 10/],
  ])("rejects %s = %s", (field, value, message) => {
    const result = validateApplicationForm(makeForm({ [field]: value }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[field as keyof typeof result.errors]).toMatch(message);
    }
  });
});
