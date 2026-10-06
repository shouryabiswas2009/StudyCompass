"""Generate SYNTHETIC undergraduate applicants.

There's no public per-student undergraduate admissions data, so this
simulates applicants around each school's (illustrative) admission figures
and admits them with a noisy rule. The result demonstrates the modeling
pipeline; it is NOT real admissions data, and a model trained on it does
not predict real admissions. Everything downstream is labeled accordingly.

Run from the project root:
    npm run ml:export-universities
    ml/.venv/Scripts/python ml/generate_synthetic.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
UNIVERSITIES = ROOT / "data" / "universities.csv"
OUT = ROOT / "data" / "synthetic_applicants.csv"

SEED = 42  # fixed so every run produces the same data
APPLICANTS_PER_SCHOOL = 300
SAT_NOT_SUBMITTED = 0.20  # share of US applicants who apply test-optional
IELTS_NOT_REPORTED = 0.15  # e.g. native speakers

# The hidden "true" rule of this synthetic world. Schools admit the
# strongest share of their pool (so each school's admit rate tracks its
# acceptance rate), where strength is a weighted mix of grades and scores
# plus random noise for everything we don't observe (essays, interviews...).
GPA_WEIGHT = 1.5
SAT_WEIGHT = 0.9
IELTS_WEIGHT = 0.6
NOISE_SCALE = 1.0
# English requirements behave like hard cutoffs: most applicants below the
# minimum are rejected even if otherwise strong (a few get conditional offers).
BELOW_IELTS_MIN_REJECT_RATE = 0.85


def simulate_school(school: pd.Series, rng: np.random.Generator) -> pd.DataFrame:
    n = APPLICANTS_PER_SCHOOL

    # Applicant pools are a bit weaker on average than the students admitted.
    gpa = np.clip(rng.normal(school.avg_admitted_gpa - 4, 6, n), 50, 100).round(1)

    has_sat_range = pd.notna(school.sat_25) and pd.notna(school.sat_75)
    if has_sat_range:
        mid = (school.sat_25 + school.sat_75) / 2
        sd = (school.sat_75 - school.sat_25) / 1.349
        sat = np.clip(np.round(rng.normal(mid - 0.3 * sd, 1.1 * sd, n) / 10) * 10, 400, 1600)
        sat[rng.random(n) < SAT_NOT_SUBMITTED] = np.nan
    else:
        sat = np.full(n, np.nan)

    if pd.notna(school.min_ielts):
        ielts = np.clip(np.round(rng.normal(school.min_ielts + 0.3, 0.7, n) * 2) / 2, 4, 9)
        ielts[rng.random(n) < IELTS_NOT_REPORTED] = np.nan
    else:
        ielts = np.full(n, np.nan)

    # Strength: standardized within the school's pool, missing scores count 0.
    gpa_part = (gpa - gpa.mean()) / gpa.std()
    if has_sat_range:
        sat_part = np.where(np.isnan(sat), 0.0, (sat - np.nanmean(sat)) / np.nanstd(sat))
    else:
        sat_part = np.zeros(n)  # non-US school: SAT plays no part
    ielts_part = np.where(np.isnan(ielts), 0.0, ielts - (school.min_ielts if pd.notna(school.min_ielts) else 0))
    strength = (
        GPA_WEIGHT * gpa_part
        + SAT_WEIGHT * sat_part
        + IELTS_WEIGHT * ielts_part
        + rng.logistic(0, NOISE_SCALE, n)
    )

    # Admit the top `acceptance_rate`% of the pool.
    cutoff = np.quantile(strength, 1 - school.acceptance_rate / 100)
    admitted = strength > cutoff

    # Hard-ish English requirement.
    below_min = ~np.isnan(ielts) & (ielts < school.min_ielts)
    admitted &= ~(below_min & (rng.random(n) < BELOW_IELTS_MIN_REJECT_RATE))

    return pd.DataFrame(
        {
            "university": school["name"],
            "gpa": gpa,
            "sat": sat,
            "ielts": ielts,
            "avg_admitted_gpa": school.avg_admitted_gpa,
            "sat_25": school.sat_25,
            "sat_75": school.sat_75,
            "min_ielts": school.min_ielts,
            "acceptance_rate": school.acceptance_rate,
            "admitted": admitted.astype(int),
        }
    )


def main() -> None:
    if not UNIVERSITIES.exists():
        raise SystemExit(
            f"{UNIVERSITIES} not found. Run `npm run ml:export-universities` first."
        )

    schools = pd.read_csv(UNIVERSITIES)
    schools = schools[schools["avg_admitted_gpa"].notna()]
    rng = np.random.default_rng(SEED)

    data = pd.concat(
        [simulate_school(school, rng) for _, school in schools.iterrows()],
        ignore_index=True,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(OUT, index=False)

    # Sanity check: simulated admit rates should track listed acceptance rates
    # (a little lower, because of the English cutoff).
    by_school = data.groupby("university").agg(
        listed=("acceptance_rate", "first"), simulated=("admitted", "mean")
    )
    gap = (by_school["simulated"] * 100 - by_school["listed"]).abs()
    print(f"Wrote {len(data)} synthetic applicants for {len(schools)} schools to {OUT.name}")
    print(f"Overall admit rate: {data['admitted'].mean():.1%}")
    print(f"Simulated vs listed acceptance rate: mean gap {gap.mean():.1f} pts, max {gap.max():.1f} pts")


if __name__ == "__main__":
    main()
