# Pending database steps

SQL files that are written and tested locally (`npm run db:check` runs them
all, twice, on a scratch Postgres) but **have not been run on the live
Supabase database yet**. Nothing here is verified against the real database
until it's ticked off below.

Run them in the Supabase dashboard → **SQL Editor** → **New query**: paste
the whole file, click **Run**, then run the check underneath it. Do them in
this order: the seed files need both migrations first.

| # | File | Status |
| --- | --- | --- |
| 1 | `supabase/migration_007_data_sources.sql` | Not run yet |
| 2 | `supabase/migration_008_primary_focus.sql` | Not run yet |
| 3 | `supabase/seed_scorecard/00_link_existing.sql` | Not run yet |
| 4 | `supabase/seed_scorecard/01_universities.sql` … `06_universities.sql` (one at a time, in order) | Not run yet |

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

---

When everything is run and checked, tell Claude "the Supabase steps are
done" so this file can be marked verified (and Phase C's performance
measurements can start: they need real queries).
