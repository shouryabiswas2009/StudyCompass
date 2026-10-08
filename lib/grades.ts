// Grade systems on the profile. The app compares everyone on a percentage
// (profiles.gpa_percentage), so other systems are converted ONLY with a
// table their own board publishes; where no such table exists, the student
// gives their nearest percentage and it's marked approximate. No formula
// here is ours. Sources are cited in the form and on /credits; tests in
// lib/grades.test.ts.

export const GRADE_SYSTEMS = [
  // Saved profiles may hold any of these first six; never remove a key.
  "percentage",
  "cbse_cgpa",
  "ib",
  "cambridge_a_level",
  "us_gpa",
  "other",
  // Canada (docs/GRADE-SYSTEMS-CONSIDERED.md)
  "ca_ontario",
  "ca_british_columbia",
  "ca_alberta",
  "ca_manitoba",
  "ca_saskatchewan",
  "ca_nova_scotia",
  "ca_new_brunswick",
  "ca_newfoundland",
  "ca_pei",
  "ca_quebec",
  // More international programmes and countries
  "ap",
  "au_atar",
] as const;
export type GradeSystem = (typeof GRADE_SYSTEMS)[number];

// exact: already a percentage. converted: from a published table.
// approximate: the student's own nearest percentage.
export type GradeBasis = "exact" | "converted" | "approximate";

export type GradeSource = { name: string; url: string };

// How the picker groups the systems.
export const GRADE_GROUPS = ["Percentage-based", "Canada", "International programmes", "India", "Other countries", "Other"] as const;
export type GradeGroup = (typeof GRADE_GROUPS)[number];

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
  ontario: {
    name: "Ontario Ministry of Education, Student assessment, evaluations and report cards (Growing Success): secondary report cards give achievement levels and their percentage marks",
    url: "https://www.ontario.ca/page/student-assessment-evaluations-and-report-cards",
  },
  britishColumbia: {
    name: "BC Ministry of Education and Child Care, K-12 Student Reporting Policy: Grades 10-12 use letter grades and percentages",
    url: "https://www2.gov.bc.ca/gov/content/education-training/k-12/administration/legislation-policy/public-schools/student-reporting",
  },
  alberta: {
    name: "Alberta Education, Diploma exams overview: 70% of the final mark from course work, 30% from the diploma exam",
    url: "https://www.alberta.ca/diploma-exams-overview",
  },
  manitoba: {
    name: "Manitoba Provincial Report Card Policy: Grades 9 to 12 are reported using only the percentage grade scale",
    url: "https://www.edu.gov.mb.ca/k12/assess/report_card/docs/provincial_report_card_policy.pdf",
  },
  saskatchewan: {
    name: "Saskatchewan Ministry of Education, Requesting transcripts for high school (Grades 10-12 marks; the page doesn't say how they're scaled)",
    url: "https://www.saskatchewan.ca/residents/education-and-learning/credits-degrees-and-transcripts/requesting-transcripts-for-high-school",
  },
  quebec: {
    name: "Bureau de coopération interuniversitaire, La cote de rendement au collégial (cote R)",
    url: "https://www.bci-qc.ca/cote-r/",
  },
  ap: {
    name: "College Board, About AP Scores: reported on a 1-5 scale (no percentage conversion)",
    url: "https://apstudents.collegeboard.org/about-ap-scores",
  },
  atar: {
    name: "UAC, Australian Tertiary Admission Rank: the ATAR is a rank, not a mark",
    url: "https://www.uac.edu.au/future-applicants/atar",
  },
} satisfies Record<string, GradeSource>;

// How the grade is entered: a percentage (exact or the student's nearest),
// or something we convert with a published table.
export type GradeEntry = "percentage" | "cbse_cgpa" | "ib" | "cambridge";

export type GradeSystemInfo = {
  label: string; // in the picker
  short: string; // in sentences: "your Ontario OSSD average"
  group: GradeGroup;
  entry: GradeEntry;
  inputLabel: string;
  placeholder: string;
  hint: string; // what exactly to enter
  basis: GradeBasis;
  source: GradeSource | null;
  help: string; // why it's exact / converted / approximate
};

// Percentage-based provinces whose ministry says so: exact, no conversion.
const canadaExact = (label: string, short: string, hint: string, source: GradeSource, extra = ""): GradeSystemInfo => ({
  label,
  short,
  group: "Canada",
  entry: "percentage",
  inputLabel: "Your average (%)",
  placeholder: "e.g. 88",
  hint,
  basis: "exact",
  source,
  help: `Marks here are already percentages, so nothing is converted: we use your average as it is.${extra}`,
});

