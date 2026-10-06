# Performance

Measured before changing anything, then again after, on the same machine
and setup, so the "after" numbers are a like-for-like comparison.

## How it was measured

- **Production build** (`npm run build`, then `next start` on port 3002),
  never the dev server, which compiles on demand and is much slower.
- **Signed-in student** with a saved profile, against the live Supabase
  project (free tier) after the College Scorecard import: 1,624
  universities (1,577 College Scorecard + 47 illustrative).
- **Server time:** `fetch()` from a signed-in browser tab, 5 requests per
  page with `cache: "no-store"`, **median** reported. "To first byte" is
  until the response headers arrive (the server finished its work);
  "total" includes downloading the page.
- **Browser:** 3 full page loads of `/universities`, read from the
  Navigation Timing API (`performance.getEntriesByType("navigation")`)
  plus a count of DOM elements and cards on the page.
- **Pieces:** the universities query and Supabase's auth endpoint timed
  directly from Node (5 runs, median); scoring timed in Vitest over the
  1,577 Scorecard schools (7 runs, median).

The browser-side snippet used is in the "Reproducing" section at the end.
Times depend on the network to Supabase, so compare before vs. after
rather than reading the absolute numbers as universal.

## Before (2026-10-06, commit 3403071)

### Server time per page (median of 5)

| Page | To first byte | Total | Page size |
| --- | --- | --- | --- |
| `/universities` (browse) | 2,124 ms | 2,228 ms | 10,369 KB |
| `/recommendations` | 2,106 ms | 2,220 ms | 10,360 KB |
| `/saved` | 1,070 ms | 1,074 ms | 70 KB |
| `/applications` | 803 ms | 805 ms | 45 KB |
| `/offers` | 1,053 ms | 1,059 ms | 33 KB |
| `/profile` | 798 ms | 801 ms | 48 KB |
| `/universities/[id]` | 1,085 ms | 1,090 ms | 74 KB |
| `/compare` (3 schools) | 1,326 ms | 1,344 ms | 180 KB |

### Browser, `/universities` (3 loads)

| Load | First byte | DOM content loaded | Load event | DOM elements | Cards |
| --- | --- | --- | --- | --- | --- |
| 1 | 1,902 ms | 2,190 ms | 2,728 ms | 51,093 | 1,000 |
| 2 | 1,507 ms | 1,745 ms | 2,147 ms | 51,093 | 1,000 |
| 3 | 2,241 ms | 2,493 ms | 2,952 ms | 51,093 | 1,000 |

### Where the time goes

| Piece | Measured | Notes |
| --- | --- | --- |
| `select *` on universities | 1,047 ms median, 926 KB | Returns **1,000 of 1,624 rows**: Supabase caps API responses at 1,000 rows by default |
| One Supabase auth call (`getUser`) | ~251 ms (auth endpoint round trip) | Made **3 times per page**: the proxy, the root layout (navbar) and the page |
| Scoring all 1,577 Scorecard schools | 9.3 ms median | Not the bottleneck |

### What this shows

1. **A correctness bug, not just slowness.** Browse and recommendations only
   ever saw 1,000 of the 1,624 universities. Browse sorted by name, so
   everything after roughly the first 1,000 names was silently missing.
2. **Every university was sent to the browser.** Each of the 1,000 scored
   schools (with explanations) became a card: about 10 MB of HTML, 51,000
   DOM elements, and 1,000 animated components to hydrate. The browser
   then filtered and sorted all of them.
3. **Auth cost about 750 ms per page** before any data loaded: three
   network round trips to verify the same session.
4. **The same list was re-downloaded on every visit** although it only
   changes when the import is re-run.
5. Scoring itself (9 ms for every school) is cheap. Moving it into SQL
   would duplicate the logic for no measurable gain.

## Changes

### Step 1: one local auth check per request (commit after 3403071)

- `lib/supabase/middleware.ts` (run by `proxy.ts`) uses
  `supabase.auth.getClaims()` instead of `getUser()`. Supabase's Next.js
  guide recommends `getClaims()` for protecting pages: it verifies the
  token's signature against the project's public key, locally. This
  project's key is asymmetric (`ES256`, checked via its JWKS endpoint), so
  there's no network call per request. `getUser()` asks the Auth server
  every time.
- `lib/auth.ts` `getCurrentUser()` does the same check, wrapped in React's
  `cache()`, so the root layout (navbar) and the page share **one** check
  per request instead of making two more network calls.
- Server Actions (saving, deleting) still use `getUser()`: they're rare,
  and a fresh server-side check before a write is worth ~250 ms.

### Step 2: every row, only the needed columns, cached

`lib/data/universities.ts`:
- `fetchAllRows()` asks for rows 1,000 at a time until a short page, so all
  1,624 schools load instead of the first 1,000. A test with a fake
  1,000-row-capped API guards this.
