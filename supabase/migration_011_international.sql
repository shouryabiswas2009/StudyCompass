-- StudyCompass migration 011 — curated international universities
-- Run this once in the Supabase SQL Editor, after migration_010, and BEFORE
-- the files in supabase/seed_international/. Safe to re-run.

-- ─── A new source label: 'curated' ─────────────────────────────────────────
-- Figures checked by hand against each university's own website, with the
-- page linked. Shown as "Source: <university site>", never as "official".
-- Students still can't label their own rows as anything but 'user-entered'.
alter table public.universities drop constraint if exists universities_source_check;
alter table public.universities add constraint universities_source_check check (
  source in ('College Scorecard', 'curated', 'illustrative', 'user-entered')
  and ((created_by is null) = (source <> 'user-entered'))
  and (ownership is null or ownership in ('public', 'private nonprofit', 'private for-profit'))
  and (completion_rate is null or completion_rate between 0 and 100)
  and (source_url is null or source_url ~ '^https?://')
);

-- ─── Unknown is allowed ────────────────────────────────────────────────────
-- Most universities outside the US publish no admission rate, and some fees
-- can't be verified. Null means "not available"; the app leaves it out of
-- the score instead of inventing a number.
alter table public.universities alter column tuition drop not null;
alter table public.universities alter column acceptance_rate drop not null;

-- ─── Money in its own currency ─────────────────────────────────────────────
-- tuition / living_cost_per_year stay in US dollars (what scoring compares);
-- for a curated row they're converted from the local amount at the ECB rate
-- of fx_rate_date, and the UI labels them "approximate".
alter table public.universities add column if not exists tuition_local numeric;
alter table public.universities add column if not exists tuition_currency text;
alter table public.universities add column if not exists tuition_basis text;      -- exactly what the figure is
alter table public.universities add column if not exists tuition_year text;       -- e.g. '2025-26'
alter table public.universities add column if not exists tuition_source_url text;
alter table public.universities add column if not exists living_cost_local numeric;
alter table public.universities add column if not exists living_cost_currency text;
alter table public.universities add column if not exists living_cost_source_url text;
alter table public.universities add column if not exists fx_rate_date date;
alter table public.universities add column if not exists acceptance_source_url text;
alter table public.universities add column if not exists programs_source_url text;

-- A stable key for curated rows (like scorecard_id for US rows), so
-- re-running the import updates instead of duplicating.
alter table public.universities add column if not exists curated_id text;
create unique index if not exists universities_curated_id_key on public.universities (curated_id);

alter table public.universities drop constraint if exists universities_money_check;
alter table public.universities add constraint universities_money_check check (
  (tuition_currency is null or tuition_currency ~ '^[A-Z]{3}$')
  and (living_cost_currency is null or living_cost_currency ~ '^[A-Z]{3}$')
  and (tuition_local is null or tuition_local >= 0)
  and (living_cost_local is null or living_cost_local >= 0)
  and (tuition_source_url is null or tuition_source_url ~ '^https?://')
  and (living_cost_source_url is null or living_cost_source_url ~ '^https?://')
  and (acceptance_source_url is null or acceptance_source_url ~ '^https?://')
  and (programs_source_url is null or programs_source_url ~ '^https?://')
);

-- ─── Search: other names, and accents ──────────────────────────────────────
-- aliases: short or other names people search for (MIT, UCL, ETH, LSE, ...).
alter table public.universities add column if not exists aliases text[] not null default '{}';

-- unaccent turns "Montréal" into "Montreal"; pg_trgm makes "contains"
-- searches (ilike '%text%') use an index instead of reading every row.
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() and array_to_string() aren't marked immutable (unaccent's
-- dictionary could change; array_to_string works on any element type), so
-- Postgres won't use them in a generated column directly. This wrapper pins
-- the dictionary and only takes text, which makes it safe to mark immutable.
drop function if exists public.search_normalize(text);
create or replace function public.search_normalize(name text, aliases text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent(
    'extensions.unaccent'::regdictionary,
    coalesce(name, '') || ' ' || coalesce(array_to_string(aliases, ' '), '')
  ))
$$;

-- Name plus aliases, lower-case, without accents: what search matches on.
alter table public.universities add column if not exists search_text text
  generated always as (public.search_normalize(name, aliases)) stored;

create index if not exists universities_search_text_trgm
  on public.universities using gin (search_text extensions.gin_trgm_ops);
