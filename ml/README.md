# StudyCompass ML pipeline

Offline model training in Python. The app never runs Python: the trained
logistic regression is exported to `lib/model/admission-model.json` and
evaluated in TypeScript (`lib/admission-model.ts`).

## Be clear about the data

| Data | Real? | Used for |
| --- | --- | --- |
| `../data/scorecard/universities.json` | **Yes — official** US Department of Education College Scorecard figures (see the main README for how it's fetched) | The school-level regressions, and the school figures the synthetic applicants are built around |
| `data/synthetic_applicants.csv` | **No — simulated** by `generate_synthetic.py` | Training/evaluating the admission-probability model the app uses |

There's no public per-student undergraduate admissions data, so the app's
model is trained on synthetic applicants. The *schools* they apply to are
real (official admission rates and SAT ranges), but every applicant, their
GPA and the admission rule are invented. The model's metrics show that the
pipeline works on data with a known structure; **they are not evidence
that it predicts real admissions.** The app labels the estimate as a demo
wherever it appears.

The school-level regressions use real data, but one row per *school*, so
they describe how schools differ, not what will happen to a student.

## Setup (once)

From the project root, on Windows:

```bash
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt
```

(On macOS/Linux use `ml/.venv/bin/python` instead.)

## Run

`data/scorecard/universities.json` is committed, so you don't need an API
key to run any of this.

```bash
ml/.venv/Scripts/python ml/generate_synthetic.py         # → data/synthetic_applicants.csv
ml/.venv/Scripts/python ml/train_admission.py            # → reports/admission_*, lib/model/*.json
ml/.venv/Scripts/python ml/train_school_regression.py    # → reports/school_regression*
npm test                                                 # includes the TS-vs-Python parity test
```

Everything is seeded, so re-running gives identical data and results.

## What each script does

- **`features.py`** turns raw scores into the model's four features: GPA,
  SAT z-score within the school's 25th–75th range, an "SAT known" flag (so
  a missing score is information rather than a dropped row), and the
  school's acceptance rate as log-odds. It also holds a Python copy of the
  app's old rule-based Reach/Match/Safety label, the baseline the model has
  to beat. `lib/admission-model.ts` mirrors `build_features()` exactly.
- **`generate_synthetic.py`** simulates 50 applicants for each of the
  1,577 Scorecard schools. GPAs are drawn around a made-up mean that rises
  with selectivity; 20% don't submit an SAT. Each school admits roughly
  the top `acceptance_rate` share of its pool by a noisy mix of GPA and
  SAT. There's no English test: Scorecard doesn't publish minimums.
- **`train_admission.py`** splits 60/20/20 (train/validation/test,
  stratified) and compares three models on the test set:
  - the **baseline rule**, each label mapped to its training-set admit rate;
  - **logistic regression**, L2 strength chosen by 5-fold CV on log-loss;
  - **gradient boosting**.

  Thresholds are picked for best F1 on the validation set, never the test
  set. It reports ROC-AUC, log-loss, Brier score, calibration and ROC
  plots, and confusion matrices, then exports the logistic regression plus
  20 parity fixtures.
- **`train_school_regression.py`** fits two linear regressions on the
  official data: admission rate, and median earnings 10 years after entry,
  each from SAT midpoint, size (log10), tuition, ownership and region.
  Categories are one-hot encoded against the most common group, and groups
  with fewer than 20 schools are left out and listed in the report. It
  reports test R², RMSE vs. always predicting the mean, 5-fold CV R², the
  coefficients and an actual-vs-predicted plot per target. The sentences
  in the report are generated from the fitted numbers.

## Why logistic regression in the app

Gradient boosting scores about the same here, and logistic regression:
- has coefficients you can read (odds ratios per standard deviation, in
  the report);
- lets the app show per-feature contributions;
- runs as a dot product plus a sigmoid in TypeScript with no server;
- is easy to verify against Python, which the parity test does.

The app only uses it in place of the old rule because training recorded
that it beats the rule on all three test metrics (`beats_baseline` in the
exported JSON), and only for undergraduate profiles at schools with
official Scorecard data.

## Results

See `reports/admission_report.md` and `reports/school_regression.md`
(written by the scripts; numbers are never typed in by hand).
