import { describe, expect, it } from "vitest";
import { validateFigureReport } from "@/lib/figure-report";

const ID = "00b4ab93-97ea-4126-a5d9-d1f78ce82a20";
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ university_id: ID, field: "tuition", ...fields })) fd.set(k, v);
  return fd;
};

describe("validateFigureReport", () => {
  it("accepts a report with a suggested value and a source", () => {
    const r = validateFigureReport(form({ current_value: "$33,780", suggested_value: "$35,100", source_url: "https://example.edu/fees" }));
    expect(r).toEqual({
      ok: true,
      data: { university_id: ID, field: "tuition", current_value: "$33,780", suggested_value: "$35,100", source_url: "https://example.edu/fees", note: null },
    });
  });

  it("accepts a note instead of a value", () => {
    expect(validateFigureReport(form({ note: "This is the in-state fee" })).ok).toBe(true);
  });

  it("needs something to check", () => {
    expect(validateFigureReport(form({}))).toEqual({ ok: false, error: "Say what the figure should be, or what's wrong with it." });
  });

  it("rejects unknown fields, ids and non-web links", () => {
    expect(validateFigureReport(form({ field: "vibes", note: "x" })).ok).toBe(false);
    expect(validateFigureReport(form({ university_id: "1; drop table", note: "x" })).ok).toBe(false);
    expect(validateFigureReport(form({ note: "x", source_url: "javascript:alert(1)" }))).toMatchObject({ ok: false });
    expect(validateFigureReport(form({ note: "x", source_url: "not a url" }))).toMatchObject({ ok: false });
  });

  it("trims long text to the table's limits", () => {
    const r = validateFigureReport(form({ note: "a".repeat(1500) }));
    expect(r.ok && r.data.note?.length).toBe(1000);
  });
});
