# StudyCompass

StudyCompass matches students to universities based on their budget, academic
profile, and preferences instead of showing generic rankings.

Built with Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui,
Supabase (Auth + Database), and Framer Motion.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up Supabase:

   - Create a project at [supabase.com](https://supabase.com) (or use an
     existing one).
   - Open the SQL Editor in your Supabase dashboard, paste in the contents of
     [`supabase/seed.sql`](supabase/seed.sql), and run it. This creates the
     `profiles`, `universities`, and `saved_universities` tables, sets up Row
     Level Security policies, and seeds ~27 sample universities.
   - Then run [`supabase/migration_002_richer_profiles.sql`](supabase/migration_002_richer_profiles.sql)
     the same way. It upgrades `profiles` to support multiple preferred
     countries/majors and a budget range, and adds a `program_rankings`
     column to `universities` with sample per-subject rankings (illustrative,
     like the rest of the seed data — not real QS subject rankings).
   - Then run [`supabase/migration_003_scores_and_degree_levels.sql`](supabase/migration_003_scores_and_degree_levels.sql).
     It adds an optional SAT score to profiles, database checks that match
     the profile form's validation, and a `degree_levels` column on
     `universities`.
   - Then run [`supabase/migration_004_admission_stats.sql`](supabase/migration_004_admission_stats.sql).
     It adds illustrative admission figures (typical admitted GPA, SAT
     middle-50% range for US schools, minimum IELTS, living cost) used by
     the academic and English fit scores.
   - Then run [`supabase/migration_005_browse_and_custom_universities.sql`](supabase/migration_005_browse_and_custom_universities.sql).
     It lets students add their own universities (with row-level security
     so only they can see and change them), makes the QS ranking optional,
     and adds 34 more illustrative universities (61 in total).
   - Then run [`supabase/migration_006_applications.sql`](supabase/migration_006_applications.sql).
     It adds the `applications` table (owner-only RLS) behind the
     application tracker and the offers page.
   - Then run [`supabase/migration_007_data_sources.sql`](supabase/migration_007_data_sources.sql).
     It labels every university with where its figures come from and adds
     the official College Scorecard columns.
   - Then run [`supabase/migration_008_primary_focus.sql`](supabase/migration_008_primary_focus.sql).
     It adds the student's "what matters most to me" focus and the
     research / retention / co-op columns it uses.
   - Then run every file in [`supabase/seed_scorecard/`](supabase/seed_scorecard/),
     in order (`00_…` first). They import ~1,600 US universities with
     official data and update the 14 sample US schools in place. They're
     safe to re-run. (`npm run db:check` runs all of the SQL above on a
     scratch database first, if you want to be sure.) Each file, what
     breaks until it's run and a one-line check are in
     [`docs/PENDING-DB-STEPS.md`](docs/PENDING-DB-STEPS.md).
   - Copy `.env.local.example` to `.env.local` and fill in your project's
     URL and anon/publishable key (Project Settings → API in the dashboard).

3. (Optional, for faster local testing) In your Supabase dashboard, go to
   Authentication → Providers → Email and turn off "Confirm email" so new
   accounts can log in immediately without clicking a confirmation link.
   To turn real confirmation emails on, see
   [Email confirmation](#email-confirmation) below.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. Run the unit tests (Vitest; covers matching, validation, filters,
   offers, the admission model's TypeScript-vs-Python parity and the
   Scorecard import):

   ```bash
   npm test
   ```

## Where the data comes from

Every university is labeled with its source, on cards, on the details page
and in the compare table:

