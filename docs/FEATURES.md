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
