"""Feature engineering and the old rule-based baseline.

IMPORTANT: build_features() is mirrored line-for-line in
lib/admission-model.ts so the app can run the model without Python. If you
change one, change the other — lib/admission-model.test.ts compares the two
on fixture rows and fails if they drift apart.
"""

import numpy as np
import pandas as pd

# Order matters: the exported coefficients follow this order.
FEATURES = [
    "gpa_gap",  # (your GPA - typical admitted GPA) / 10
    "sat_z",  # how many standard deviations your SAT is from the school's middle
    "sat_known",  # 1 if both you and the school have SAT data, else 0
    "ielts_margin",  # your IELTS - the school's minimum (0 if unknown)
    "ielts_known",  # 1 if both you and the school have IELTS data, else 0
    "acceptance_logit",  # the school's acceptance rate on the log-odds scale
]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw applicant + school columns into model features.

    Expects columns: gpa, sat, ielts (applicant; sat/ielts may be missing) and
    avg_admitted_gpa, sat_25, sat_75, min_ielts, acceptance_rate (school).
    Missing scores become 0 plus a "known" flag, so the model can learn what
    a missing score means instead of the row being dropped.
    """
    gpa_gap = (df["gpa"] - df["avg_admitted_gpa"]) / 10

    sat_known = df["sat"].notna() & df["sat_25"].notna() & df["sat_75"].notna()
    # For a normal distribution the middle 50% spans 1.349 standard deviations.
    sat_sd = (df["sat_75"] - df["sat_25"]).clip(lower=10) / 1.349
    sat_mid = (df["sat_25"] + df["sat_75"]) / 2
    sat_z = np.where(sat_known, (df["sat"] - sat_mid) / sat_sd, 0.0)

    ielts_known = df["ielts"].notna() & df["min_ielts"].notna()
    ielts_margin = np.where(ielts_known, df["ielts"] - df["min_ielts"], 0.0)

    # Log-odds turns 4% vs 8% into a meaningful gap, unlike raw percentages.
    p = (df["acceptance_rate"] / 100).clip(0.01, 0.99)
    acceptance_logit = np.log(p / (1 - p))

    return pd.DataFrame(
        {
            "gpa_gap": gpa_gap,
            "sat_z": sat_z,
            "sat_known": sat_known.astype(float),
            "ielts_margin": ielts_margin,
            "ielts_known": ielts_known.astype(float),
            "acceptance_logit": acceptance_logit,
        },
        index=df.index,
    ).astype(float)


# ─── The old rule (baseline) ─────────────────────────────────────────────
# A Python copy of admissionChance() + academicFit() in lib/matching.ts, so
# the trained model is compared against exactly what the app used before.


def _clamp01(x: float) -> float:
    return min(1.0, max(0.0, x))


def rule_based_chance(row: pd.Series) -> str:
    """Reach / Match / Safety, exactly as lib/matching.ts computes it."""
    parts = []
    if pd.notna(row["avg_admitted_gpa"]):
        parts.append(_clamp01(0.75 + (row["gpa"] - row["avg_admitted_gpa"]) / 20))
    if pd.notna(row["sat"]) and pd.notna(row["sat_25"]) and pd.notna(row["sat_75"]):
        width = max(row["sat_75"] - row["sat_25"], 10)
        parts.append(_clamp01(0.5 + 0.5 * (row["sat"] - row["sat_25"]) / width))
    academic = sum(parts) / len(parts) if parts else None

    if row["acceptance_rate"] < 15:
        return "Reach"
    if academic is None:
        return "Match"
    if academic < 0.5:
        return "Reach"
    if academic >= 0.85 and row["acceptance_rate"] >= 50:
        return "Safety"
    return "Match"