| Label | What it means | Coverage |
| --- | --- | --- |
| **College Scorecard** | Official US Department of Education data, fetched from the [College Scorecard API](https://collegescorecard.ed.gov/data/api-documentation/) | 1,577 US schools (operating, mainly bachelor's-granting, with a published admission rate); data year 2024 in the current import |
| **Illustrative** | Hand-written sample figures for this demo, **not** official statistics | 47 schools in 25 countries outside the US |
| **Added by you** | Figures a student entered themselves, optionally with a source link | Only visible to that student |

**Only the US has official data here.** College Scorecard is the only free,
official source that publishes admission statistics for each school in a
structured form. For other countries I didn't scrape ranking sites (their
terms don't allow it) and didn't invent statistics, so non-US schools stay
labeled illustrative. To add verified figures for any school, use "Add a
university" and paste the link you got them from.

What Scorecard does and doesn't give the app:
- **Official:** admission rate, SAT percentiles, tuition (out-of-state,
  which international students pay at public universities), living costs,
  net price, completion and first-year retention rates, median earnings,
  Carnegie research classification, size, type and location.
- **SAT range:** Scorecard reports Reading and Math separately. The app adds
  the two 25th (and 75th) percentiles, which only approximates the
  total-score range, and labels it that way.
- **Programs:** the school's largest fields of study by share of degrees
  awarded.
- **Not available:** admitted GPA, English-test minimums and QS rankings,
  so those show as "not available". The QS and subject rankings that remain
  on the 14 original sample US schools are illustrative.
- **Data year:** Scorecard's own label (`2024`), worked out by the fetch
  script rather than assumed. Earnings describe students who started
  several years earlier.

### Refreshing the official data

1. Get a free key at <https://api.data.gov/signup/> and add
   `SCORECARD_API_KEY=...` to `.env.local`.
2. Run:

   ```bash
   npm run data:refresh-scorecard
   ```

   This re-downloads the data politely (100 schools per request, waits
   between requests, retries on rate limits), caches the raw responses in
   `ml/data/raw/scorecard/` (not committed), and rewrites
   `data/scorecard/universities.json` and `supabase/seed_scorecard/`.
3. Run `npm run db:check`, review the diff, then run the new
   `supabase/seed_scorecard/*.sql` files in the SQL Editor.

[`.github/workflows/refresh-scorecard.yml`](.github/workflows/refresh-scorecard.yml)
does steps 2–3 for you once a year, or whenever you run it from the Actions
tab, and opens a pull request instead of pushing to `main`. It needs a
`SCORECARD_API_KEY` repository secret and "Allow GitHub Actions to create
and approve pull requests" turned on.

## Keeping the Supabase project awake

Supabase pauses free-tier projects after about a week with no activity, and
login fails until the project is restored from the dashboard.
[`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml) runs
a one-row read query every 3 days to prevent that. It needs two repository
secrets (GitHub → Settings → Secrets and variables → Actions → New
repository secret):

- `SUPABASE_URL`: the same value as `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY`: the same value as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

You can run it by hand from the Actions tab ("Keep Supabase awake" → Run
workflow) to check it works. GitHub turns off scheduled workflows in repos
with no commits for 60 days and emails you first; one click re-enables it.

## Email confirmation

Supabase's built-in email sender only delivers to members of your Supabase
team and is limited to a few emails per hour, so confirmation emails to
real users need your own SMTP provider. Gmail works for free without
owning a domain:

1. Turn on 2-Step Verification for your Google account, then create an app
   password at <https://myaccount.google.com/apppasswords>.
2. Supabase dashboard → Authentication → Emails → SMTP Settings → enable
   custom SMTP: host `smtp.gmail.com`, port `587`, username = your Gmail
   address, password = the app password, sender email = your Gmail address.
   (If you own a domain, Resend or Brevo also work and look more
   professional; Resend's free plan only sends to your own address until a
   domain is verified.)
3. Authentication → URL Configuration: set Site URL to
   `http://localhost:3000` (your deployed URL later) and add
   `http://localhost:3000/**` to Redirect URLs.
4. Authentication → Emails → Templates → "Confirm signup": change the link to

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
   ```

   This sends users to `app/auth/confirm/route.ts`, which verifies the
   token directly, so the link works even when opened on a different device
   than the one used to sign up.
5. Authentication → Providers → Email: turn "Confirm email" back on.

## Project structure

```
app/
  page.tsx                          # Landing page
  (auth)/login, (auth)/signup       # Auth pages
  (dashboard)/profile               # Student profile form
  (dashboard)/recommendations       # Matched universities
  (dashboard)/universities          # Browse: search + filters over every school
  (dashboard)/universities/new      # Add your own university
  (dashboard)/universities/[id]     # University details (+ /edit for your own)
  (dashboard)/compare               # Side-by-side comparison
  (dashboard)/saved                 # Bookmarked universities (+ application status)
  (dashboard)/applications          # Application tracker and offer details
  (dashboard)/offers                # "Which offer should I accept?"
  auth/callback, auth/confirm       # Supabase email link handlers
components/
  landing/    # Hero, feature cards, CTA
  layout/     # Navbar, footer, theme toggle
  auth/       # Login/signup forms
  profile/    # Profile form
  universities/ # Cards, board (search/filter/sort), fit breakdown, forms
  ui/         # shadcn/ui components
docs/PENDING-DB-STEPS.md # SQL files not yet run on the live database, with checks
lib/
  supabase/   # Browser client, server client, session refresh helper
  actions/    # Server Actions (auth, profile, saved, universities)
  matching.ts # Match score, breakdown, Reach/Match/Safety, explanations
  focus.ts    # "What matters most to me": labels, descriptions, research levels
  scorecard-reference.json # Earnings percentiles from the import (used by the focus factor)
  pending-migrations.ts    # Lets saves work before a new migration is run
  university-filters.ts # Search/filter/sort rules for the university board
  compare.ts  # Compare URL parsing, total cost, "best in row" highlighting
  offers.ts   # Net cost, offer ranking with adjustable weights, reasons
  admission-model.ts    # Runs the exported logistic regression (no server)
  model/                # admission-model.json + parity fixtures, written by ml/
  format.ts   # Shared number formatting
  *-validation.ts       # Form validation (profile, university)
  types.ts    # Shared TypeScript types
  *.test.ts   # Vitest unit tests
ml/           # Python: synthetic data, model training, reports (see ml/README.md)
data/scorecard/universities.json # Normalized official US data (what the seed SQL is built from)
scripts/
  scorecard/  # fetch.mjs → normalize.mjs → build-seed-sql.mjs (College Scorecard import)
  check-sql.mjs   # npm run db:check: applies all SQL to an in-memory Postgres, twice
  in-memory-db.mjs # PGlite helper used by check-sql.mjs
proxy.ts      # Next.js 16's "Proxy" (renamed Middleware) — refreshes the
              # Supabase session and protects dashboard routes
supabase/
  seed.sql                          # Schema, RLS policies, and sample university data
  migration_002_richer_profiles.sql # Multi-select fields, budget range, subject rankings
  migration_003_scores_and_degree_levels.sql # SAT score, input checks, degree levels
  migration_004_admission_stats.sql # Illustrative admit GPA, SAT range, IELTS, living cost
  migration_005_browse_and_custom_universities.sql # Student-added schools + RLS, 34 more schools
  migration_006_applications.sql   # Application tracker / offers (owner-only RLS)
  migration_007_data_sources.sql   # Source label on every school + College Scorecard columns
  migration_008_primary_focus.sql  # "What matters most to me" + research/retention/co-op columns
  seed_scorecard/00–06_*.sql       # Generated: official US schools (upsert, safe to re-run)
```

## How matching works

`lib/matching.ts` scores each university 0–100 from seven factors. The
weights live in one `WEIGHTS` object at the top of the file and add up to
100 (a unit test checks this):

| Factor | Points | How it's judged |
| --- | --- | --- |
| Budget | 25 | Full points if tuition ≤ your max budget, losing points in proportion to how far over it is |
| Your focus | 20 | Depends on what matters most to you (below) |
| Major | 15 | One of your intended majors is among the school's popular programs |
| Academic fit | 15 | Your GPA vs. the typical admitted GPA, and your SAT vs. the middle-50% range (averaged when both are known) |
| Country | 10 | The school is in one of your preferred countries |
| English | 10 | Your IELTS vs. the school's minimum |
| Acceptance rate | 5 | Higher acceptance rate, more points |

### What matters most to you (the focus factor)

On the profile, each student picks one primary focus. The focus factor is
the average of whichever of its signals the school actually has (each
scored 0–1); if it has none, the factor is left out like any other
unknown:

| Focus | Signals used |
| --- | --- |
| Balanced (default) | None: the factor is left out, so the other six decide |
| Academic reputation | Subject and overall ranking (log scale; illustrative), completion rate, first-year retention rate |
| Work experience | Co-op / internship program (yes/no), median earnings 10 years after entry (between the 10th and 90th percentile of imported US schools) |
| Research | Carnegie research classification (R1 = 1, R2 = 0.7, doctoral/professional = 0.4, non-doctoral = 0), subject ranking |
| Affordability | Tuition + living cost vs. your max budget (half the budget or less = 1, the budget = 0.5, 1.5× = 0) |

Where the signals come from:
- **Carnegie classification and retention rate:** official, from College
  Scorecard (`school.carnegie_basic`; 1,519 of 1,577 schools have one). Not
  available for illustrative schools.
- **Earnings percentiles:** computed from the import into
  [`lib/scorecard-reference.json`](lib/scorecard-reference.json), not
  picked by hand.
- **Co-op programs:** no free official source lists them for every
  school, so the app never fills one in. Only a student can set it, on a
  school they add, and it's labeled "entered by you".

The focus also adds its own strengths and concerns, listed first so they
show on cards. Each one says where its figure came from, and missing
figures show as "not available".

**Unknown isn't failure.** If a factor can't be judged (no SAT on your
profile, or a non-US school with no SAT range), it's left out and the score
is scaled over the factors that are known. A missing IELTS scores higher
than one below the minimum.

`computeMatchScore()` returns the per-factor points, not just the total, so
the details page can show where a score comes from. It also gives a
**Reach / Match / Safety** label: under 15% acceptance is always a Reach;
otherwise an academic fit under 0.5 is a Reach, and 0.85 or more at a school
admitting 50% or more is a Safety. This is a hand-tuned rule of thumb, not a
prediction.

`explainMatch()` returns `{ strengths, concerns }` built from the same
factors with plain string templates (no AI API calls, so no cost or
latency). Some concerns don't affect the score but are worth knowing, for
example when tuition fits your budget but tuition plus living costs doesn't.

Two more rules sit on top of the score:

- **Degree level is a hard requirement.** A school that doesn't offer the
  student's degree level scores 0 and is left out of recommendations. An
  empty `degree_levels` list means "unknown", so the school isn't ruled out.
- **`budget_min` adds information, not a penalty.** If tuition is below half
  the student's minimum budget, the explanation calls it "much cheaper than
  your range" and suggests checking what the fee covers. It doesn't lower
  the score, because paying less isn't a worse fit.

`getDisplayRanking()` shows the QS ranking for the specific program that
matched the student's major when we have that data (`program_rankings` on
the university), and falls back to the university-wide ranking labeled
"Overall" otherwise — so a ranking is never shown without saying what it's
actually ranking.

## How comparison works

`/compare?ids=a,b,c` compares up to 4 universities. The URL is the only
place the selection lives, so a comparison can be bookmarked or shared and
the back button works. Tick "Compare" on any card, or add schools on the
compare page.

Each row highlights its best value using `bestIndexes()` in
[`lib/compare.ts`](lib/compare.ts): lowest tuition, living cost and total
cost; highest match score, acceptance rate and GPA margin; Safety over Match
over Reach. Ties are all highlighted, unknown values are skipped, and a row
with no real winner isn't highlighted at all. Rankings are only compared
when every school is ranked the same way, since a subject ranking and an
overall ranking aren't on the same scale. The estimated total per year is
tuition plus living cost, and shows as unknown when the living cost is
missing rather than quietly showing tuition alone.

## Admission model (trained on synthetic data)

For undergraduate profiles at schools with official College Scorecard
data, Reach / Match / Safety and the "~%" estimate come from a logistic
regression trained offline in Python ([`ml/`](ml/README.md)) and run in
TypeScript ([`lib/admission-model.ts`](lib/admission-model.ts)):
standardize four features (GPA, SAT z-score within the school's range,
"SAT known", and the school's admission rate on a log-odds scale), take a
dot product, apply a sigmoid. A Vitest parity test checks the TypeScript
predictions match scikit-learn's on 20 fixture rows. The details page shows
how much each factor moves the estimate. Illustrative and self-entered
schools keep the hand-written rule, because the model was only simulated
around official figures.

**It's trained on synthetic applicants**, because there's no public
per-student undergraduate admissions data. The *schools* are real (each
school's official admission rate and SAT range from Scorecard, 50
simulated applicants per school, 78,850 in total); the *applicants* and
the admission rule are invented. On the held-out synthetic test set
([`ml/reports/admission_report.md`](ml/reports/admission_report.md)):

| Model | ROC-AUC | Log-loss | Brier |
| --- | --- | --- | --- |
| Old rule (baseline) | 0.627 | 0.564 | 0.190 |
| Logistic regression (used in the app) | 0.895 | 0.355 | 0.112 |
| Gradient boosting (comparison) | 0.895 | 0.355 | 0.113 |

These numbers show the pipeline recovers the structure of data it was
built to have. They say nothing about real admissions, and the UI labels
the estimate as a demo. (They aren't comparable with the earlier version of
this model, which was simulated around the illustrative sample schools.)
Gradient boosting scores the same here; logistic regression is used
because its coefficients and per-factor contributions can be explained,
and it runs in plain TypeScript inside the Next.js app, with no Python
server. The model only replaces the old rule because training recorded
that it beats the rule on all three metrics.

## School-level regressions (real data)

[`ml/train_school_regression.py`](ml/train_school_regression.py) fits two
linear regressions on the official Scorecard data, one row per school:
admission rate, and median earnings 10 years after entry, each from SAT
midpoint, size, tuition, ownership and region. Full results, coefficients
and plots are in
[`ml/reports/school_regression.md`](ml/reports/school_regression.md):

| Target | Schools | Test R² | 5-fold CV R² (train) | Test RMSE | RMSE of predicting the mean |
| --- | --- | --- | --- | --- | --- |
| Admission rate | 918 | 0.416 | 0.328 ± 0.122 | 16.4 points | 21.6 points |
| Median earnings | 910 | 0.639 | 0.627 ± 0.088 | $9,484 | $15,834 |

This is **ecological** data: it describes how schools differ, not what
will happen to any student, and the coefficients are associations, not
causes. Only schools that report an SAT range are included (many are
test-optional), and groups with fewer than 20 schools are left out.

## How offer ranking works

Each tracked application is also the record of an offer. Once its status
is **Admitted** (or **Accepted**), it appears on `/offers`, ranked by
`rankOffers()` in [`lib/offers.ts`](lib/offers.ts):

- **Net cost per year** = tuition + living cost − scholarship (never below
  0). **Total cost** = net cost × program length. If tuition or living cost
  is missing, the cost is unknown rather than tuition-only, so an offer
  with missing details can't look cheaper than it is.
- Each offer is scored 0–100 from seven criteria, each weighted 0–10 by
  sliders the student controls. Where the sliders start depends on the
  student's focus (`FOCUS_OFFER_WEIGHTS`), and the page says so in one
  line, e.g. "Because you prioritize research, subject ranking and research
  intensity count more." Balanced starts at cost 5, overall ranking 3,
  subject ranking 3, match score 2, preferred country 1, research
  intensity 1, career outcomes 1:
  - **Cost and rankings are relative** to the student's own offers: the
    best gets full marks and the worst gets none.
  - **Rankings use a log scale**, because #5 vs #10 is a much bigger
    difference than #205 vs #210.
  - **Match score** (0–100 from matching), **preferred country** (yes/no),
    **research intensity** and **career outcomes** (the same 0–1 signals
    the focus factor uses) are used as they are.
  - **Unknown values are left out**, as in matching: a criterion that's
    unknown for an offer (e.g. no subject ranking) is excluded from that
    offer's score instead of counting as zero.
- Every offer gets a plain-language reason built from the criteria that
  count most for that student, plus its weak spot. The page also names the
  best overall, cheapest and highest-ranked offer.

## Notes

- Row Level Security is enabled on all tables. Profiles and saved
  universities are only readable/writable by their owner. A university row
  is readable if it's shared seed data (`created_by is null`) or you added
  it (`created_by = auth.uid()`), and only its creator can edit or delete
  it. Because every page reads the same `universities` table, a school a
  student adds shows up (and is scored) everywhere in their account
  without any extra code.
- Universities without a known ranking show "Ranking not available" rather than a
  made-up number, and sort last when sorting by ranking.
- Auth uses `@supabase/ssr` with cookie-based sessions shared between the
  browser, Server Components, and Server Actions.
