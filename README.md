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

5. Run the unit tests (Vitest; covers the matching logic and profile
   validation):

   ```bash
   npm test
   ```

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
  (dashboard)/saved                 # Bookmarked universities
  auth/callback, auth/confirm       # Supabase email link handlers
components/
  landing/    # Hero, feature cards, CTA
  layout/     # Navbar, footer, theme toggle
  auth/       # Login/signup forms
  profile/    # Profile form
  universities/ # Cards, board (search/filter/sort), fit breakdown, forms
  ui/         # shadcn/ui components
lib/
  supabase/   # Browser client, server client, session refresh helper
  actions/    # Server Actions (auth, profile, saved, universities)
  matching.ts # Match score, breakdown, Reach/Match/Safety, explanations
  university-filters.ts # Search/filter/sort rules for the university board
  *-validation.ts       # Form validation (profile, university)
  types.ts    # Shared TypeScript types
  *.test.ts   # Vitest unit tests
proxy.ts      # Next.js 16's "Proxy" (renamed Middleware) — refreshes the
              # Supabase session and protects dashboard routes
supabase/
  seed.sql                          # Schema, RLS policies, and sample university data
  migration_002_richer_profiles.sql # Multi-select fields, budget range, subject rankings
  migration_003_scores_and_degree_levels.sql # SAT score, input checks, degree levels
  migration_004_admission_stats.sql # Illustrative admit GPA, SAT range, IELTS, living cost
  migration_005_browse_and_custom_universities.sql # Student-added schools + RLS, 34 more schools
```

## How matching works

`lib/matching.ts` scores each university 0–100 from six factors. The weights
live in one `WEIGHTS` object at the top of the file and add up to 100:

| Factor | Points | How it's judged |
| --- | --- | --- |
| Budget | 30 | Full points if tuition ≤ your max budget, losing points in proportion to how far over it is |
| Major | 20 | One of your intended majors is among the school's popular programs |
| Academic fit | 20 | Your GPA vs. the typical admitted GPA, and your SAT vs. the middle-50% range (averaged when both are known) |
| Country | 15 | The school is in one of your preferred countries |
| English | 10 | Your IELTS vs. the school's minimum |
| Acceptance rate | 5 | Higher acceptance rate, more points |

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

## Notes

- Row Level Security is enabled on all tables. Profiles and saved
  universities are only readable/writable by their owner. A university row
  is readable if it's shared seed data (`created_by is null`) or you added
  it (`created_by = auth.uid()`), and only its creator can edit or delete
  it. Because every page reads the same `universities` table, a school a
  student adds shows up (and is scored) everywhere in their account
  without any extra code.
- Universities without a known ranking show as "Unranked" rather than a
  made-up number, and sort last when sorting by ranking.
- Auth uses `@supabase/ssr` with cookie-based sessions shared between the
  browser, Server Components, and Server Actions.
