# StudyCompass ML pipeline

Offline model training in Python. The app never runs Python: the trained
logistic regression is exported to `lib/model/admission-model.json` and
evaluated in TypeScript (`lib/admission-model.ts`).

## Be clear about the data

| Data | Real? | Used for |
| --- | --- | --- |
| `data/synthetic_applicants.csv` | **No — simulated** by `generate_synthetic.py` around the app's *illustrative* university figures | Training/evaluating the admission-probability model the app uses |
| `data/raw/Admission_Predict_Ver1.1.csv` (Kaggle) | Real, but self-reported, 500 Masters applicants | Linear regression analysis only (features like GRE/TOEFL aren't in the app) |

There's no public per-student undergraduate admissions data, so the app's
model is trained on synthetic applicants. Its metrics show that the
pipeline works on data with a known structure; **they are not evidence
that it predicts real admissions.** The app labels the estimate as a demo
wherever it appears.

## Setup (once)

From the project root, on Windows:

```bash
python -m venv ml/.venv
ml/.venv/Scripts/python -m pip install -r ml/requirements.txt
```

(On macOS/Linux use `ml/.venv/bin/python` instead.)

For the regression analysis, download the Kaggle data: sign in at
kaggle.com, open
<https://www.kaggle.com/datasets/mohansacharya/graduate-admissions>, click
Download, unzip, and copy `Admission_Predict_Ver1.1.csv` into
`ml/data/raw/`.

## Run

```bash
npm run ml:export-universities                      # SQL seed + migrations → data/universities.csv
ml/.venv/Scripts/python ml/generate_synthetic.py    # → data/synthetic_applicants.csv
ml/.venv/Scripts/python ml/train_admission.py       # → reports/, lib/model/*.json
ml/.venv/Scripts/python ml/train_kaggle_regression.py   # needs the Kaggle CSV
npm test                                            # includes the TS-vs-Python parity test
```

Everything is seeded, so re-running gives identical data and results.

## What each script does

- **`features.py`** turns raw scores into model features: GPA gap vs. the
  school's typical admit, SAT z-score within the school's middle-50%
  range, IELTS margin over the minimum, acceptance rate as log-odds, and
  "known" flags for SAT/IELTS so a missing score is information rather than
  a dropped row. It also holds a Python copy of the app's old rule-based
  Reach/Match/Safety label, the baseline the model has to beat.
  `lib/admission-model.ts` mirrors `build_features()` exactly.
- **`generate_synthetic.py`** simulates 300 applicants per school. Each
  school admits roughly the top `acceptance_rate`% of its pool by a noisy
  mix of GPA, SAT and IELTS, and English minimums act as near-hard cutoffs.
- **`train_admission.py`** splits 60/20/20 (train/validation/test,
  stratified) and compares three models on the test set:
  - the **baseline rule**, each label mapped to its training-set admit rate;
  - **logistic regression**, L2 strength chosen by 5-fold CV on log-loss;
  - **gradient boosting**.

  Thresholds are picked for best F1 on the validation set, never the test
  set. It reports ROC-AUC, log-loss, Brier score, calibration and ROC
  plots, and confusion matrices, then exports the logistic regression plus
  20 parity fixtures.
- **`train_kaggle_regression.py`** fits a standardized linear regression to
  predict "Chance of Admit" and reports R², RMSE, cross-validated R², a
  coefficient table and a residual plot. Its two-sentence interpretation is
  generated from the fitted numbers.

## Why logistic regression in the app

Gradient boosting can score slightly higher, but logistic regression:
- has coefficients you can read ("one SD higher GPA multiplies the odds by
  3.7");
- lets the app show per-feature contributions;
- runs as a dot product plus a sigmoid in TypeScript with no server;
- is easy to verify against Python, which the parity test does.

The app only uses it in place of the old rule because training recorded
that it beats the rule on all three test metrics (`beats_baseline` in the
exported JSON), and only for undergraduate profiles.

## Results

See `reports/admission_report.md` and `reports/kaggle_regression.md`
(written by the scripts; numbers are never typed in by hand).
