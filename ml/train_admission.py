"""Train and evaluate admission-probability models on the SYNTHETIC data.

Compares three models on the same held-out test set:
  1. Baseline: the app's old hand-tuned Reach/Match/Safety rule (each label
     mapped to its admit rate on the training set, so it has probabilities)
  2. Logistic regression, with regularization strength chosen by 5-fold CV
  3. Gradient boosting (a tree model), as a more flexible comparison

The logistic regression is exported for the app because its coefficients
can be read and explained, and inference is just a dot product plus a
sigmoid that runs in TypeScript.

Reminder: the data is synthetic (see generate_synthetic.py). These metrics
show the pipeline works; they say nothing about real admissions.

Run from the project root:
    ml/.venv/Scripts/python ml/train_admission.py
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # write image files; no window needed
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import calibration_curve
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features import FEATURES, build_features, rule_based_chance

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parent
DATA = ROOT / "data" / "synthetic_applicants.csv"
REPORTS = ROOT / "reports"
MODEL_OUT = PROJECT / "lib" / "model" / "admission-model.json"
FIXTURES_OUT = PROJECT / "lib" / "model" / "parity-fixtures.json"

SEED = 42
THRESHOLDS = np.round(np.linspace(0.05, 0.95, 91), 2)


def split(df: pd.DataFrame):
    """60% train / 20% validation / 20% test, keeping the admit rate equal."""
    train, rest = train_test_split(df, test_size=0.4, stratify=df["admitted"], random_state=SEED)
    val, test = train_test_split(rest, test_size=0.5, stratify=rest["admitted"], random_state=SEED)
    return train, val, test


def best_threshold(y_true, probs) -> float:
    """Threshold with the best F1 on the validation set (never the test set)."""
    scores = [f1_score(y_true, probs >= t, zero_division=0) for t in THRESHOLDS]
    return float(THRESHOLDS[int(np.argmax(scores))])


def evaluate(name, y_true, probs, threshold) -> dict:
    tn, fp, fn, tp = confusion_matrix(y_true, probs >= threshold).ravel()
    return {
        "model": name,
        "roc_auc": round(roc_auc_score(y_true, probs), 4),
        "log_loss": round(log_loss(y_true, np.clip(probs, 1e-6, 1 - 1e-6)), 4),
        "brier": round(brier_score_loss(y_true, probs), 4),
        "threshold": threshold,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "precision": round(tp / (tp + fp), 4) if tp + fp else 0.0,
        "recall": round(tp / (tp + fn), 4) if tp + fn else 0.0,
        "accuracy": round((tp + tn) / len(y_true), 4),
    }


def main() -> None:
    if not DATA.exists():
        raise SystemExit(f"{DATA} not found. Run ml/generate_synthetic.py first.")
    REPORTS.mkdir(exist_ok=True)

    df = pd.read_csv(DATA)
    train, val, test = split(df)
    X_train, X_val, X_test = (build_features(d) for d in (train, val, test))
    y_train, y_val, y_test = (d["admitted"].to_numpy() for d in (train, val, test))

    # ── 1. Baseline: the old rule ────────────────────────────────────────
    labels = {name: d.apply(rule_based_chance, axis=1) for name, d in
              [("train", train), ("val", val), ("test", test)]}
    # Give each label a probability = its admit rate on the training set.
    label_rate = pd.Series(y_train).groupby(labels["train"].to_numpy()).mean().to_dict()
    p_base = {k: v.map(label_rate).to_numpy() for k, v in labels.items()}

    # ── 2. Logistic regression, C chosen by cross-validation ────────────
    logreg = GridSearchCV(
        Pipeline([("scale", StandardScaler()), ("logreg", LogisticRegression(max_iter=1000))]),
        param_grid={"logreg__C": np.logspace(-3, 2, 11)},
        scoring="neg_log_loss",
        cv=StratifiedKFold(5, shuffle=True, random_state=SEED),
    )
    logreg.fit(X_train, y_train)
    best_lr = logreg.best_estimator_

    # ── 3. Gradient boosting ────────────────────────────────────────────
    gbm = HistGradientBoostingClassifier(
        learning_rate=0.05, max_iter=400, max_leaf_nodes=15,
        early_stopping=True, random_state=SEED,
    )
    gbm.fit(X_train, y_train)

    probs = {
        "Baseline rule": (p_base["val"], p_base["test"]),
        "Logistic regression": (best_lr.predict_proba(X_val)[:, 1], best_lr.predict_proba(X_test)[:, 1]),
        "Gradient boosting": (gbm.predict_proba(X_val)[:, 1], gbm.predict_proba(X_test)[:, 1]),
    }
    results = [
        evaluate(name, y_test, p_test, best_threshold(y_val, p_val))
        for name, (p_val, p_test) in probs.items()
    ]
    by_name = {r["model"]: r for r in results}

    lr, base = by_name["Logistic regression"], by_name["Baseline rule"]
    beats_baseline = (
        lr["roc_auc"] > base["roc_auc"] and lr["log_loss"] < base["log_loss"] and lr["brier"] < base["brier"]
    )

    # ── Plots ───────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(6, 5))
    ax.plot([0, 1], [0, 1], "k--", lw=1, label="Perfectly calibrated")
    for name, (_, p_test) in probs.items():
        frac, mean_pred = calibration_curve(y_test, p_test, n_bins=10, strategy="quantile")
        ax.plot(mean_pred, frac, marker="o", label=name)
    ax.set(xlabel="Predicted probability", ylabel="Observed admit rate",
           title="Calibration on the test set (synthetic data)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(REPORTS / "admission_calibration.png", dpi=120)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 5))
    for name, (_, p_test) in probs.items():
        fpr, tpr, _ = roc_curve(y_test, p_test)
        ax.plot(fpr, tpr, label=f"{name} (AUC {by_name[name]['roc_auc']:.3f})")
    ax.plot([0, 1], [0, 1], "k--", lw=1)
    ax.set(xlabel="False positive rate", ylabel="True positive rate",
           title="ROC curves on the test set (synthetic data)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(REPORTS / "admission_roc.png", dpi=120)
    plt.close(fig)

    fig, axes = plt.subplots(1, 3, figsize=(12, 4))
    for ax, r in zip(axes, results):
        cm = r["confusion_matrix"]
        grid = np.array([[cm["tn"], cm["fp"]], [cm["fn"], cm["tp"]]])
        ax.imshow(grid, cmap="Blues")
        for (i, j), v in np.ndenumerate(grid):
            ax.text(j, i, str(v), ha="center", va="center")
        ax.set(xticks=[0, 1], yticks=[0, 1], xticklabels=["Rejected", "Admitted"],
               yticklabels=["Rejected", "Admitted"], xlabel="Predicted", ylabel="Actual",
               title=f"{r['model']}\n(threshold {r['threshold']})")
    fig.tight_layout()
    fig.savefig(REPORTS / "admission_confusion_matrices.png", dpi=120)
    plt.close(fig)

    # ── Coefficients ────────────────────────────────────────────────────
    scaler = best_lr.named_steps["scale"]
    model = best_lr.named_steps["logreg"]
    coef = pd.DataFrame({"feature": FEATURES, "coefficient_per_sd": model.coef_[0]})
    coef["odds_ratio_per_sd"] = np.exp(coef["coefficient_per_sd"])
    coef = coef.reindex(coef["coefficient_per_sd"].abs().sort_values(ascending=False).index)
    coef.round(4).to_csv(REPORTS / "admission_logreg_coefficients.csv", index=False)

    # ── Export the model for the app ────────────────────────────────────
    MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
    MODEL_OUT.write_text(json.dumps({
        "description": "Logistic regression trained on SYNTHETIC undergraduate applicants simulated around "
                       "real College Scorecard admission rates and SAT ranges (ml/generate_synthetic.py). "
                       "Demonstrates the pipeline; not a real admissions predictor.",
        "trained_on": "synthetic",
        "features": FEATURES,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "coefficients": model.coef_[0].tolist(),
        "intercept": float(model.intercept_[0]),
        "regularization_C": float(logreg.best_params_["logreg__C"]),
        "test_metrics": lr,
        "baseline_test_metrics": base,
        "beats_baseline": bool(beats_baseline),
        "data": {"rows": len(df), "train": len(train), "validation": len(val), "test": len(test),
                 "admit_rate": round(float(df["admitted"].mean()), 4), "seed": SEED},
        "sklearn_version": sklearn.__version__,
    }, indent=2) + "\n", encoding="utf-8")

    # ── Parity fixtures: same rows, Python's answer, for the Vitest check ──
    # Rows chosen to cover each way the features can come out: SAT known,
    # applicant didn't submit an SAT, and a school that publishes no range.
    sample = test.sample(frac=1, random_state=SEED)
    with_sat = sample[sample["sat"].notna()].head(7)
    sat_not_submitted = sample[sample["sat"].isna() & sample["sat_25"].notna()].head(7)
    school_without_range = sample[sample["sat_25"].isna()].head(6)
    fixtures_df = pd.concat([with_sat, sat_not_submitted, school_without_range])
    fixture_probs = best_lr.predict_proba(build_features(fixtures_df))[:, 1]

    def clean(v):
        return None if pd.isna(v) else float(v)

    fixtures = [
        {
            "profile": {"gpa_percentage": clean(r.gpa), "sat_score": clean(r.sat)},
            "university": {"sat_25": clean(r.sat_25), "sat_75": clean(r.sat_75),
                           "acceptance_rate": clean(r.acceptance_rate)},
            "expected_probability": float(p),
        }
        for r, p in zip(fixtures_df.itertuples(), fixture_probs)
    ]
    FIXTURES_OUT.write_text(json.dumps(fixtures, indent=2) + "\n", encoding="utf-8")

    # ── Reports ─────────────────────────────────────────────────────────
    (REPORTS / "admission_metrics.json").write_text(json.dumps({
        "data": "synthetic (ml/generate_synthetic.py)",
        "split": {"train": len(train), "validation": len(val), "test": len(test)},
        "chosen_C": float(logreg.best_params_["logreg__C"]),
        "results": results,
        "logistic_regression_beats_baseline": bool(beats_baseline),
    }, indent=2) + "\n", encoding="utf-8")

    rows = "\n".join(
        f"| {r['model']} | {r['roc_auc']:.3f} | {r['log_loss']:.3f} | {r['brier']:.3f} | "
        f"{r['threshold']} | {r['precision']:.3f} | {r['recall']:.3f} |"
        for r in results
    )
    coef_rows = "\n".join(
        f"| {c.feature} | {c.coefficient_per_sd:+.3f} | {c.odds_ratio_per_sd:.2f} |"
        for c in coef.itertuples()
    )
    (REPORTS / "admission_report.md").write_text(f"""# Admission model report (SYNTHETIC data)

