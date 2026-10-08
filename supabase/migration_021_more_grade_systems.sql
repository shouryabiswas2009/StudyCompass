-- Unicelerate: more grade systems on the profile (Canadian provinces, AP,
-- ATAR; see lib/grades.ts and docs/GRADE-SYSTEMS-CONSIDERED.md).
-- migration_017 only allowed the first six keys; this widens the list.
-- Existing values are unchanged. Safe to re-run.

alter table public.profiles drop constraint if exists profiles_grade_system_check;
alter table public.profiles add constraint profiles_grade_system_check
  check (grade_system in (
    'percentage',
    'cbse_cgpa',
    'ib',
    'cambridge_a_level',
    'us_gpa',
    'other',
    'ca_ontario',
    'ca_british_columbia',
    'ca_alberta',
    'ca_manitoba',
    'ca_saskatchewan',
    'ca_nova_scotia',
    'ca_new_brunswick',
    'ca_newfoundland',
    'ca_pei',
    'ca_quebec',
    'ap',
    'au_atar'
  ));

-- Check (should return 1 row, the constraint):
--   select conname from pg_constraint where conname = 'profiles_grade_system_check';