// Provinces where we couldn't confirm on an official page how marks are
// reported: the student's own average, marked approximate until we can.
const canadaUnverified = (label: string, short: string, source: GradeSource | null = null): GradeSystemInfo => ({
  label,
  short,
  group: "Canada",
  entry: "percentage",
  inputLabel: "Your Grade 12 average (%)",
  placeholder: "e.g. 85",
  hint: "Your Grade 12 average as a percentage, as your transcript shows it.",
  basis: "approximate",
  source,
  help: "We couldn't confirm on the education department's own site how Grade 12 marks are reported, so this is kept as your figure and marked approximate (see docs/GRADE-SYSTEMS-CONSIDERED.md).",
});

export const GRADE_SYSTEM_INFO: Record<GradeSystem, GradeSystemInfo> = {
  percentage: {
    label: "Percentage or marks out of 100 (CBSE Class XII, ICSE/ISC, Indian state boards…)",
    short: "percentage",
    group: "Percentage-based",
    entry: "percentage",
    inputLabel: "Overall percentage",
    placeholder: "e.g. 88",
    hint: "Your overall percentage, or the average of your subject marks out of 100.",
    basis: "exact",
    source: null,
    help: "Already a percentage, so it's used as it is.",
  },
  ca_ontario: canadaExact(
    "Ontario (OSSD)",
    "Ontario OSSD average",
    "The average of your best six Grade 12 U/M courses (how Ontario universities look at it).",
    GRADE_SOURCES.ontario
  ),
  ca_british_columbia: canadaExact("British Columbia", "BC Grade 12 average", "Your Grade 12 average as a percentage.", GRADE_SOURCES.britishColumbia),
  ca_alberta: canadaExact(
    "Alberta",
    "Alberta Grade 12 average",
    "Your Grade 12 average as a percentage (for diploma courses, the final blended mark).",
    GRADE_SOURCES.alberta,
    " For diploma courses the final mark already blends 70% course work with the 30% diploma exam, as Alberta Education sets it."
  ),
  ca_manitoba: canadaExact("Manitoba", "Manitoba Grade 12 average", "Your Grade 12 average as a percentage.", GRADE_SOURCES.manitoba),
  ca_saskatchewan: canadaUnverified("Saskatchewan", "Saskatchewan Grade 12 average", GRADE_SOURCES.saskatchewan),
  ca_nova_scotia: canadaUnverified("Nova Scotia", "Nova Scotia Grade 12 average"),
  ca_new_brunswick: canadaUnverified("New Brunswick", "New Brunswick Grade 12 average"),
  ca_newfoundland: canadaUnverified("Newfoundland and Labrador", "Newfoundland and Labrador Grade 12 average"),
  ca_pei: canadaUnverified("Prince Edward Island", "PEI Grade 12 average"),
  ca_quebec: {
    label: "Quebec (Secondary V or CEGEP R-score)",
    short: "Quebec average",
    group: "Canada",
    entry: "percentage",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 85",
    hint: "Your average as a percentage (not your R-score).",
    basis: "approximate",
    source: GRADE_SOURCES.quebec,
    help: "CEGEP's R-score (cote R) is a relative, rank-based score computed from your group's results, not a percentage, so it can't be converted. Enter your nearest percentage; we'll mark it approximate.",
  },
  ib: {
    label: "IB Diploma subject grades (1–7)",
    short: "IB Diploma subject grades",
    group: "International programmes",
    entry: "ib",
    inputLabel: "Your subject grades",
    placeholder: "e.g. 7, 6, 6, 5, 6, 7",
    hint: "Each subject grade from 1 to 7, separated by commas.",
    basis: "converted",
    source: GRADE_SOURCES.ib,
    help: "Each grade becomes the middle of the IB's suggested mark range (7 → 98, 6 → 89, 5 → 76 …), as the IB says to; your percentage is their average.",
  },
  cambridge_a_level: {
    label: "Cambridge International A Level grades (A*–E)",
    short: "Cambridge A Level grades",
    group: "International programmes",
    entry: "cambridge",
    inputLabel: "Your A Level grades",
    placeholder: "e.g. A*, A, B",
    hint: "Each A Level grade, separated by commas.",
    basis: "converted",
    source: GRADE_SOURCES.cambridge,
    help: "Each grade becomes the middle of Cambridge's percentage uniform mark range (A* → 95, A → 85, B → 75 …); your percentage is their average. If your statement of results shows percentage uniform marks, choose Percentage and enter their average instead, as Cambridge asks.",
  },
  ap: {
    label: "AP (Advanced Placement) scores",
    short: "AP-based estimate",
    group: "International programmes",
    entry: "percentage",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 88",
    hint: "Your school's overall percentage (AP scores 1–5 aren't a percentage).",
    basis: "approximate",
    source: GRADE_SOURCES.ap,
    help: "AP exams are scored 1–5 and the College Board publishes no percentage conversion, so enter your nearest percentage; we'll mark it approximate. IB students: choose the IB option instead.",
  },
  cbse_cgpa: {
    label: "CBSE Class X CGPA (out of 10)",
    short: "CBSE CGPA",
    group: "India",
    entry: "cbse_cgpa",
    inputLabel: "CGPA",
    placeholder: "e.g. 9.4",
    hint: "Your CGPA out of 10.",
    basis: "converted",
    source: GRADE_SOURCES.cbse,
    help: "Converted with CBSE's own rule: indicative percentage = 9.5 × CGPA.",
  },
  us_gpa: {
    label: "US GPA (4.0 scale)",
    short: "US GPA estimate",
    group: "Other countries",
    entry: "percentage",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 90",
    hint: "The nearest percentage from your school's own grading scale.",
    basis: "approximate",
    source: GRADE_SOURCES.collegeBoard,
    help: "There's no published table that turns a GPA into a single percentage, so enter the nearest percentage from your school's own scale. We'll mark it approximate.",
  },
  au_atar: {
    label: "Australia (ATAR)",
    short: "Australian estimate",
    group: "Other countries",
    entry: "percentage",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 85",
    hint: "Your average mark out of 100 (not your ATAR).",
    basis: "approximate",
    source: GRADE_SOURCES.atar,
    help: "The ATAR is a rank against your age group, not a mark, so it can't be turned into a percentage. Enter your average mark; we'll mark it approximate.",
  },
  other: {
    label: "Another system (other boards, national exams…)",
    short: "estimate",
    group: "Other",
    entry: "percentage",
    inputLabel: "Your nearest percentage",
    placeholder: "e.g. 85",
    hint: "The nearest percentage your school or board would give.",
    basis: "approximate",
    source: null,
    help: "We only convert with tables the exam boards publish. Enter the nearest percentage (your school or board can tell you); we'll mark it approximate.",
  },
};

