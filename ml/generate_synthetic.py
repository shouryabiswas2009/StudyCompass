"""Generate SYNTHETIC undergraduate applicants around real school figures.

There's no public per-student admissions data, so this simulates applicants
for every US school in the official College Scorecard import, using each
school's REAL admission rate and SAT range. Everything about the individual
applicants (their GPAs, who submits an SAT, how admissions decide) is
invented here and labeled as such. A model trained on it demonstrates the
pipeline; it is NOT evidence of predicting real admissions.

Run from the project root (after `npm run data:refresh-scorecard`):
    ml/.venv/Scripts/python ml/generate_synthetic.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
SCHOOLS = ROOT.parent / "data" / "scorecard" / "universities.json"
OUT = ROOT / "data" / "synthetic_applicants.csv"

SEED = 42  # fixed so every run produces the same data
APPLICANTS_PER_SCHOOL = 50
SAT_NOT_SUBMITTED = 0.20  # assumption: share who apply test-optional

# ── Invented assumptions (there's no real per-student data to base them on) ──
# Applicant GPAs: pools at more selective schools are assumed to be stronger.
GPA_BASE = 78
GPA_SELECTIVITY_BONUS = 14  # added for a school admitting ~0%
GPA_SD = 7
# The hidden "true" rule: each school admits the strongest share of its pool
# equal to its REAL admission rate, where strength mixes GPA, SAT and noise
# for everything unobserved (essays, interviews, ...).
GPA_WEIGHT = 1.5
SAT_WEIGHT = 0.9
NOISE_SCALE = 1.0


def simulate_school(school: pd.Series, rng: np.random.Generator) -> pd.DataFrame:
    n = APPLICANTS_PER_SCHOOL
    rate = school.acceptance_rate / 100

    gpa_mean = GPA_BASE + GPA_SELECTIVITY_BONUS * (1 - rate)
    gpa = np.clip(rng.normal(gpa_mean, GPA_SD, n), 50, 100).round(1)

    has_sat_range = pd.notna(school.sat_25) and pd.notna(school.sat_75)
    if has_sat_range:
        # Applicants are spread a bit wider and lower than the enrolled
        # middle 50% that Scorecard reports.
        mid = (school.sat_25 + school.sat_75) / 2
        sd = max(school.sat_75 - school.sat_25, 10) / 1.349
        sat = np.clip(np.round(rng.normal(mid - 0.3 * sd, 1.1 * sd, n) / 10) * 10, 400, 1600)
        sat[rng.random(n) < SAT_NOT_SUBMITTED] = np.nan
        sat_part = np.where(np.isnan(sat), 0.0, (sat - np.nanmean(sat)) / (np.nanstd(sat) or 1))
    else:
        sat = np.full(n, np.nan)  # test-optional/test-blind school: no range published
        sat_part = np.zeros(n)

    strength = GPA_WEIGHT * (gpa - gpa.mean()) / (gpa.std() or 1) + SAT_WEIGHT * sat_part \
        + rng.logistic(0, NOISE_SCALE, n)

    # Admit the top `rate` share of the pool (the school's real admit rate).
    admitted = strength > np.quantile(strength, 1 - rate)

    return pd.DataFrame(
        {
            "scorecard_id": school.scorecard_id,
            "university": school["name"],
            "gpa": gpa,
            "sat": sat,
            "sat_25": school.sat_25,
            "sat_75": school.sat_75,
            "acceptance_rate": school.acceptance_rate,
            # Not published by Scorecard; kept (as empty) so the old rule
            # can be evaluated exactly as the app would run it.
            "avg_admitted_gpa": np.nan,
            "admitted": admitted.astype(int),
        }
    )


def main() -> None:
    if not SCHOOLS.exists():
        raise SystemExit(f"{SCHOOLS} not found. Run `npm run data:refresh-scorecard` first.")

    payload = json.loads(SCHOOLS.read_text(encoding="utf-8"))
    schools = pd.DataFrame(payload["universities"])
    schools = schools[schools["acceptance_rate"].notna()]
    rng = np.random.default_rng(SEED)

    data = pd.concat(
        [simulate_school(school, rng) for _, school in schools.iterrows()],
        ignore_index=True,
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(OUT, index=False)

    # Grouped by id, not name: several different US colleges share a name
    # (e.g. "Bethel University").
    by_school = data.groupby("scorecard_id").agg(
        listed=("acceptance_rate", "first"), simulated=("admitted", "mean")
    )
    gap = (by_school["simulated"] * 100 - by_school["listed"]).abs()
    print(f"Wrote {len(data)} synthetic applicants for {len(schools)} real schools "
          f"(Scorecard data year {payload['data_year']}) to {OUT.name}")
    print(f"Overall admit rate: {data['admitted'].mean():.1%}; "
          f"schools with an SAT range: {schools['sat_25'].notna().sum()}")
    print(f"Simulated vs real admission rate: mean gap {gap.mean():.1f} pts, max {gap.max():.1f} pts "
          f"(with only {APPLICANTS_PER_SCHOOL} applicants per school, rates are rounded to 2-pt steps)")


if __name__ == "__main__":
    main()
