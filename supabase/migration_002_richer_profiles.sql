-- Unicelerate migration 002 — richer profiles + subject-specific rankings
-- Run this once in your Supabase project's SQL Editor, after supabase/seed.sql.
--
-- What changes:
--   profiles.preferred_country (text)  -> preferred_countries (text[])
--   profiles.intended_major (text)     -> intended_majors (text[])
--   profiles.budget (numeric)          -> budget_min + budget_max (numeric)
--   universities gets a new program_rankings (jsonb) column — a per-subject
--   QS-style ranking (e.g. {"Computer Science": 5}) so recommendations can
--   show a ranking specific to the student's major instead of only the
--   university-wide one.
--
-- Existing test profile data will be lost when the old columns are dropped —
-- that's expected, this project only ever had test accounts.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: single values → arrays / range
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists preferred_countries text[] not null default '{}';
alter table public.profiles add column if not exists intended_majors text[] not null default '{}';
alter table public.profiles add column if not exists budget_min numeric not null default 0;
alter table public.profiles add column if not exists budget_max numeric;

update public.profiles set budget_max = budget where budget_max is null and budget is not null;
alter table public.profiles alter column budget_max set not null;

alter table public.profiles drop column if exists preferred_country;
alter table public.profiles drop column if exists intended_major;
alter table public.profiles drop column if exists budget;

-- ─────────────────────────────────────────────────────────────────────────
-- universities: add per-subject rankings
-- ─────────────────────────────────────────────────────────────────────────
alter table public.universities add column if not exists program_rankings jsonb not null default '{}';

update public.universities set program_rankings = '{"Computer Science": 1, "Engineering": 1, "Physics": 1, "Data Science": 1}'::jsonb where name = 'Massachusetts Institute of Technology';
update public.universities set program_rankings = '{"Natural Sciences": 3, "Engineering": 5, "Economics": 4, "Law": 3}'::jsonb where name = 'University of Cambridge';
update public.universities set program_rankings = '{"Philosophy Politics and Economics": 1, "Medicine": 4, "Law": 1, "Computer Science": 8}'::jsonb where name = 'University of Oxford';
update public.universities set program_rankings = '{"Business": 3, "Law": 1, "Medicine": 2, "Computer Science": 12}'::jsonb where name = 'Harvard University';
update public.universities set program_rankings = '{"Computer Science": 2, "Engineering": 3, "Business": 5, "Data Science": 2}'::jsonb where name = 'Stanford University';
update public.universities set program_rankings = '{"Engineering": 6, "Computer Science": 9, "Architecture": 5, "Physics": 8}'::jsonb where name = 'ETH Zurich';
update public.universities set program_rankings = '{"Computer Science": 7, "Business": 11, "Engineering": 9, "Data Science": 10}'::jsonb where name = 'National University of Singapore';
update public.universities set program_rankings = '{"Computer Science": 18, "Business": 25, "Engineering": 22, "Life Sciences": 15}'::jsonb where name = 'University of Toronto';
update public.universities set program_rankings = '{"Business": 20, "Medicine": 16, "Arts": 12, "Law": 14}'::jsonb where name = 'University of Melbourne';
update public.universities set program_rankings = '{"Computer Science": 30, "Business": 45, "Environmental Science": 12, "Engineering": 35}'::jsonb where name = 'University of British Columbia';
update public.universities set program_rankings = '{"Business": 22, "Engineering": 27, "Medicine": 18, "Arts": 20}'::jsonb where name = 'University of Sydney';
update public.universities set program_rankings = '{"Engineering": 12, "Computer Science": 25, "Physics": 20, "Data Science": 22}'::jsonb where name = 'Technical University of Munich';
update public.universities set program_rankings = '{"Medicine": 30, "Law": 40, "Business": 60, "Natural Sciences": 45}'::jsonb where name = 'LMU Munich';
update public.universities set program_rankings = '{"Business": 48, "Social Sciences": 20, "Computer Science": 60, "Economics": 35}'::jsonb where name = 'University of Amsterdam';
update public.universities set program_rankings = '{"Engineering": 15, "Computer Science": 20, "Architecture": 5, "Data Science": 18}'::jsonb where name = 'Delft University of Technology';
update public.universities set program_rankings = '{"Business": 35, "Engineering": 30, "Computer Science": 40, "Social Sciences": 25}'::jsonb where name = 'University of Manchester';
update public.universities set program_rankings = '{"Law": 15, "Medicine": 20, "International Relations": 10, "Business": 45}'::jsonb where name = 'King''s College London';
update public.universities set program_rankings = '{"Business": 30, "Computer Science": 25, "Medicine": 22, "Arts": 18}'::jsonb where name = 'University of Edinburgh';
update public.universities set program_rankings = '{"Medicine": 25, "Business": 32, "Engineering": 40, "Arts": 20}'::jsonb where name = 'McGill University';
update public.universities set program_rankings = '{"Computer Science": 15, "Engineering": 25, "Mathematics": 10, "Data Science": 20}'::jsonb where name = 'University of Waterloo';
update public.universities set program_rankings = '{"Business": 40, "Engineering": 45, "Pharmacy": 5, "Medicine": 38}'::jsonb where name = 'Monash University';
update public.universities set program_rankings = '{"Business": 55, "Engineering": 60, "Arts": 50, "Medicine": 45}'::jsonb where name = 'University of Auckland';
update public.universities set program_rankings = '{"Business": 65, "Computer Science": 70, "Law": 55, "Arts": 60}'::jsonb where name = 'Trinity College Dublin';
update public.universities set program_rankings = '{"Engineering": 35, "Computer Science": 45, "Architecture": 30, "Data Science": 40}'::jsonb where name = 'KTH Royal Institute of Technology';
update public.universities set program_rankings = '{"Business": 90, "Computer Science": 120, "Engineering": 100, "Journalism": 15}'::jsonb where name = 'Arizona State University';
update public.universities set program_rankings = '{"Computer Science": 35, "Business": 30, "Engineering": 28, "Data Science": 32}'::jsonb where name = 'University of Texas at Austin';
update public.universities set program_rankings = '{"Engineering": 10, "Computer Science": 45, "Aviation": 5, "Business": 90}'::jsonb where name = 'Purdue University';
