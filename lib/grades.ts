// Grade systems on the profile. The app compares everyone on a percentage
// (profiles.gpa_percentage), so other systems are converted ONLY with a
// table their own board publishes; where no such table exists, the student
// gives their nearest percentage and it's marked approximate. No formula
// here is ours. Sources are cited in the form and on /credits; tests in
// lib/grades.test.ts.

export const GRADE_SYSTEMS = ["percentage", "cbse_cgpa", "ib", "cambridge_a_level", "us_gpa", "other"] as const;
export type GradeSystem = (typeof GRADE_SYSTEMS)[number];

// exact: already a percentage. converted: from a published table.
// approximate: the student's own nearest percentage.
export type GradeBasis = "exact" | "converted" | "approximate";

export type GradeSource = { name: string; url: string };

export const GRADE_SOURCES = {
  cbse: {
    name: "CBSE Circular No. 24 (28 May 2010): overall indicative percentage = 9.5 × CGPA",
    url: "https://www.cbse.gov.in/circulars/cir24-2010.pdf",
  },
  ib: {
    name: "International Baccalaureate, Suggested Conversion for Higher Education for students applying to Indian Universities (April 2012)",
    url: "https://aiu.ac.in/documents/evaluation/Grade%20Conversion%20IB.pdf",
  },
  cambridge: {
    name: "Cambridge International, India frequently asked questions (2025), Appendix 1: percentage uniform marks and grades",
    url: "https://www.cambridgeinternational.org/Images/745293-india-frequently-asked-questions.pdf",
  },
  collegeBoard: {
    name: "College Board BigFuture, How to Convert Your GPA to a 4.0 Scale (a per-class guide, not a GPA-to-percentage table)",
    url: "https://bigfuture.collegeboard.org/plan-for-college/get-started/how-to-convert-gpa-4.0-scale",
  },
} satisfies Record<string, GradeSource>;

export const GRADE_SYSTEM_INFO: Record<
  GradeSystem,
  { label: string; inputLabel: string; placeholder: string; basis: GradeBasis; source: GradeSource | null; help: string }
> = {
  percentage: {
    label: "Percentage or marks out of 100 (CBSE Class XII, ISC, state boards…)",
    inputLabel: "Overall percentage",
    placeholder: "e.g. 88",
    basis: "exact",
    source: null,
    help: "Your overall percentage, or the average of your subject marks out of 100.",
  },
  cbse_cgpa: {
    label: "CBSE Class X CGPA (out of 10)",
    inputLabel: "CGPA",
    placeholder: "e.g. 9.4",
    basis: "converted",
    source: GRADE_SOURCES.cbse,
    help: "Converted with CBSE's own rule: indicative percentage = 9.5 × CGPA.",
  },
  ib: {
    label: "IB Diploma subject grades (1–7)",
    inputLabel: "Your subject grades",
    placeholder: "e.g. 7, 6, 6, 5, 6, 7",
    basis: "converted",
    source: GRADE_SOURCES.ib,
    help: "Each grade becomes the middle of the IB's suggested mark range (7 → 98, 6 → 89, 5 → 76 …), as the IB says to; your percentage is their average.",
  },
  cambridge_a_level: {
    label: "Cambridge International A Level grades (A*–E)",
    inputLabel: "Your A Level grades",
    placeholder: "e.g. A*, A, B",
    basis: "converted",
    source: GRADE_SOURCES.cambridge,
    help: "Each grade becomes the middle of Cambridge's percentage uniform mark range (A* → 95, A → 85, B → 75 …); your percentage is their average. If your statement of results shows percentage uniform marks, choose Percentage and enter their average instead, as Cambridge asks.",
  },
  us_gpa: {
    label: "US GPA (4.0 scale)",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 90",
    basis: "approximate",
    source: GRADE_SOURCES.collegeBoard,
    help: "There's no published table that turns a GPA into a single percentage, so enter the nearest percentage from your school's own scale. We'll mark it approximate.",
  },
  other: {
    label: "Another system (other A Level boards, national exams…)",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 85",
    basis: "approximate",
    source: null,
    help: "We only convert with tables the exam boards publish. Enter the nearest percentage (your school or board can tell you); we'll mark it approximate.",
  },
};

