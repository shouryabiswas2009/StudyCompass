import { readText } from "@/lib/form-data";

// "Report a wrong figure" (table figure_reports, migration_018). Checked
// here and again by the table's constraints.

export const REPORT_FIELDS = {
  tuition: "Tuition",
  living_cost: "Living cost",
  acceptance_rate: "Acceptance rate",
  test_scores: "Test scores (SAT, IELTS)",
  graduation_outcomes: "Graduation, retention or earnings",
  research_impact: "Research impact",
  programs: "Programs",
  degree_levels: "Degree levels",
  coop: "Co-op / internships",
  country_guidance: "Visa and work guidance",
  other: "Something else",
} as const;

export type ReportField = keyof typeof REPORT_FIELDS;

export type FigureReport = {
  university_id: string;
  field: ReportField;
  current_value: string | null;
  suggested_value: string | null;
  source_url: string | null;
  note: string | null;
};

export type FigureReportResult = { ok: true; data: FigureReport } | { ok: false; error: string };

const optional = (text: string, max: number) => (text ? text.slice(0, max) : null);

export function validateFigureReport(formData: FormData): FigureReportResult {
  const university_id = readText(formData, "university_id");
  if (!/^[0-9a-f-]{36}$/i.test(university_id)) return { ok: false, error: "Unknown university." };

  const field = readText(formData, "field");
  if (!(field in REPORT_FIELDS)) return { ok: false, error: "Choose which figure looks wrong." };

  const suggested_value = optional(readText(formData, "suggested_value"), 200);
  const note = optional(readText(formData, "note"), 1000);
  if (!suggested_value && !note) {
    return { ok: false, error: "Say what the figure should be, or what's wrong with it." };
  }

  const source = readText(formData, "source_url");
  let source_url: string | null = null;
  if (source) {
    try {
      const url = new URL(source);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
      source_url = url.toString().slice(0, 500);
    } catch {
      return { ok: false, error: "The source should be a web address starting with https://." };
    }
  }

  return {
    ok: true,
    data: {
      university_id,
      field: field as ReportField,
      current_value: optional(readText(formData, "current_value"), 200),
      suggested_value,
      source_url,
      note,
    },
  };
}
