# Feature notes

Short "how it works and why" notes for smaller features.

## Display currency (profile)

**Why.** Budgets and costs are in US dollars so every school can be
compared on one scale, but most students think in their own currency.

**How.** The profile has "Also show amounts in" (`profiles.display_currency`,
migration_016; US dollars by default). Amounts are still stored and
compared in dollars; next to them the app adds "≈ amount" in that
currency (`lib/display-currency.ts`, tested), on the profile's budget, in
"Your fit" on a university's page, in compare and on the offers page. The
conversion uses the same dated European Central Bank reference rates as
curated tuition (`lib/exchange-rates.ts`, `npm run data:fx`), is rounded to
three significant figures, and always says "approximate, at the European
Central Bank rate of <date>". Only currencies with an official rate are
offered (the UAE dirham uses its official peg); nothing is guessed.

## Grade systems (profile)

**Why.** Students come with CBSE CGPAs, IB grades, A Levels or US GPAs,
but every comparison (admission figures, the model, What if?) works on one
percentage.

**How.** The profile asks for the grading system, then the grades
(`components/profile/grades-field.tsx`), and `lib/grades.ts` (tested for
every conversion) turns them into the percentage, only with the board's
own published rule:
- CBSE Class X CGPA: 9.5 × CGPA (CBSE Circular 24/2010).
- IB subject grades: the middle of each grade's range in the IB's
  suggested conversion for Indian universities (the IB says to use the
  midpoint), averaged.
- Cambridge International A Levels: the middle of each grade's percentage
  uniform mark range, averaged, exactly as Cambridge's own worked example
  (A*, A, B → 85%). If the statement of results shows PUMs, the student
  enters those instead, as Cambridge asks.
- US GPA and anything else: there's no published table to a single
  percentage (College Board says its per-class table isn't a formula for a
  GPA), so the student gives their nearest percentage and it's stored and
  shown as approximate.

How the percentage was obtained is saved with it (`grade_system`,
`grade_input`, `grade_basis`, migration_017) and shown in "Your fit" and
compare. Sources are linked in the form and listed on /credits.

## Report a wrong figure, and "data last checked"

**Why.** Figures go out of date, and students often spot it first. Every
figure should also say how fresh it is.

**How.** A university's page lists each source behind it with the date it
was last checked (`lib/source-dates.ts`, tested): College Scorecard's fetch
date and data year, the date a curated row was checked by hand, the ECB
rate date for converted money, and the Leiden Ranking's download date. No
date is shown where none was recorded.

Under that list, signed-in students can "Report a wrong figure"
(`components/universities/report-figure.tsx`, validated in
`lib/figure-report.ts`, saved by `lib/actions/reports.ts`). Reports go into
`figure_reports` (migration_018) with row level security: a student can
only add reports as themselves, only about shared universities, only as
"open", and can only read their own (listed on their profile with their
status). Students can't change or delete them. The policies are tested
under a non-superuser role in `scripts/migrations.test.mjs`.

**Reviewing reports** (SQL Editor, which isn't subject to row level security):

```sql
-- Open reports, newest first
select r.created_at, u.name, r.field, r.current_value, r.suggested_value,
       r.source_url, r.note, r.id
from public.figure_reports r
join public.universities u on u.id = r.university_id
where r.status = 'open'
order by r.created_at desc;

-- After checking one against its source
update public.figure_reports set status = 'fixed' where id = '<id>';   -- or 'rejected'
```

Correct the figure itself in its source file (for example
`data/curated/international_universities.csv`) and re-run that import, so
the fix survives the next import.
