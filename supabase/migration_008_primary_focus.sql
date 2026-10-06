-- StudyCompass migration 008 — "what matters most to me" + the signals it uses
-- Run this once in the Supabase SQL Editor, after migration_007 and BEFORE
-- the files in supabase/seed_scorecard/ (they fill in the new columns).
-- Safe to re-run: "if not exists" / "drop ... if exists" throughout.

-- ─── Profiles: the student's primary focus ─────────────────────────────────
-- Changes how universities are scored (lib/matching.ts) and the default
-- offer-ranking weights (lib/offers.ts). Existing profiles become 'balanced',
-- which scores exactly as before this migration.
alter table public.profiles add column if not exists primary_focus text not null default 'balanced';

alter table public.profiles drop constraint if exists profiles_primary_focus_check;
alter table public.profiles add constraint profiles_primary_focus_check check (
  primary_focus in ('balanced', 'academic', 'work_experience', 'research', 'affordability')
);

-- ─── Universities: signals the focuses use ─────────────────────────────────
-- All nullable: null means "not available", never "no".

-- Carnegie Classification research activity. Official for College Scorecard
-- rows (school.carnegie_basic); a student can set it on schools they add.
alter table public.universities add column if not exists research_intensity text;

-- Share of first-year students who return for a second year (%). Official
-- for College Scorecard rows only.
alter table public.universities add column if not exists retention_rate numeric;

-- Whether the school runs a co-op / internship program. No official source
-- publishes this for every school, so the import never sets it: only a
-- student can, on a school they added (labeled "user-entered").
alter table public.universities add column if not exists has_coop boolean;

alter table public.universities drop constraint if exists universities_focus_signals_check;
alter table public.universities add constraint universities_focus_signals_check check (
  (research_intensity is null
    or research_intensity in ('very_high', 'high', 'doctoral_professional', 'non_doctoral'))
  and (retention_rate is null or retention_rate between 0 and 100)
);
