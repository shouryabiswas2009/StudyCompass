"""Linear regression on the Kaggle "Graduate Admissions" dataset.

Predicts "Chance of Admit" (0-1) from GRE, TOEFL, university rating, SOP,
LOR, CGPA and research experience. This is REAL data (self-reported by 500
applicants), but it's about Masters-level admissions and uses features the
app's profiles don't have (GRE, TOEFL, SOP...), so it's analyzed here
rather than used in the app.

Get the data first (see ml/README.md):
    ml/data/raw/Admission_Predict_Ver1.1.csv

Run from the project root:
    ml/.venv/Scripts/python ml/train_kaggle_regression.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "raw" / "Admission_Predict_Ver1.1.csv"
REPORTS = ROOT / "reports"
SEED = 42

FEATURES = ["GRE Score", "TOEFL Score", "University Rating", "SOP", "LOR", "CGPA", "Research"]
TARGET = "Chance of Admit"


def main() -> None:
    if not DATA.exists():
        raise SystemExit(
            f"{DATA} not found.\nDownload it from "
            "https://www.kaggle.com/datasets/mohansacharya/graduate-admissions "
            "(free account needed) and copy Admission_Predict_Ver1.1.csv into ml/data/raw/."
        )
    REPORTS.mkdir(exist_ok=True)

    df = pd.read_csv(DATA)
    df.columns = df.columns.str.strip()  # the original file has "LOR " and "Chance of Admit "
    X, y = df[FEATURES], df[TARGET]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

    # Standardizing first makes the coefficients comparable: each one is the
    # change in chance of admit for a one-standard-deviation change.
    model = Pipeline([("scale", StandardScaler()), ("linreg", LinearRegression())])
    cv_r2 = cross_val_score(model, X_train, y_train, cv=KFold(5, shuffle=True, random_state=SEED), scoring="r2")
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    residuals = y_test - pred
    r2 = r2_score(y_test, pred)
    rmse = float(np.sqrt(mean_squared_error(y_test, pred)))

    coef = pd.DataFrame({"feature": FEATURES, "coefficient_per_sd": model.named_steps["linreg"].coef_})
    coef = coef.reindex(coef["coefficient_per_sd"].abs().sort_values(ascending=False).index)
    coef.round(4).to_csv(REPORTS / "kaggle_linreg_coefficients.csv", index=False)

    # How tangled the features are, which limits how far single coefficients
    # can be trusted.
    corr = X.corr().abs().where(~np.eye(len(FEATURES), dtype=bool))
    pair = corr.stack().idxmax()
    max_corr = float(corr.stack().max())

    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].scatter(pred, residuals, s=12, alpha=0.6)
    axes[0].axhline(0, color="k", lw=1)
    axes[0].set(xlabel="Predicted chance of admit", ylabel="Residual (actual - predicted)",
                title="Residuals vs predicted (test set)")
    axes[1].hist(residuals, bins=20)
    axes[1].set(xlabel="Residual", ylabel="Count", title="Residual distribution (test set)")
    fig.tight_layout()
    fig.savefig(REPORTS / "kaggle_residuals.png", dpi=120)
    plt.close(fig)

    # The two sentences are written from the fitted numbers, not by hand.
    top, second = coef.iloc[0], coef.iloc[1]
    sentence_1 = (
        f"{top.feature} has the largest standardized coefficient ({top.coefficient_per_sd:+.3f}): holding the "
        f"other features fixed, an applicant one standard deviation higher on {top.feature} has a predicted "
        f"chance of admit about {top.coefficient_per_sd * 100:.1f} percentage points higher, followed by "
        f"{second.feature} ({second.coefficient_per_sd * 100:+.1f} points per standard deviation)."
    )
    # The wording follows the measured correlation instead of assuming it.
    if max_corr >= 0.7:
        overlap = (f"the features overlap heavily (the strongest pair, {pair[0]} and {pair[1]}, has a "
                   f"correlation of {max_corr:.2f}), so the individual coefficients are less reliable "
                   f"than the model's overall fit")
    elif max_corr >= 0.4:
        overlap = (f"some features overlap (the strongest pair, {pair[0]} and {pair[1]}, has a "
                   f"correlation of {max_corr:.2f}), so individual coefficients should be read with care")
    else:
        overlap = (f"the features are only weakly correlated (strongest pair: {pair[0]} and {pair[1]}, "
                   f"r = {max_corr:.2f}), so the coefficients can be read fairly independently")
    sentence_2 = f"These are associations in self-reported data, not causes, and {overlap}."

    results = {
        "data": f"Kaggle Graduate Admissions ({len(df)} rows), {DATA.name}",
        "split": {"train": len(X_train), "test": len(X_test)},
        "test_r2": round(r2, 4),
        "test_rmse": round(rmse, 4),
        "cv_r2_mean": round(float(cv_r2.mean()), 4),
        "cv_r2_std": round(float(cv_r2.std()), 4),
        "coefficients_per_sd": {r.feature: round(r.coefficient_per_sd, 4) for r in coef.itertuples()},
        "max_feature_correlation": {"pair": list(pair), "r": round(max_corr, 4)},
        "interpretation": [sentence_1, sentence_2],
    }
    (REPORTS / "kaggle_regression.json").write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")

    coef_rows = "\n".join(f"| {r.feature} | {r.coefficient_per_sd:+.4f} |" for r in coef.itertuples())
    (REPORTS / "kaggle_regression.md").write_text(f"""# Linear regression: Kaggle Graduate Admissions

> Generated by `ml/train_kaggle_regression.py`. Real but self-reported data
> from {len(df)} Masters applicants; target is their self-estimated
> "Chance of Admit" (0-1).

Split: {len(X_train)} train / {len(X_test)} test (random, seed {SEED}).

| Metric | Value |
| --- | --- |
| Test R² | {r2:.4f} |
| Test RMSE | {rmse:.4f} |
| 5-fold CV R² on train | {cv_r2.mean():.4f} ± {cv_r2.std():.4f} |

## Standardized coefficients

| Feature | Change in chance of admit per 1 SD |
| --- | --- |
{coef_rows}

## What the coefficients say

{sentence_1}

{sentence_2}

Plot: `kaggle_residuals.png`.
""", encoding="utf-8")

    print(f"Test R2 {r2:.4f}  RMSE {rmse:.4f}  CV R2 {cv_r2.mean():.4f} +/- {cv_r2.std():.4f}")
    print(sentence_1)
    print(sentence_2)


if __name__ == "__main__":
    main()
