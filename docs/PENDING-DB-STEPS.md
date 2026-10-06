# Pending database steps

SQL files that are written and tested locally (`npm run db:check` runs them
all, twice, on a scratch Postgres) and then run by hand on the live
Supabase database. Nothing here counts as verified against the real
database until it's ticked off below.

**Status:** steps 1–4 were run in the SQL Editor on 2026-10-06 and
verified with read-only queries against the live database (the new
columns exist, 14 sample schools are linked, and the counts match
`npm run db:check` exactly: College Scorecard 1,577, illustrative 47;
research levels 146 / 126 / 154 / 1,093 with 58 unknown). Step 5 was run
the same day and verified: `focuses`, `coop_program` and
`internship_support_url` exist, `primary_focus` and `has_coop` are gone,
all 1,624 schools start at co-op `unknown`, and a signed-in profile's old
single focus shows up in the new list. **Nothing pending.**

New migrations will be added to this table when they're written.

Run them in the Supabase dashboard → **SQL Editor** → **New query**: paste
the whole file, click **Run**, then run the check underneath it. Do them in
this order: the seed files need both migrations first.

| # | File | Status |
| --- | --- | --- |
| 1 | `supabase/migration_007_data_sources.sql` | Done, verified 2026-10-06 |
| 2 | `supabase/migration_008_primary_focus.sql` | Done, verified 2026-10-06 |
| 3 | `supabase/seed_scorecard/00_link_existing.sql` | Done, verified 2026-10-06 (14 linked) |
| 4 | `supabase/seed_scorecard/01_universities.sql` … `06_universities.sql` (one at a time, in order) | Done, verified 2026-10-06 (1,577 rows) |
| 5 | `supabase/migration_009_multi_focus_and_coop.sql` | Done, verified 2026-10-06 |

All of them are safe to run again if you're not sure whether one went
through.

---

## 1. `migration_007_data_sources.sql`

**What it does:** adds a `source` label to every university (`College
Scorecard`, `illustrative` or `user-entered`) plus provenance columns
(`data_year`, `fetched_at`, `source_url`, `scorecard_id`) and the official
Scorecard figures (city, state, ownership, net price, completion rate,
earnings…), with database checks so a student's own row can't be labeled
official.

**What's affected until it runs:**
- Every page still loads (they read with `select("*")`, so the missing
  columns just come back empty), but every school shows the amber
  "Illustrative data" badge and no admission estimate is shown.
- "Add / edit a university" still saves, but the source link isn't stored;
  the form says so after saving.
- The `seed_scorecard` files fail (their columns don't exist yet).

**Check:**
```sql
select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'universities' and column_name in ('source', 'scorecard_id', 'median_earnings_10yr');
```
Expect `3`.

## 2. `migration_008_primary_focus.sql`

**What it does:** adds `profiles.primary_focus` ("what matters most to
me": balanced, academic, work experience, research, affordability; default
balanced) and three university columns the focuses use:
`research_intensity` (Carnegie classification), `retention_rate` and
`has_coop`, with check constraints on the allowed values.

**What's affected until it runs:**
- Profile page: saving still works, but the focus isn't stored; the form
  shows an amber note saying so instead of going to recommendations. All
  scoring treats the student as "Balanced".
- "Add / edit a university": research activity and co-op answers aren't
  stored (the form says so).
- Research / careers figures show "Not available" everywhere.
- The `seed_scorecard` files fail (they fill in `research_intensity` and
  `retention_rate`).

**Check:**
```sql
select count(*) from information_schema.columns where table_schema = 'public' and ((table_name = 'profiles' and column_name = 'primary_focus') or (table_name = 'universities' and column_name in ('research_intensity', 'retention_rate', 'has_coop')));
```
Expect `4`.

## 3. `seed_scorecard/00_link_existing.sql`

**What it does:** gives the 14 original sample US schools (MIT, Harvard,
Stanford, …) their College Scorecard id, so the next files update them in
place instead of adding duplicates. Saved schools and applications stay
attached.

**What's affected until it runs:** if you skip it, files 01–06 would add a
second copy of those 14 schools.

**Check:**
```sql
select count(*) from public.universities where scorecard_id is not null;
```
Expect `14` right after this file (before 01–06).

## 4. `seed_scorecard/01_universities.sql` … `06_universities.sql`

**What it does:** inserts or updates 1,577 US universities with official
College Scorecard figures (data year 2024). Rows students added are never
touched.

**What's affected until it runs:** browse and recommendations only show the
61 sample schools; no school has official data, so the admission estimate
never appears.

**Check:**
```sql
select source, count(*) from public.universities group by source order by source;
```
Expect `College Scorecard 1577` and `illustrative 47` (plus `user-entered`
if you've added schools yourself). And:
```sql
select research_intensity, count(*) from public.universities where source = 'College Scorecard' group by 1 order by 2 desc;
```
Expect `non_doctoral 1093`, `doctoral_professional 154`, `very_high 146`,
`high 126`, and `58` with no value (null).


## 5. `migration_009_multi_focus_and_coop.sql`

**What it does:** replaces the single "what matters most" choice with a
multi-select. Adds `profiles.focuses` (a list; empty = Balanced; only
academic / work_experience / research / affordability allowed), copies
each student's old `primary_focus` into it, then drops `primary_focus`.
Adds `universities.coop_program` (mandatory / optional / none / unknown,
default unknown) and `internship_support_url`, carries over any yes/no
`has_coop` answers students gave (yes → optional, no → none), then drops
`has_coop`. Re-running it does nothing (it checks the old columns still
exist first). Tested locally in `scripts/migrations.test.mjs`.

**What's affected until it runs:**
- Profile page: the checkboxes show your old single choice, but saving
  can't store the new list. The profile saves everything else and shows
  an amber note naming this file.
- Scoring and offers use your old single choice (read as a one-item list).
- Co-op shows "Not available" everywhere, and "Add / edit a university"
  can't store the co-op answer or page link (the form says so).
- Nothing errors.

**Check:**
```sql
select count(*) from information_schema.columns where table_schema = 'public' and ((table_name = 'profiles' and column_name = 'focuses') or (table_name = 'universities' and column_name in ('coop_program', 'internship_support_url')));
```
Expect `3`. And the old columns should be gone:
```sql
select count(*) from information_schema.columns where table_schema = 'public' and column_name in ('primary_focus', 'has_coop');
```
Expect `0`.

---

When everything is run and checked, tell Claude "the Supabase steps are
done" so this file can be marked verified.
