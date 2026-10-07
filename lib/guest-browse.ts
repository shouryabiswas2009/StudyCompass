import { getDisplayRanking, type MatchEntry } from "@/lib/matching";
import { qualityScore } from "@/lib/quality";
import { PLAUSIBILITY_UNKNOWN, QUALITY_UNKNOWN } from "@/lib/scoring-config";
import type { Profile, UniversitySummary } from "@/lib/types";

// Browsing without an account. A visitor has no profile, so there's no
// personal fit or admission chance to show: every school is "Not enough
// data" for them, and the list is ordered by quality alone (the same
// quality score as everywhere else; unknown quality counts as typical, see
// withNeutralUnknowns). Cards hide the personal parts (lib: guest flag).

// A blank profile, only used to read rankings (no subject chosen).
const NO_PROFILE: Profile = {
  id: "guest",
  full_name: "",
  country: "",
  intended_majors: [],
  gpa_percentage: 0,
  ielts_score: null,
  sat_score: null,
  budget_min: 0,
  budget_max: 0,
  preferred_countries: [],
  preferred_degree_level: "Undergraduate",
  focuses: [],
  created_at: "",
  updated_at: "",
};

export function guestBrowseEntry(university: UniversitySummary): MatchEntry {
  const { score: quality, parts } = qualityScore(NO_PROFILE, university);
  return {
    university,
    match: { score: 0, eligible: true, factors: [], chance: "Not enough data", chanceSource: "rule" },
    explanation: { strengths: [], concerns: [] },
    ranking: getDisplayRanking(university, NO_PROFILE),
    prediction: null,
    rank: {
      quality,
      qualityParts: parts,
      plausibility: PLAUSIBILITY_UNKNOWN,
      plausibilitySource: "unknown",
      gate: { passes: true, reasons: [] },
      realistic: (quality ?? QUALITY_UNKNOWN) * PLAUSIBILITY_UNKNOWN,
      reason: "Create a free profile to see how well it fits you and your chances.",
    },
  };
}
