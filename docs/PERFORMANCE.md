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

**Not done yet** (planned next, after the data phases): load all rows
instead of the capped 1,000, cache the shared list, and filter, sort and
paginate on the server so only one page of cards is sent.

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