// The picker's groups, with the student's own country's group first
// (a Canadian student sees Canada first).
export function groupedGradeSystems(homeCountry?: string | null): { group: GradeGroup; systems: GradeSystem[] }[] {
  const first: GradeGroup | null = homeCountry === "Canada" ? "Canada" : homeCountry === "India" ? "India" : null;
  const order = first ? [first, ...GRADE_GROUPS.filter((g) => g !== first)] : [...GRADE_GROUPS];
  return order
    .map((group) => ({ group, systems: GRADE_SYSTEMS.filter((s) => GRADE_SYSTEM_INFO[s].group === group) }))
    .filter((g) => g.systems.length > 0);
}

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

  const info = GRADE_SYSTEM_INFO[system];
  switch (info.entry) {
    case "percentage": {
      const value = Number(text);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return { ok: false, error: "Enter a percentage from 0 to 100." };
      }
      return { ok: true, percentage: round1(value), basis: info.basis };
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
    case "cambridge": {
      const grades = splitList(text).map((g) => g.toUpperCase());
      if (grades.length === 0 || grades.length > 6 || !grades.every((g) => g in CAMBRIDGE_A_LEVEL_MARKS)) {
        return { ok: false, error: "Enter each A Level grade (A*, A, B, C, D or E), separated by commas (e.g. A*, A, B)." };
      }
      return { ok: true, percentage: round1(average(grades.map((g) => CAMBRIDGE_A_LEVEL_MARKS[g]))), basis: "converted" };
    }
  }
}

// How the percentage was obtained, for "Your fit" and compare:
// "88%", "88% (Ontario OSSD average, exact)",
// "89.8% (converted from your IB Diploma subject grades)",
// "90% (approximate, your estimate)".
export function describeGrades(percentage: number, system: GradeSystem | undefined, basis: GradeBasis | undefined): string {
  const info = system && isGradeSystem(system) ? GRADE_SYSTEM_INFO[system] : null;
  if (basis === "approximate") return `${percentage}% (approximate, your estimate)`;
  if (basis === "converted" && info) return `${percentage}% (converted from your ${info.short})`;
  if (basis === "exact" && info && system !== "percentage") return `${percentage}% (${info.short}, exact)`;
  return `${percentage}%`;
}

// Whether the grade is typed as a list/CGPA we convert (grade_input) or as
// a percentage (gpa_percentage).
export function convertsInput(system: GradeSystem): boolean {
  return GRADE_SYSTEM_INFO[system].entry !== "percentage";
}

// When the student switches system: keep what they typed only if the new
// system is entered the same way (a percentage stays a percentage); IB
// grades typed into a CGPA box would be nonsense, so that's cleared.
export function inputAfterSystemChange(from: GradeSystem, to: GradeSystem, input: string): string {
  return GRADE_SYSTEM_INFO[from].entry === GRADE_SYSTEM_INFO[to].entry ? input : "";
}

// The picker's filter: matches the label, the group or the short name,
// ignoring case ("ontario", "ib", "canada").
export function filterGradeSystems(query: string, systems: readonly GradeSystem[]): GradeSystem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...systems];
  return systems.filter((s) => {
    const info = GRADE_SYSTEM_INFO[s];
    return [info.label, info.group, info.short].some((text) => text.toLowerCase().includes(q));
  });
}