export function isGradeSystem(value: string): value is GradeSystem {
  return (GRADE_SYSTEMS as readonly string[]).includes(value);
}

// IB's suggested ranges and their midpoints (the IB: "giving the midpoint of
// the range indicated for a particular grade").
export const IB_RANGES: Record<number, [number, number]> = {
  7: [96, 100],
  6: [83, 95],
  5: [70, 82],
  4: [56, 69],
  3: [41, 55],
  2: [21, 40],
  1: [1, 20],
};
const midpoint = ([low, high]: [number, number]) => (low + high) / 2;

// Cambridge's A Level PUM ranges. Their own worked example gives A* = 95,
// A = 85, B = 75 (the middle of each ten-mark band), so C, D and E follow
// the same bands: 65, 55, 45.
export const CAMBRIDGE_A_LEVEL_MARKS: Record<string, number> = {
  "A*": 95,
  A: 85,
  B: 75,
  C: 65,
  D: 55,
  E: 45,
};

export type GradeResult =
  | { ok: true; percentage: number; basis: GradeBasis }
  | { ok: false; error: string };

const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
// "7, 6,6 5" or "A* A, B" → ["7","6","6","5"] / ["A*","A","B"]
const splitList = (input: string) => input.split(/[\s,;/]+/).map((s) => s.trim()).filter(Boolean);

// `input` is what the student typed: a percentage, a CGPA, or a list of
// grades. For the approximate systems it's their nearest percentage.
export function gradeToPercentage(system: GradeSystem, input: string): GradeResult {
  const text = input.trim();
  if (!text) return { ok: false, error: "Enter your grades." };

  switch (system) {
    case "percentage":
    case "us_gpa":
    case "other": {
      const value = Number(text);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return { ok: false, error: "Enter a percentage from 0 to 100." };
      }
      return { ok: true, percentage: round1(value), basis: GRADE_SYSTEM_INFO[system].basis };
    }
    case "cbse_cgpa": {
      const cgpa = Number(text);
      if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) {
        return { ok: false, error: "A CBSE CGPA is from 0 to 10 (e.g. 9.4)." };
      }
      return { ok: true, percentage: round1(9.5 * cgpa), basis: "converted" };
    }
    case "ib": {
      const grades = splitList(text).map(Number);
      if (grades.length === 0 || grades.length > 8 || !grades.every((g) => Number.isInteger(g) && g >= 1 && g <= 7)) {
        return { ok: false, error: "Enter each IB subject grade from 1 to 7, separated by commas (e.g. 7, 6, 6, 5, 6, 7)." };
      }
      return { ok: true, percentage: round1(average(grades.map((g) => midpoint(IB_RANGES[g])))), basis: "converted" };
    }
    case "cambridge_a_level": {
      const grades = splitList(text).map((g) => g.toUpperCase());
      if (grades.length === 0 || grades.length > 6 || !grades.every((g) => g in CAMBRIDGE_A_LEVEL_MARKS)) {
        return { ok: false, error: "Enter each A Level grade (A*, A, B, C, D or E), separated by commas (e.g. A*, A, B)." };
      }
      return { ok: true, percentage: round1(average(grades.map((g) => CAMBRIDGE_A_LEVEL_MARKS[g]))), basis: "converted" };
    }
  }
}

// "88%", "89.3% (converted from your IB grades)", "90% (approximate)".
export function describeGrades(percentage: number, system: GradeSystem | undefined, basis: GradeBasis | undefined): string {
  if (basis === "approximate") return `${percentage}% (approximate, your estimate)`;
  if (basis === "converted" && system && system !== "percentage") {
    return `${percentage}% (converted from your ${GRADE_SYSTEM_INFO[system].label.replace(/ \(.*\)$/, "")})`;
  }
  return `${percentage}%`;
}
