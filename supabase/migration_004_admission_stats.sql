-- Unicelerate migration 004 — admission stats and living costs
-- Run this once in the Supabase SQL Editor, after migration_003.
-- Safe to re-run: columns use "if not exists", checks are dropped and
-- re-added, and the backfill only touches rows that are still empty.
--
-- IMPORTANT: every figure below is an ILLUSTRATIVE APPROXIMATION for demo
-- purposes, loosely based on publicly reported ranges. These are not
-- official admissions statistics and shouldn't be used for real decisions.
--
--   avg_admitted_gpa      typical admitted GPA, on the app's 0-100 scale
--   sat_25 / sat_75       middle-50% SAT range. Only set for US schools; SAT
--                         ranges are a US convention, so elsewhere they stay
--                         null ("unknown") rather than being made up
--   min_ielts             minimum IELTS for international applicants
--   living_cost_per_year  rough yearly living cost in USD

alter table public.universities add column if not exists avg_admitted_gpa numeric;
alter table public.universities add column if not exists sat_25 integer;
alter table public.universities add column if not exists sat_75 integer;
alter table public.universities add column if not exists min_ielts numeric;
alter table public.universities add column if not exists living_cost_per_year numeric;

alter table public.universities drop constraint if exists universities_admission_stats_check;
alter table public.universities add constraint universities_admission_stats_check check (
  (avg_admitted_gpa is null or avg_admitted_gpa between 0 and 100)
  and (min_ielts is null or min_ielts between 0 and 9)
  and (living_cost_per_year is null or living_cost_per_year >= 0)
  -- Both SAT bounds or neither, and the 25th percentile can't exceed the 75th.
  -- The explicit "is not null" tests matter: a CHECK passes when its result
  -- is NULL, so comparing against a missing bound would let it through.
  and ((sat_25 is null and sat_75 is null)
       or (sat_25 is not null and sat_75 is not null
           and sat_25 between 400 and 1600 and sat_75 between 400 and 1600
           and sat_25 <= sat_75))
);

-- One row per seeded university, matched by name. Only fills rows whose
-- stats are still empty, so re-running won't overwrite later edits.
update public.universities u
set avg_admitted_gpa = v.gpa,
    sat_25 = v.sat_25,
    sat_75 = v.sat_75,
    min_ielts = v.ielts,
    living_cost_per_year = v.living
from (values
  ('Massachusetts Institute of Technology', 98, 1520, 1580, 7.0, 22000),
  ('University of Cambridge',               97, null, null, 7.5, 16000),
  ('University of Oxford',                  97, null, null, 7.0, 16000),
  ('Harvard University',                    98, 1500, 1580, 7.0, 22000),
  ('Stanford University',                   98, 1500, 1570, 7.0, 24000),
  ('ETH Zurich',                            90, null, null, 7.0, 25000),
  ('National University of Singapore',      95, null, null, 6.5, 12000),
  ('University of Toronto',                 92, null, null, 6.5, 16000),
  ('University of Melbourne',               90, null, null, 6.5, 17000),
  ('University of British Columbia',        90, null, null, 6.5, 16000),
  ('University of Sydney',                  89, null, null, 6.5, 18000),
  ('Technical University of Munich',        88, null, null, 6.5, 14000),
  ('LMU Munich',                            87, null, null, 6.5, 14000),
  ('University of Amsterdam',               85, null, null, 6.5, 15000),
  ('Delft University of Technology',        88, null, null, 6.5, 13000),
  ('University of Manchester',              86, null, null, 6.5, 13000),
  ('King''s College London',                90, null, null, 7.0, 19000),
  ('University of Edinburgh',               88, null, null, 6.5, 14000),
  ('McGill University',                     91, null, null, 6.5, 13000),
  ('University of Waterloo',                92, null, null, 6.5, 12000),
  ('Monash University',                     86, null, null, 6.5, 16000),
  ('University of Auckland',                84, null, null, 6.0, 15000),
  ('Trinity College Dublin',                87, null, null, 6.5, 15000),
  ('KTH Royal Institute of Technology',     87, null, null, 6.5, 13000),
  ('Arizona State University',              80, 1110, 1350, 6.0, 15000),
  ('University of Texas at Austin',         90, 1230, 1480, 6.5, 16000),
  ('Purdue University',                     87, 1190, 1430, 6.5, 13000)
) as v(name, gpa, sat_25, sat_75, ielts, living)
where u.name = v.name
  and u.avg_admitted_gpa is null;
