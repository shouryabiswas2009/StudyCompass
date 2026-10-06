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
   - Then run [`supabase/migration_008_primary_focus.sql`](supabase/migration_008_primary_focus.sql)
     and [`supabase/migration_009_multi_focus_and_coop.sql`](supabase/migration_009_multi_focus_and_coop.sql).
     They add the student's "what matters most to me" focuses and the
     research / retention / co-op columns they use.
   - Then run every file in [`supabase/seed_scorecard/`](supabase/seed_scorecard/),
     in order (`00_…` first). They import ~1,600 US universities with
     official data and update the 14 sample US schools in place. They're
     safe to re-run.
   - Then run [`supabase/migration_010_featured.sql`](supabase/migration_010_featured.sql)
     and [`supabase/featured/featured.sql`](supabase/featured/featured.sql),
     which mark the schools shown by default (see "Which schools are
     shown first" below).
   - Then run [`supabase/migration_011_international.sql`](supabase/migration_011_international.sql)
     and the files in [`supabase/seed_international/`](supabase/seed_international/)
     in order: the hand-checked international universities. (`npm run db:check` runs all of the SQL above on a
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
| **Source: <university site>** (curated) | Checked by hand on the university's **own** website; every figure has its page linked on the details page. Never shown as "official" | 42 universities in the UK, Canada, Australia and Germany so far (see the coverage report below) |
| **Illustrative** | Hand-written sample figures for this demo, **not** official statistics | 29 schools in 21 countries not curated yet |
| **Added by you** | Figures a student entered themselves, optionally with a source link | Only visible to that student |

**The US has official data; other countries are curated by hand.** College
Scorecard is the only free, official source that publishes figures for
every school in a structured form. Elsewhere, figures are copied by hand
from each university's own fees, co-op and program pages into
[`data/curated/international_universities.csv`](data/curated/international_universities.csv),
with the page URL, the year and exactly what the figure is
(`tuition_basis`). Ranking sites aren't scraped (their terms don't allow
it); if you want rankings, copy them by hand into
[`data/curated/international_rankings.csv`](data/curated/international_rankings.csv).
Anything that couldn't be verified is left empty and shows as "not
available", and the CSV's `notes` column says why.

### Curated data: how it gets in

1. Edit the CSVs in `data/curated/` (a spreadsheet works).
2. `npm run data:validate-international` checks them: required fields,
   ranges, URL format, a source page for every figure, no duplicates.
3. `npm run data:build-international` converts money to US dollars at the
   European Central Bank rates in `lib/exchange-rates.ts` and writes
   `supabase/seed_international/*.sql` (run them in order in the SQL
   Editor). A curated row that replaces an illustrative one keeps the same
   row (`match_existing_name`), so saved schools and applications keep
   working, and every illustrative figure on it is replaced by a verified
   one or "not available".
4. `npm run data:report` prints coverage per country (below).

**Tuition rule:** the **lowest published** international undergraduate fee,
shown as "from …", with `tuition_basis` saying exactly what it is. When a
university only publishes one programme's fee, or only per-course or
per-credit fees, the row says so instead of a computed number (except
German universities, where a year is always two semesters at a flat fee).

**Currency:** money is stored in its own currency too. The US-dollar
figure used for scoring is converted at the ECB reference rate of
`fx_rate_date` (`npm run data:fx` updates the rates) and always labeled
"≈ … approximate". A currency the ECB doesn't publish (e.g. TWD) isn't
converted; the UAE dirham uses its official peg.

What Scorecard does and doesn't give the app:
- **Official:** admission rate, SAT percentiles, tuition, living costs,
  net price, completion and first-year retention rates, median earnings,
  Carnegie research classification, size, type and location.
- **Tuition is the out-of-state rate** (`latest.cost.tuition.out_of_state`),
  which is what international students pay at public universities; for
  private schools it's the same as in-state. Checked against the raw
  download: none of the 529 public schools was missing it (so the in-state
  fallback is never used), and 39 genuinely charge everyone the same. Some
  public universities add an extra international-student fee on top, which
  Scorecard doesn't publish.
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
   `data/scorecard/universities.json`, `supabase/seed_scorecard/` and
   `supabase/featured/featured.sql`.
3. Run `npm run db:check`, review the diff, then run the new
   `supabase/seed_scorecard/*.sql` files and then `supabase/featured/featured.sql`
   in the SQL Editor.

[`.github/workflows/refresh-scorecard.yml`](.github/workflows/refresh-scorecard.yml)
does steps 2–3 for you once a year, or whenever you run it from the Actions
tab, and opens a pull request instead of pushing to `main`. It needs a
`SCORECARD_API_KEY` repository secret and "Allow GitHub Actions to create
and approve pull requests" turned on.

### Which schools are shown first (the relevance rule)

The Scorecard import takes every US school that mainly awards bachelor's
degrees and publishes an admission rate, so it includes many small, local
and open-admission colleges that few international students consider.
Shown all at once, US schools crowd out every other country. So shared
schools have an `is_featured` flag, and recommendations, browse and the
compare picker show featured schools by default, with a visible
"Include all N schools" toggle and the count. **Nothing is deleted.**

A US school is featured if **any** of these is true:

| Rule | Schools it covers |
| --- | --- |
| Carnegie research level R1 or R2 | 272 |
| SAT 75th percentile (Reading + Math) ≥ 1400 | 194 |
| Has a known ranking | the 14 original sample schools |
| Listed in [`data/curated/featured_us.csv`](data/curated/featured_us.csv) | 0 so far (add your own) |
| **Any of the above** | **371 of 1,577** (201 public, 170 private, every state + DC) |

Every hand-picked non-US school is always featured, and students always see
the schools they added. The thresholds live in one place,
[`scripts/relevance-rule.mjs`](scripts/relevance-rule.mjs). How the SAT
threshold changes the count (R1/R2 and ranked schools always included):

| SAT 75th ≥ | 1300 | 1350 | **1400** | 1450 | 1500 |
| --- | --- | --- | --- | --- | --- |
| Featured US schools | 543 | 438 | **371** | 341 | 317 |

1400 keeps about 100 selective non-research colleges (e.g. liberal arts
colleges) on top of R1/R2 while cutting the US list by three quarters.
After changing the rule: `npm run data:featured`, then run the regenerated
`supabase/featured/featured.sql`. `npm run db:check` checks that the SQL
and JavaScript versions of the rule agree.

Recommendations also show **top picks by country**: the best three
matches in each of the student's preferred countries, above the full
ranked list, so one country can't crowd out the others.

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
  data/universities.ts # Loads every university (past the 1,000-row API limit), cached on the server
  supabase/   # Browser client, server client, session refresh helper
  actions/    # Server Actions (auth, profile, saved, universities)
  matching.ts # Match score, breakdown, Reach/Match/Safety, explanations
  focus.ts    # "What matters most to me": labels, descriptions, research and co-op levels
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
data/curated/featured_us.csv     # Hand-picked US schools to feature (edit freely)
scripts/
  scorecard/  # fetch.mjs → normalize.mjs → build-seed-sql.mjs (College Scorecard import)
  check-sql.mjs   # npm run db:check: applies all SQL to an in-memory Postgres, twice
  relevance-rule.mjs     # Which schools are featured: the thresholds live here
  curated/               # CSV reader, validator and SQL generator for data/curated/
  fx/fetch-ecb.mjs       # npm run data:fx → lib/exchange-rates.ts (ECB reference rates)
  data-report.mjs        # npm run data:report: coverage per country
  build-featured-sql.mjs # npm run data:featured → supabase/featured/featured.sql
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
  migration_008_primary_focus.sql  # Single focus + research/retention columns (superseded by 009)
  migration_009_multi_focus_and_coop.sql # Multi-select focuses + co-op program columns
  migration_010_featured.sql       # is_featured flag (which schools are shown by default)
  seed_scorecard/00–06_*.sql       # Generated: official US schools (upsert, safe to re-run)
  featured/featured.sql            # Generated: applies the relevance rule
  migration_011_international.sql  # Curated source, currencies, aliases, accent-free search
  seed_international/*.sql         # Generated from data/curated/ (upsert, safe to re-run)
```

## How matching works

`lib/matching.ts` scores each university 0–100. The weights live at the
top of the file and always add up to 100 (a unit test checks every
combination). 80 points are the same for everyone:

| Factor | Points | How it's judged |
| --- | --- | --- |
| Budget | 25 | Full points if tuition ≤ your max budget, losing points in proportion to how far over it is |
| Major | 15 | One of your intended majors is among the school's popular programs |
| Academic fit | 15 | Your GPA vs. the typical admitted GPA, and your SAT vs. the middle-50% range (averaged when both are known) |
| Country | 10 | The school is in one of your preferred countries |
| English | 10 | Your IELTS vs. the school's minimum |
| Acceptance rate | 5 | Higher acceptance rate, more points |

The other 20 points follow what matters most to you (below).

### What matters most to you (focuses)

On the profile a student ticks any of four focuses. Ticking none means
**Balanced**. Each focus has its own factor, scored 0–1 from whichever of
its figures the school actually has; with none of them, the factor is
left out like any other unknown:

| Focus | Factor | Figures used |
| --- | --- | --- |
| Academic reputation | Academic reputation | Subject and overall ranking (log scale; illustrative), completion rate, first-year retention rate |
| Work experience | Co-op / internships | The school's co-op / internship program: mandatory = 1, optional = 0.5, none = 0, unknown = left out |
| Research | Research | Carnegie research classification (R1 = 1, R2 = 0.7, doctoral/professional = 0.4, non-doctoral = 0), subject ranking |
| Affordability | Affordability | Tuition + living cost vs. your max budget (half the budget or less = 1, the budget = 0.5, 1.5× = 0) |

**Blending rule** (`focusWeights()`): think of each focus as a weight
profile, the 80 base points plus all 20 focus points on its own factor.
The profiles of every ticked focus are **averaged with equal weight**, so
each ticked focus gets 20 ÷ (number ticked) points: one focus gets 20,
two get 10 each, and so on. Balanced is the average of all four profiles,
5 points each. So **ticking all four gives exactly the same weights as
Balanced**: caring about everything equally is the same as not
prioritizing anything. A unit test checks this.

**"Work experience" means co-op and internship opportunities**: does the
school run a co-op or internship program, and is it mandatory or
optional. It does **not** use employment rates or graduate earnings,
which describe what happens after graduating, not whether the school
helps a student get experience while studying. Earnings still appear on
the details page as information only. A test checks that a school with
excellent earnings but no co-op information gets no work-experience boost.

Where the figures come from:
- **Carnegie classification and retention rate:** official, from College
  Scorecard (`school.carnegie_basic`; 1,519 of 1,577 schools have one). Not
  available for illustrative schools.
- **Co-op programs** (`coop_program`: mandatory / optional / none /
  unknown, plus an optional `internship_support_url`): there's no official
  dataset, so it's only filled in from the school's own page, with that
  page's URL. It defaults to `unknown`, which is never read as "none". A
  student can set it on schools they add.

Ticked focuses also add their own strengths and concerns, listed first so
they show on cards, e.g. "Has a mandatory co-op program" or "No co-op
information available for this school." Each one says where its figure
came from.

**Unknown isn't failure.** If a factor can't be judged (no SAT on your
profile, a non-US school with no SAT range, unknown tuition or admission
rate, no program list), it's left out and the score is scaled over the
factors that are known. A missing IELTS scores higher than one below the
minimum.

**"Not enough data" instead of a fake Match.** Without admission figures to
compare the student with (most non-US schools publish none), the label is
"Not enough data", not "Match". A school admitting under 15% is still a
Reach; Safety needs a known admission rate.

**Masters and PhD students** only see schools that say they offer that
level, and the undergraduate admission figures (admission rate, GPA, SAT)
aren't used to judge them; the details page says so. US degree levels come
from the credential levels of the programs each school reports to
Scorecard (bachelor's, master's, doctoral).

**Country names** go through one canonical list with aliases
(`lib/countries.ts`): "UK", "England" and "United Kingdom", or "USA" and
"United States", all match, and names are stored canonically.

**Search** matches names and aliases (MIT, UCL, LSE, ETH, …) without
accents ("universite de montreal" finds "Université de Montréal") in
Postgres: a generated `search_text` column (unaccent + lower-case) with a
trigram index (`migration_011`).

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
  student's focuses, blended with the same rule as matching: the starting
  weights of every ticked focus (`FOCUS_OFFER_WEIGHTS`) are averaged and
  rounded to whole slider steps. The page says so in one line, e.g.
  "Because you prioritize work experience and research, subject ranking,
  research intensity and co-op / internships count more." Balanced starts
  at cost 5, overall ranking 3, subject ranking 3, match score 2,
  preferred country 1, research intensity 1, co-op / internships 1:
  - **Cost and rankings are relative** to the student's own offers: the
    best gets full marks and the worst gets none.
  - **Rankings use a log scale**, because #5 vs #10 is a much bigger
    difference than #205 vs #210.
  - **Match score** (0–100 from matching), **preferred country** (yes/no),
    **research intensity** and **co-op / internships** (the same 0–1
    figures the focus factors use) are used as they are.
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
