-- StudyCompass migration 007 — data provenance + official College Scorecard fields
-- Run this once in the Supabase SQL Editor, after migration_006, and BEFORE
-- the files in supabase/seed_scorecard/.
-- Safe to re-run: "if not exists" / "drop ... if exists" throughout.
--
-- Every university row now says where its figures come from:
--   'College Scorecard'  official US Department of Education data
--   'illustrative'       the hand-written sample data (not official numbers)
--   'user-entered'       a school a student added themselves

alter table public.universities add column if not exists source text not null default 'illustrative';
alter table public.universities add column if not exists data_year text;          -- Scorecard's own year label, e.g. '2024'
alter table public.universities add column if not exists fetched_at timestamptz;
alter table public.universities add column if not exists source_url text;         -- optional link for user-entered figures
alter table public.universities add column if not exists scorecard_id integer;    -- Scorecard / IPEDS unit id

-- Official Scorecard fields (null for schools without official data).
alter table public.universities add column if not exists city text;
alter table public.universities add column if not exists state text;
alter table public.universities add column if not exists ownership text;
alter table public.universities add column if not exists us_region text;
alter table public.universities add column if not exists tuition_in_state numeric;
alter table public.universities add column if not exists avg_net_price numeric;
alter table public.universities add column if not exists student_size integer;
alter table public.universities add column if not exists completion_rate numeric; -- % finishing within 150% of normal time
alter table public.universities add column if not exists median_earnings_10yr numeric;

-- One row per Scorecard school, so re-running the import updates instead of
-- duplicating. (Postgres allows any number of NULLs in a unique column.)
create unique index if not exists universities_scorecard_id_key on public.universities (scorecard_id);

-- Rows students added are user-entered; the label is enforced, not trusted.
update public.universities set source = 'user-entered' where created_by is not null;

alter table public.universities drop constraint if exists universities_source_check;
alter table public.universities add constraint universities_source_check check (
  source in ('College Scorecard', 'illustrative', 'user-entered')
  -- A student's own row is always 'user-entered', and a shared row never
  -- is, so nobody can label their own figures "official".
  and ((created_by is null) = (source <> 'user-entered'))
  and (ownership is null or ownership in ('public', 'private nonprofit', 'private for-profit'))
  and (completion_rate is null or completion_rate between 0 and 100)
  and (source_url is null or source_url ~ '^https?://')
);
