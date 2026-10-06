"""School-level linear regressions on official College Scorecard data.

Two models, same features:
  1. admission rate (%)              ~ SAT midpoint + size + tuition + control + region
  2. median earnings 10 yrs after entry ($) ~ the same features

This is ECOLOGICAL data: one row per school, not per student. It describes
how schools differ from each other; it says nothing about what would happen
to an individual student, and the coefficients are associations, not causes.

Needs data/scorecard/universities.json (npm run data:refresh-scorecard).
Run from the project root:
    ml/.venv/Scripts/python ml/train_school_regression.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "data" / "scorecard" / "universities.json"
REPORTS = ROOT / "reports"
SEED = 42
# A category with fewer schools than this can't be estimated reliably (the
# data has only 2 for-profit schools with SAT data), so its rows are left
# out and the report says so.
MIN_GROUP = 20

NUMERIC = ["sat_midpoint", "log10_size", "tuition_k"]
CATEGORICAL = ["ownership", "us_region"]
NICE = {
    "sat_midpoint": "SAT midpoint",
    "log10_size": "school size (log scale)",
    "tuition_k": "tuition",
}
TARGETS = {
    "acceptance_rate": {"label": "admission rate", "phrase": "an admission rate",
                        "unit": "percentage points", "fmt": "{:.1f}"},
    "median_earnings_10yr": {"label": "median earnings 10 years after entry",
                             "phrase": "median earnings (10 years after entry)",
                             "unit": "dollars", "fmt": "${:,.0f}"},
}


def load() -> tuple[pd.DataFrame, dict]:
    if not DATA.exists():
        raise SystemExit(f"{DATA} not found. Run `npm run data:refresh-scorecard` first.")
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    df = pd.DataFrame(payload["universities"])
    df["log10_size"] = np.log10(df["student_size"].where(df["student_size"] > 0))
    df["tuition_k"] = df["tuition"] / 1000
    return df, payload


def fit_one(df: pd.DataFrame, target: str) -> dict:
    data = df.dropna(subset=NUMERIC + CATEGORICAL + [target])

    # Leave out categories too small to estimate, and record what was dropped.
    dropped_groups = {}
    for col in CATEGORICAL:
        counts = data[col].value_counts()
        small = counts[counts < MIN_GROUP]
        if len(small):
            dropped_groups[col] = {str(k): int(v) for k, v in small.items()}
            data = data[~data[col].isin(small.index)]

    # Compare each category with the most common one (not whichever comes
    # first alphabetically), so the reference group is a large, stable one.
    reference = {col: str(data[col].value_counts().idxmax()) for col in CATEGORICAL}

    X, y = data[NUMERIC + CATEGORICAL], data[target]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)

    # Numbers are standardized so each coefficient means "per standard
    # deviation"; categories are compared with the reference category.
    model = Pipeline([
        ("prep", ColumnTransformer([
            ("num", StandardScaler(), NUMERIC),
            ("cat", OneHotEncoder(drop=[reference[c] for c in CATEGORICAL]), CATEGORICAL),
        ])),
        ("linreg", LinearRegression()),
    ])
    cv_r2 = cross_val_score(model, X_train, y_train, cv=KFold(5, shuffle=True, random_state=SEED), scoring="r2")
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    # Honest context: how good is "always predict the training average"?
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, np.full(len(y_test), y_train.mean()))))

    prep = model.named_steps["prep"]
    names = [n.split("__", 1)[1] for n in prep.get_feature_names_out()]
    coefs = pd.DataFrame({"feature": names, "coefficient": model.named_steps["linreg"].coef_})

    return {
        "data": data, "y_test": y_test, "pred": pred, "coefs": coefs, "reference": reference,
        "dropped_groups": dropped_groups,
        "n_rows": len(data), "n_train": len(X_train), "n_test": len(X_test),
        "r2": float(r2_score(y_test, pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, pred))),
        "baseline_rmse": baseline_rmse,
        "cv_r2_mean": float(cv_r2.mean()), "cv_r2_std": float(cv_r2.std()),
        "sd": {f: float(data[f].std()) for f in NUMERIC},
    }


def sentences(target: str, r: dict) -> list[str]:
    """Two plain sentences generated from the fitted numbers."""
    info = TARGETS[target]
    fmt = info["fmt"]
    numeric = r["coefs"][r["coefs"]["feature"].isin(NUMERIC)].copy()
    numeric = numeric.reindex(numeric["coefficient"].abs().sort_values(ascending=False).index)
    top, second = numeric.iloc[0], numeric.iloc[1]

    def effect(row):
        direction = "higher" if row.coefficient > 0 else "lower"
        return f"{fmt.format(abs(row.coefficient))} {direction}" if info["unit"] == "dollars" \
            else f"{abs(row.coefficient):.1f} {info['unit']} {direction}"

    s1 = (f"Holding the other features fixed, schools one standard deviation higher in "
          f"{NICE[top.feature]} have {info['phrase']} about {effect(top)} on average, the "
          f"largest effect among the numeric features; for {NICE[second.feature]} it is about "
          f"{effect(second)}.")

    own = r["coefs"][r["coefs"]["feature"].str.startswith("ownership_")]
    if len(own):
        biggest = own.reindex(own["coefficient"].abs().sort_values(ascending=False).index).iloc[0]
        kind = biggest.feature.removeprefix("ownership_")
        s2 = (f"Compared with {r['reference']['ownership']} schools with the same SAT midpoint, size, "
              f"tuition and region, {kind} schools differ by about "
              f"{fmt.format(abs(biggest.coefficient)) if info['unit'] == 'dollars' else f'{abs(biggest.coefficient):.1f} ' + info['unit']} "
              f"({'higher' if biggest.coefficient > 0 else 'lower'}).")
    else:
        s2 = "Ownership type had too few schools in the data to estimate separately."
    return [s1, s2]


def residual_plot(target: str, r: dict) -> str:
    residuals = r["y_test"] - r["pred"]
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    axes[0].scatter(r["pred"], residuals, s=10, alpha=0.5)
    axes[0].axhline(0, color="k", lw=1)
    axes[0].set(xlabel=f"Predicted {TARGETS[target]['label']}", ylabel="Residual (actual - predicted)",
                title="Residuals vs predicted (test set)")
    axes[1].hist(residuals, bins=30)
    axes[1].set(xlabel="Residual", ylabel="Schools", title="Residual distribution (test set)")
    fig.suptitle(f"School-level regression: {TARGETS[target]['label']} (College Scorecard)")
    fig.tight_layout()
    name = f"school_regression_{target}.png"
    fig.savefig(REPORTS / name, dpi=120)
    plt.close(fig)
    return name


def main() -> None:
    REPORTS.mkdir(exist_ok=True)
    df, payload = load()
    results, md_sections = {}, []

    for target, info in TARGETS.items():
        r = fit_one(df, target)
        plot = residual_plot(target, r)
        text = sentences(target, r)
        coefs = r["coefs"].round(4)
        coefs.to_csv(REPORTS / f"school_regression_{target}_coefficients.csv", index=False)

        results[target] = {
            "rows_used": r["n_rows"], "train": r["n_train"], "test": r["n_test"],
            "test_r2": round(r["r2"], 4), "test_rmse": round(r["rmse"], 4),
            "baseline_rmse_predict_mean": round(r["baseline_rmse"], 4),
            "cv_r2_mean": round(r["cv_r2_mean"], 4), "cv_r2_std": round(r["cv_r2_std"], 4),
            "reference_categories": r["reference"],
            "left_out_small_groups": r["dropped_groups"],
            "feature_sd": {k: round(v, 4) for k, v in r["sd"].items()},
            "coefficients": dict(zip(coefs["feature"], coefs["coefficient"])),
            "interpretation": text,
        }
        coef_rows = "\n".join(f"| {row.feature} | {row.coefficient:+,.4f} |" for row in coefs.itertuples())
        left_out = "; ".join(
            f"{col}: " + ", ".join(f"{k} ({v})" for k, v in groups.items())
            for col, groups in r["dropped_groups"].items()
        ) or "none"
        md_sections.append(f"""## {info['label'].capitalize()}

