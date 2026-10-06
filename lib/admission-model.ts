import model from "@/lib/model/admission-model.json";
import type { AdmissionChance } from "@/lib/matching";
import type { Profile, University } from "@/lib/types";

// Runs the logistic regression trained in ml/train_admission.py, in plain
// TypeScript: the exported coefficients, a dot product and a sigmoid. No
// Python server needed.
//
// The model was trained on SYNTHETIC undergraduate applicants simulated
// around real College Scorecard admission rates and SAT ranges
// (ml/generate_synthetic.py), so its output is a demo estimate, not a real
// admissions prediction — the UI says so wherever it's shown.

export type ModelProfile = Pick<Profile, "gpa_percentage" | "sat_score">;
// The model needs a known admission rate (every College Scorecard row has one).
export type ModelUniversity = Pick<University, "sat_25" | "sat_75"> & { acceptance_rate: number };

// Must match FEATURES in ml/features.py, in the same order.
const FEATURE_NAMES = ["gpa", "sat_z", "sat_known", "acceptance_logit"] as const;

// Fail loudly if the exported model and this file ever disagree, instead of
// silently multiplying the wrong numbers together.
if (JSON.stringify(model.features) !== JSON.stringify(FEATURE_NAMES)) {
  throw new Error("admission-model.json features don't match lib/admission-model.ts");
}

export const ADMISSION_MODEL_INFO = {
  trainedOn: model.trained_on,
  beatsBaseline: model.beats_baseline,
  testMetrics: model.test_metrics,
  baselineTestMetrics: model.baseline_test_metrics,
};

const isKnown = (v: number | null | undefined): v is number =>
  v !== null && v !== undefined && !Number.isNaN(v);

// Mirrors build_features() in ml/features.py line for line. The parity test
// (lib/admission-model.test.ts) checks the two give the same predictions.
export function admissionFeatures(profile: ModelProfile, university: ModelUniversity): number[] {
  const { sat_25, sat_75 } = university;
  const sat = profile.sat_score;
  const satKnown = isKnown(sat) && isKnown(sat_25) && isKnown(sat_75);
  let satZ = 0;
  if (satKnown) {
    const sd = Math.max(sat_75 - sat_25, 10) / 1.349;
    satZ = (sat - (sat_25 + sat_75) / 2) / sd;
  }

  const p = Math.min(0.99, Math.max(0.01, university.acceptance_rate / 100));
  const acceptanceLogit = Math.log(p / (1 - p));

  return [profile.gpa_percentage, satZ, satKnown ? 1 : 0, acceptanceLogit];
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

// Probability from the features. `ignore` sets those features to the
// training average (a standardized value of 0), which is how contributions
// are measured below.
function probability(features: number[], ignore: number[] = []): number {
  let z = model.intercept;
  features.forEach((value, i) => {
    if (ignore.includes(i)) return;
    const standardized = (value - model.scaler_mean[i]) / model.scaler_scale[i];
    z += model.coefficients[i] * standardized;
  });
  return sigmoid(z);
}

// Features grouped the way a student thinks about them.
const GROUPS: { label: string; features: number[] }[] = [
  { label: "Your GPA", features: [0] },
  { label: "SAT", features: [1, 2] },
  { label: "School's selectivity", features: [3] },
];

export type AdmissionPrediction = {
  probability: number; // 0..1
  // How many percentage points each group moves the estimate, compared with
  // an average applicant from the training data (e.g. "SAT: +9 points").
  // `known` is false when there's no data for that factor (e.g. a school
  // with no SAT range), so the UI can say "no data" instead of showing the
  // model's small adjustment for missingness as if it were a real effect.
  contributions: { label: string; points: number; known: boolean }[];
};

export function predictAdmission(
  profile: ModelProfile,
  university: ModelUniversity
): AdmissionPrediction {
  const features = admissionFeatures(profile, university);
  const p = probability(features);
  const satKnown = features[2] === 1;

  const contributions = GROUPS.map(({ label, features: idx }) => ({
    label,
    points: Math.round((p - probability(features, idx)) * 100),
    known: label === "SAT" ? satKnown : true,
  }));

  return { probability: p, contributions };
}

// Reach / Match / Safety from the model's probability.
export const MODEL_REACH_BELOW = 0.3;
export const MODEL_SAFETY_FROM = 0.7;

export function chanceFromProbability(p: number): AdmissionChance {
  if (p < MODEL_REACH_BELOW) return "Reach";
  if (p >= MODEL_SAFETY_FROM) return "Safety";
  return "Match";
}
