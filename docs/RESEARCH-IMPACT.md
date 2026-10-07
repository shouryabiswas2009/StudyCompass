# Research impact (Leiden Ranking / OpenAlex)

## How it works and why

Students comparing universities in different countries had almost nothing
to compare their strength with: College Scorecard only covers the US, and
commercial rankings (QS, THE, U.S. News, ShanghaiRanking) can't be copied
into the site. So the site uses open data instead.

**The figure.** The [CWTS Leiden Ranking Open Edition 2025](https://open.leidenranking.com)
(CC0 1.0, built from [OpenAlex](https://openalex.org), also CC0) measures,
for 2,831 universities with at least 1,500 publications in 2020–2023,
**PP(top 10%)**: the share of a university's papers that are among the 10%
most cited in their field and year. We use Leiden's default view (core
publications, fractional counting) and turn it into a **percentile** among
all 2,831 universities: 88 means a higher share than 88% of them. The same
is done for each of Leiden's five main fields; a field is left out when the
university has fewer than 100 papers in it (our rule, because a few highly
cited papers swing a small share a lot).

It measures research, not teaching, so it's labelled "Research impact
(Leiden Ranking / OpenAlex)" everywhere and never called a ranking.

**Where it's used.**
- Quality score (`lib/quality.ts`, weight 3): in the student's field when
  their major maps to one of Leiden's fields (`lib/research-impact.ts`,
  mapping taken from the topics Leiden lists per field), otherwise overall.
  It counts as a direct signal, so a university outside the US with only
  this figure still gets a quality score instead of "not available".
- The research focus (with the Carnegie level and subject rankings).
- Offers: its own slider, "Research impact (Leiden Ranking / OpenAlex)".
- Compare: its own row (the "best" mark only when every school uses the
  same field or all use overall).
- The university page: overall, each field, the figure behind it, source,
  licence and the date the data was checked.

**Matching our universities to Leiden's** (`scripts/research-impact/lib.mjs`,
tested): strongest rule first.
- high: the same identifier (a US school's IPEDS id → Wikidata → ROR id,
  which Leiden lists), or the same website domain in the same country
- medium: exactly the same name (or one of our aliases) in the same country,
  with no other university of that name there
- low: one of OpenAlex's other names (these include historical ones:
  Columbia was once "King's College"), or a similar name. **Never used**
  until a person accepts it in `data/research-impact/overrides.csv`.

Every proposed match, with its method and confidence, is in
`data/research-impact/matches.csv`; coverage by country and the matches
waiting for review are in `data/research-impact/coverage.md`.

## Updating it

```bash
npm run data:research-impact:download   # once; ~600 MB into ml/data/raw (git-ignored)
npm run data:research-impact:build      # matches.csv, coverage.md, supabase/seed_research_impact.sql
```

Review `coverage.md`, record decisions in `overrides.csv`
(`key,ror,accepted,reason`), build again, then run
`supabase/seed_research_impact.sql` in the Supabase SQL Editor and call
`POST /api/revalidate` so the cached list picks it up. Nothing calls these
services while the site runs.

## QS and other commercial rankings

The site doesn't show or store QS figures. Linking to a QS profile page
would be allowed (a plain link, no numbers), but QS's site refuses
automated requests, so the right page for each university can't be
checked without scraping it, and we don't guess links. If you'd like to
show QS rankings themselves, you'd need written permission: QS's content
team can be asked at content@qs.com (say what you'd show, for which
universities, and that the site is free and non-commercial).