- Only `LIST_COLUMNS` (what list pages use) are selected.
- The shared list (rows no student added) is cached on the server with
  `unstable_cache` (15 minutes, tag `universities`). It's readable by anyone
  under RLS, so one cached copy serves every student; each student's own
  schools are fetched separately and never cached. The cached list is about
  1 MB for all 1,577 Scorecard schools, under Next.js's 2 MB data-cache
  limit; a test fails if it grows past 1.5 MB.
- If a column from a not-yet-run migration is missing, it selects without
  it and **skips the cache**, so the next request after the migration
  sees the new column instead of waiting 15 minutes.

### Step 3: filter, sort and paginate on the server

Filters, sort, page and "include all schools" live in the URL
(`parseBoardParams` / `boardQuery` in `lib/university-filters.ts`). The
page scores every school (about 9 ms), filters and sorts on the server, and
sends **one page of 24 cards**. Typing in search waits 300 ms after the
last keystroke before asking the server. `buildBoard()` has a test that it
never returns more than one page.

Why not filter in SQL? Sorting by match score needs every school scored,
and the scoring lives in TypeScript (`lib/matching.ts`). Filtering in SQL
would mean either duplicating the scoring in SQL or still fetching every
row to sort. Scoring the cached list takes about 9 ms, so the database
round trip is what to avoid, and the cache does that.

### Step 4: loading state and animations

- `app/(dashboard)/loading.tsx` shows a skeleton instantly while a page
  renders. Next.js streams it first, so "to first byte" is now ~50 ms
  everywhere and is no longer comparable with the before numbers; compare
  **total** time instead.
- Card animations were already capped (the stagger stops growing after
  the 8th card); with 24 cards per page that's fine. They now also respect
  the operating system's "reduce motion" setting.

## After

### After step 1 (same method, median of 5)

| Page | Before | After step 1 | Change |
| --- | --- | --- | --- |
| `/profile` | 798 ms | 279 ms | −65% |
| `/applications` | 803 ms | 305 ms | −62% |
| `/offers` | 1,053 ms | 554 ms | −47% |
| `/saved` | 1,070 ms | 565 ms | −47% |
| `/universities/[id]` | 1,085 ms | 551 ms | −49% |
| `/compare` (3 schools) | 1,326 ms | 802 ms | −40% |
| `/universities` (browse) | 2,124 ms | 1,627 ms | −23% |
| `/recommendations` | 2,106 ms | 1,619 ms | −23% |

(Time to first byte.) Every page got about 500 ms faster, which is the two
auth round trips removed. Browse and recommendations are still slow and
still 10 MB because steps 2–3 aren't done. A signed-out request to
`/profile` still lands on `/login`, so protection works as before.

### After steps 2–4, before migration 010 (interim, uncached)

Measured the same way, after one warm-up request. **Migration 010 hadn't
been run yet**, so `is_featured` was missing and the cache was skipped on
purpose: every request re-read ~1.5 MB of rows (one failed attempt with
`is_featured`, then two 1,000-row pages). These are the worst-case numbers.

| Page | Total before | Total after step 1 | Total now (uncached) | Page size before → now |
| --- | --- | --- | --- | --- |
| `/universities` | 2,228 ms | ~1,730 ms | 2,406 ms | 10,369 KB → **287 KB** |
| `/recommendations` | 2,220 ms | 1,721 ms | 2,318 ms | 10,360 KB → **299 KB** |
| `/universities?q=state&sort=tuition-asc&page=3` | — | — | 2,339 ms | 289 KB |
| `/compare` (3 schools) | 1,344 ms | 819 ms | 2,613 ms | 180 KB → 238 KB |
| `/saved` | 1,074 ms | 570 ms | 620 ms | 70 KB → 74 KB |
| `/profile` | 801 ms | 284 ms | 327 ms | 48 KB → 51 KB |

(The "after step 1" browse total is approximate: that run recorded time
to first byte, 1,627 ms, plus a similar download.)

What changed and what didn't, honestly:
- **Fixed:** browse and recommendations now include all **1,624** schools
  (not 1,000), and send **~36× less** (287 KB instead of 10 MB, 24 cards
  instead of 1,000).
- **Not faster yet:** total server time is about the same as before,
  because without the cache every visit downloads all 1,624 rows from
  Supabase. Compare got slower: its picker now uses the full list instead
  of a names-only query of the first 1,000.
- **Expected after migration 010:** the shared list comes from the cache,
  so these pages should only wait for the profile and saved-schools
  queries. To be measured, not assumed; see the next section.

## Reproducing

From a signed-in tab on the production server, in the browser console:

```js
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
async function time(path, runs = 5) {
  const ttfb = [], total = [];
  let bytes = 0;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const r = await fetch(path, { cache: "no-store" });
    const t1 = performance.now();
    bytes = (await r.arrayBuffer()).byteLength;
    ttfb.push(t1 - t0);
    total.push(performance.now() - t0);
  }
  return { path, ttfb: Math.round(median(ttfb)), total: Math.round(median(total)), kb: Math.round(bytes / 1024) };
}
await time("/universities");
```
