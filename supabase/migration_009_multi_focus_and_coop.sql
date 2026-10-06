-- Unicelerate migration 009 — multi-select focus + co-op programs
-- Run this once in the Supabase SQL Editor, after migration_008.
-- Safe to re-run: every step checks before it changes anything.

-- ─── Profiles: several focuses instead of one ──────────────────────────────
-- focuses = the "what matters most to me" options a student ticked. Empty
-- means Balanced (nothing ticked).
alter table public.profiles add column if not exists focuses text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_focuses_check;
alter table public.profiles add constraint profiles_focuses_check check (
  focuses <@ array['academic', 'work_experience', 'research', 'affordability']::text[]
);

-- Copy each student's old single choice into the new list, then retire the
-- old column. Wrapped in "if the old column still exists", so a second run
-- does nothing (and can't overwrite a choice made after the first run).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'primary_focus'
  ) then
    update public.profiles
      set focuses = array[primary_focus]
      where primary_focus <> 'balanced' and focuses = '{}';
    alter table public.profiles drop column primary_focus; -- its check constraint goes with it
  end if;
end $$;

-- ─── Universities: co-op / internship programs ─────────────────────────────
-- "Work experience" means co-op and internship opportunities, so the app
-- needs more than yes/no:
--   mandatory  every student does a co-op / work placement
--   optional   the school runs one, students can choose it
--   none       the school says it has none
--   unknown    we haven't found a clear official statement (the default)
-- Only ever filled from the school's own page, with that page's URL.
alter table public.universities add column if not exists coop_program text not null default 'unknown';
alter table public.universities add column if not exists internship_support_url text;

alter table public.universities drop constraint if exists universities_coop_check;
alter table public.universities add constraint universities_coop_check check (
  coop_program in ('mandatory', 'optional', 'none', 'unknown')
  and (internship_support_url is null or internship_support_url ~ '^https?://')
);

-- Carry over the yes/no answers students gave on schools they added (from
-- migration_008), then retire has_coop. A plain "yes" doesn't say whether
-- the program is mandatory, so it becomes 'optional', the lower credit;
-- "no" becomes 'none'. Same re-run guard as above.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'universities' and column_name = 'has_coop'
  ) then
    update public.universities
      set coop_program = case when has_coop then 'optional' else 'none' end
      where has_coop is not null and coop_program = 'unknown';
    alter table public.universities drop column has_coop;
  end if;
end $$;