Schools used: {r['n_rows']} (rows missing any feature or the target are
dropped — many schools are test-optional and report no SAT). Groups with
fewer than {MIN_GROUP} schools were left out because they can't be
estimated reliably: {left_out}. Split {r['n_train']} train / {r['n_test']} test.

| Metric | Value |
| --- | --- |
| Test R² | {r['r2']:.3f} |
| Test RMSE | {r['rmse']:,.2f} ({info['unit']}) |
| RMSE of always predicting the mean | {r['baseline_rmse']:,.2f} |
| 5-fold CV R² on train | {r['cv_r2_mean']:.3f} ± {r['cv_r2_std']:.3f} |

Coefficients (numeric features per 1 standard deviation; categories vs.
{r['reference']['ownership']} / {r['reference']['us_region']}):

| Feature | Coefficient ({info['unit']}) |
| --- | --- |
{coef_rows}

**What the coefficients say.** {text[0]} {text[1]}

Plot: `{plot}`.
""")

    (REPORTS / "school_regression.json").write_text(json.dumps({
        "data": "US Department of Education College Scorecard",
        "data_year": payload["data_year"], "fetched_at": payload["fetched_at"],
        "level": "school (ecological) — not individual students",
        "results": results,
    }, indent=2) + "\n", encoding="utf-8")

    (REPORTS / "school_regression.md").write_text(f"""# School-level regressions (College Scorecard)

> Generated by `ml/train_school_regression.py` from official US Department
> of Education College Scorecard data (data year {payload['data_year']},
> fetched {payload['fetched_at'][:10]}).
>
> **Ecological data:** each row is a school, not a student. These models
> describe how schools differ from each other. They don't predict any
> individual's admission or earnings, and the coefficients are
> associations, not causes. Earnings describe students who started several
> years before the other figures were collected.

Features: SAT midpoint (Reading + Math section midpoints), school size
(log10 of undergraduates), tuition (out-of-state, $1,000s), ownership and
Scorecard region.

{chr(10).join(md_sections)}""", encoding="utf-8")

    for target, res in results.items():
        print(f"{target}: n={res['rows_used']}  R2={res['test_r2']:.3f}  RMSE={res['test_rmse']:,.2f}  "
              f"(mean-only RMSE {res['baseline_rmse_predict_mean']:,.2f})  CV R2={res['cv_r2_mean']:.3f}")
        for s in res["interpretation"]:
            print("  -", s)


if __name__ == "__main__":
    main()
