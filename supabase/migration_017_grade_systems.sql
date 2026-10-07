-- Unicelerate: grade systems on the profile.
-- gpa_percentage stays the number every comparison uses. These columns say
-- how it was obtained (lib/grades.ts): typed as a percentage, converted
-- from another system with that board's published table, or the student's
-- own nearest percentage (approximate). Safe to re-run.

alter table public.profiles add column if not exists grade_system text not null default 'percentage';
alter table public.profiles add column if not exists grade_input text;
alter table public.profiles add column if not exists grade_basis text not null default 'exact';

alter table public.profiles drop constraint if exists profiles_grade_system_check;
alter table public.profiles add constraint profiles_grade_system_check
  check (grade_system in ('percentage', 'cbse_cgpa', 'ib', 'cambridge_a_level', 'us_gpa', 'other'));

alter table public.profiles drop constraint if exists profiles_grade_basis_check;
alter table public.profiles add constraint profiles_grade_basis_check
  check (grade_basis in ('exact', 'converted', 'approximate'));

alter table public.profiles drop constraint if exists profiles_grade_input_length;
alter table public.profiles add constraint profiles_grade_input_length
  check (grade_input is null or length(grade_input) <= 100);

-- Check (should list the three columns):
--   select column_name, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name like 'grade_%';
