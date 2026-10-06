-- StudyCompass migration 003 — SAT score, input checks, degree levels
-- Run this once in the Supabase SQL Editor, after migration_002.
-- Safe to re-run: columns use "if not exists" and each check constraint is
-- dropped before being re-added.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: SAT score + checks that mirror lib/profile-validation.ts.
-- The form already validates these; the database checks are a second line
-- of defence so bad values can't get in through any other route.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists sat_score integer;

alter table public.profiles drop constraint if exists profiles_sat_score_check;
alter table public.profiles add constraint profiles_sat_score_check
  check (sat_score is null or (sat_score between 400 and 1600 and sat_score % 10 = 0));

alter table public.profiles drop constraint if exists profiles_ielts_score_check;
alter table public.profiles add constraint profiles_ielts_score_check
  check (ielts_score is null or (ielts_score between 0 and 9 and ielts_score * 2 = floor(ielts_score * 2)));

alter table public.profiles drop constraint if exists profiles_gpa_percentage_check;
alter table public.profiles add constraint profiles_gpa_percentage_check
  check (gpa_percentage between 0 and 100);

alter table public.profiles drop constraint if exists profiles_budget_check;
alter table public.profiles add constraint profiles_budget_check
  check (budget_min >= 0 and budget_max >= budget_min);

alter table public.profiles drop constraint if exists profiles_degree_level_check;
alter table public.profiles add constraint profiles_degree_level_check
  check (preferred_degree_level in ('Undergraduate', 'Masters', 'PhD'));

-- ─────────────────────────────────────────────────────────────────────────
-- universities: which degree levels each school offers. An empty list
-- means "unknown" and the app doesn't rule the school out.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.universities add column if not exists degree_levels text[] not null default '{}';

alter table public.universities drop constraint if exists universities_degree_levels_check;
alter table public.universities add constraint universities_degree_levels_check
  check (degree_levels <@ array['Undergraduate', 'Masters', 'PhD']);

-- All 27 seeded schools are large research universities that award
-- bachelor's, master's and doctoral degrees. Only fills rows that haven't
-- been set yet, so re-running this won't overwrite later edits.
update public.universities
  set degree_levels = array['Undergraduate', 'Masters', 'PhD']
  where degree_levels = '{}';
