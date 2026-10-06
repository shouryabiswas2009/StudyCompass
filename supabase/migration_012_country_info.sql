-- migration_012: visa and post-study work guidance per destination country.
--
-- One row per country that has schools in the app. Three figures, each with
-- the government page it was copied from and the date it was checked:
--   * how long a graduate may stay after studying (post-study work / job search)
--   * how much money a student must prove (proof of funds)
--   * how many hours a student may work during term
-- A figure nobody verified on an official page stays null ("not available").
-- The rows are generated from data/curated/country_info.csv by
-- `npm run data:build-country-info` (supabase/seed_country_info.sql).
--
-- Safe to run more than once.

create table if not exists public.country_info (
  country text primary key,                 -- canonical name, as in lib/countries.ts

  post_study_text text,                     -- what the rule says, in plain words
  post_study_months integer check (post_study_months between 0 and 120),
  post_study_source_url text,
  post_study_checked_on date,

  funds_text text,
  funds_amount numeric check (funds_amount >= 0),
  funds_currency text check (funds_currency ~ '^[A-Z]{3}$'),
  funds_period text check (funds_period in ('month', 'year')),
  funds_source_url text,
  funds_checked_on date,

  work_text text,
  work_hours_per_week numeric check (work_hours_per_week between 0 and 60),
  work_source_url text,
  work_checked_on date,

  notes text,
  updated_at timestamptz not null default now(),

  -- A figure always comes with its page and the date it was checked.
  constraint country_info_post_study_sourced check (
    (post_study_text is null and post_study_months is null)
    or (post_study_source_url is not null and post_study_checked_on is not null)
  ),
  constraint country_info_funds_sourced check (
    (funds_text is null and funds_amount is null)
    or (funds_source_url is not null and funds_checked_on is not null)
  ),
  constraint country_info_funds_currency check (funds_amount is null or (funds_currency is not null and funds_period is not null)),
  constraint country_info_work_sourced check (
    (work_text is null and work_hours_per_week is null)
    or (work_source_url is not null and work_checked_on is not null)
  )
);

-- Row level security stays on. Anyone may read (it's public guidance); there
-- are no insert/update/delete policies, so only the SQL Editor can change it.
alter table public.country_info enable row level security;

drop policy if exists "Country info is readable by everyone" on public.country_info;
create policy "Country info is readable by everyone"
  on public.country_info for select
  using (true);
