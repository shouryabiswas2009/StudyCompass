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
   - Copy `.env.local.example` to `.env.local` and fill in your project's
     URL and anon/publishable key (Project Settings → API in the dashboard).

3. (Optional, for faster local testing) In your Supabase dashboard, go to
   Authentication → Providers → Email and turn off "Confirm email" so new
   accounts can log in immediately without clicking a confirmation link.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  page.tsx                          # Landing page
  (auth)/login, (auth)/signup       # Auth pages
  (dashboard)/profile               # Student profile form
  (dashboard)/recommendations       # Matched universities
  (dashboard)/universities/[id]     # University details
  (dashboard)/compare               # Side-by-side comparison
  (dashboard)/saved                 # Bookmarked universities
  auth/callback                     # Supabase email confirmation redirect
components/
  landing/    # Hero, feature cards, CTA
  layout/     # Navbar, footer, theme toggle
  auth/       # Login/signup forms
  profile/    # Profile form
  universities/ # Cards, match badge, compare table, save button
  ui/         # shadcn/ui components
lib/
  supabase/   # Browser client, server client, session refresh helper
  actions/    # Server Actions (auth, profile, saved universities)
  matching.ts # Match score + explanation logic (no external API calls)
  types.ts    # Shared TypeScript types
proxy.ts      # Next.js 16's "Proxy" (renamed Middleware) — refreshes the
              # Supabase session and protects dashboard routes
supabase/
  seed.sql                          # Schema, RLS policies, and sample university data
  migration_002_richer_profiles.sql # Multi-select fields, budget range, subject rankings
```

## How matching works

`lib/matching.ts` scores each university 0–100 based on three factors versus
the student's profile: whether tuition fits their budget (up to 50 points),
whether the university is in one of their preferred countries (25 points),
and whether it offers one of their intended majors (25 points). The
explanation shown alongside each score is generated from the same factors
with plain string templates — no external AI API is called, so there's no
added cost or latency.

`getDisplayRanking()` shows the QS ranking for the specific program that
matched the student's major when we have that data (`program_rankings` on
the university), and falls back to the university-wide ranking labeled
"Overall" otherwise — so a ranking is never shown without saying what it's
actually ranking.

## Notes

- Row Level Security is enabled on all tables — profiles and saved
  universities are only readable/writable by their owner; the universities
  table is public read-only.
- Auth uses `@supabase/ssr` with cookie-based sessions shared between the
  browser, Server Components, and Server Actions.
