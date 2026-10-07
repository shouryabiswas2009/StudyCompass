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
