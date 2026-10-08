-- Unicelerate strength index: our own labelled estimate (0-100) of how
-- strong each shared university is, from open data. Computed at import time
-- by scripts/strength/build.mjs and loaded by supabase/seed_strength/*.sql;
-- the site only reads it. How it works: docs/STRENGTH-INDEX.md.
--
-- Also removes the illustrative sample rankings that 14 College Scorecard
-- schools still carried from the original demo data (MIT "#1", Harvard
-- "#4", …). They were never verified and were showing on cards as if real.
--
-- Safe to re-run.

alter table public.universities
  add column if not exists strength_index numeric(4, 1),
  add column if not exists strength_low numeric(4, 1),
  add column if not exists strength_high numeric(4, 1),
  add column if not exists strength_tier text,
  add column if not exists strength_confidence text,
  add column if not exists strength_is_estimate boolean,
  add column if not exists strength_position integer,
  add column if not exists strength_signals jsonb;

alter table public.universities drop constraint if exists universities_strength_check;
alter table public.universities add constraint universities_strength_check check (
  strength_index is null
  or (
    created_by is null -- only shared schools; a student's own school has none
    and strength_index between 0 and 100
    and strength_tier in ('A', 'B', 'C', 'D', 'E')
    and strength_confidence in ('High', 'Medium', 'Low')
    and strength_is_estimate is not null
    and strength_position > 0
    and strength_signals is not null
    -- an estimate is always a range
    and (not strength_is_estimate or (strength_low is not null and strength_high is not null and strength_low <= strength_high))
  )
);

update public.universities
set qs_ranking = null, program_rankings = '{}'::jsonb
where created_by is null
  and source = 'College Scorecard'
  and (qs_ranking is not null or program_rankings <> '{}'::jsonb);

-- Check after running seed_strength/*.sql (should be 1688, 15, 0):
--   select count(*) filter (where strength_index is not null),
--          count(*) filter (where strength_is_estimate),
--          count(*) filter (where qs_ranking is not null and source = 'College Scorecard')
--   from public.universities where created_by is null;
