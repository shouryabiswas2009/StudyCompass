-- Unicelerate: "Visa and work rights" preferences on the profile
-- (lib/visa.ts). All nullable: null means "ignore", so nothing changes for
-- anyone who hasn't chosen. Row level security on profiles is unchanged
-- (students read and write only their own row). Safe to re-run.

alter table public.profiles
  add column if not exists visa_mode text,
  add column if not exists visa_weight text,
  add column if not exists stay_after text;

alter table public.profiles drop constraint if exists profiles_visa_mode_check;
alter table public.profiles add constraint profiles_visa_mode_check
  check (visa_mode is null or visa_mode in ('ignore', 'show', 'factor'));

alter table public.profiles drop constraint if exists profiles_visa_weight_check;
alter table public.profiles add constraint profiles_visa_weight_check
  check (visa_weight is null or visa_weight in ('low', 'medium', 'high'));

alter table public.profiles drop constraint if exists profiles_stay_after_check;
alter table public.profiles add constraint profiles_stay_after_check
  check (stay_after is null or stay_after in ('yes', 'unsure', 'no'));

-- Check (should list visa_mode, visa_weight, stay_after):
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name in ('visa_mode', 'visa_weight', 'stay_after');