> Generated by `ml/train_admission.py`. The applicants are simulated
> (`ml/generate_synthetic.py`) around each school's **real** College
> Scorecard admission rate and SAT range, but every individual applicant,
> their GPA and the admission rule are invented. These numbers show the
> pipeline works on data with a known structure. They are **not** evidence
> of predicting real admissions.

Data: {len(df)} synthetic applicants across {df['scorecard_id'].nunique()} US schools,
admit rate {df['admitted'].mean():.1%}. Split {len(train)} train / {len(val)} validation /
{len(test)} test (stratified). Logistic regression C = {logreg.best_params_['logreg__C']:.4g}
(5-fold CV on log-loss). Thresholds chosen for best F1 on the validation set.

## Test-set results

| Model | ROC-AUC ↑ | Log-loss ↓ | Brier ↓ | Threshold | Precision | Recall |
| --- | --- | --- | --- | --- | --- | --- |
{rows}

Logistic regression beats the baseline rule on all three of ROC-AUC,
log-loss and Brier: **{"yes" if beats_baseline else "no"}**.

## Logistic regression coefficients (per standard deviation)

| Feature | Coefficient | Odds ratio |
| --- | --- | --- |
{coef_rows}

Plots: `admission_calibration.png`, `admission_roc.png`,
`admission_confusion_matrices.png`.
""", encoding="utf-8")

    print(f"C chosen by CV: {logreg.best_params_['logreg__C']:.4g}")
    for r in results:
        print(f"{r['model']:<20} AUC {r['roc_auc']:.3f}  log-loss {r['log_loss']:.3f}  "
              f"Brier {r['brier']:.3f}  threshold {r['threshold']}")
    print(f"Logistic regression beats baseline: {beats_baseline}")
    print(f"Wrote {MODEL_OUT.relative_to(PROJECT)}, {FIXTURES_OUT.relative_to(PROJECT)} ({len(fixtures)} rows) and ml/reports/")


if __name__ == "__main__":
    main()
