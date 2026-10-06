-- StudyCompass migration 006 — application tracker and offers
-- Run this once in the Supabase SQL Editor, after migration_005.
-- Safe to re-run: "if not exists" / "drop ... if exists" throughout.
--
-- One row per university a student is applying to. It works as both the
-- application tracker (status, deadline, notes) and, once the status is
-- "admitted", the record of the offer (tuition, scholarship, living cost,
-- program length) that the offers page ranks.

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- If a student deletes a university they added, its application goes too.
  university_id uuid not null references public.universities (id) on delete cascade,
  status text not null default 'planning',
  program text not null default '',
  deadline date,
  tuition_per_year numeric,
  scholarship_per_year numeric not null default 0,
  living_cost_per_year numeric,
  duration_years numeric not null default 4,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One entry per school keeps the tracker simple. (Applying to two
  -- programs at one school isn't modeled yet.)
  unique (user_id, university_id)
);

-- Checks mirror lib/application-validation.ts.
alter table public.applications drop constraint if exists applications_values_check;
alter table public.applications add constraint applications_values_check check (
  status in ('planning', 'applied', 'admitted', 'waitlisted', 'rejected', 'accepted')
  and (tuition_per_year is null or tuition_per_year >= 0)
  and scholarship_per_year >= 0
  and (living_cost_per_year is null or living_cost_per_year >= 0)
  and duration_years > 0 and duration_years <= 10
  and char_length(program) <= 200
  and char_length(notes) <= 2000
);

create index if not exists applications_user_id_idx on public.applications (user_id);

-- Keep updated_at current (set_updated_at() was created in seed.sql).
drop trigger if exists set_applications_updated_at on public.applications;
create trigger set_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- Owner-only, like profiles and saved_universities.
alter table public.applications enable row level security;

drop policy if exists "Read your own applications" on public.applications;
drop policy if exists "Add your own applications" on public.applications;
drop policy if exists "Edit your own applications" on public.applications;
drop policy if exists "Delete your own applications" on public.applications;

create policy "Read your own applications"
  on public.applications for select
  using (user_id = auth.uid());

-- The "exists" part: a foreign key check ignores RLS, so without it a
-- student could attach an application to another student's private
-- university if they knew its id. The subquery runs with the student's own
-- permissions, so it only finds universities they're allowed to see.
create policy "Add your own applications"
  on public.applications for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.universities u where u.id = university_id)
  );

create policy "Edit your own applications"
  on public.applications for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.universities u where u.id = university_id)
  );

create policy "Delete your own applications"
  on public.applications for delete
  using (user_id = auth.uid());
