-- Unicelerate: "Report a wrong figure".
--
-- A signed-in student can report a figure on a shared university's page
-- that looks wrong. Students can add their own reports and read only their
-- own; nobody can change or delete them through the app. You review them
-- in the SQL Editor (it isn't subject to row level security):
--
--   -- Open reports, newest first
--   select r.created_at, u.name, r.field, r.current_value, r.suggested_value,
--          r.source_url, r.note, r.id
--   from public.figure_reports r
--   join public.universities u on u.id = r.university_id
--   where r.status = 'open'
--   order by r.created_at desc;
--
--   -- After checking one against its source
--   update public.figure_reports set status = 'fixed' where id = '<id>';    -- or 'rejected'
--
-- Reports go when the student deletes their account (cascade from
-- auth.users) or when the university row is deleted. Safe to re-run.

create table if not exists public.figure_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete cascade,
  field text not null check (field in (
    'tuition', 'living_cost', 'acceptance_rate', 'test_scores', 'graduation_outcomes',
    'research_impact', 'programs', 'degree_levels', 'coop', 'country_guidance', 'other'
  )),
  current_value text check (current_value is null or length(current_value) <= 200),
  suggested_value text check (suggested_value is null or length(suggested_value) <= 200),
  source_url text check (source_url is null or (length(source_url) <= 500 and source_url ~ '^https?://')),
  note text check (note is null or length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'fixed', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists figure_reports_user_id_idx on public.figure_reports (user_id);
create index if not exists figure_reports_open_idx on public.figure_reports (created_at) where status = 'open';

alter table public.figure_reports enable row level security;

drop policy if exists "Read your own reports" on public.figure_reports;
drop policy if exists "Add your own reports" on public.figure_reports;

create policy "Read your own reports"
  on public.figure_reports for select
  using (user_id = auth.uid());

-- Only about shared universities (a student edits their own school
-- directly), only as yourself, and only as a new, open report.
create policy "Add your own reports"
  on public.figure_reports for insert
  with check (
    user_id = auth.uid()
    and status = 'open'
    and exists (select 1 from public.universities u where u.id = university_id and u.created_by is null)
  );

-- No update or delete policies: with row level security on, students
-- can't change or remove reports.

-- Check (should be true, then list the two policies):
--   select relrowsecurity from pg_class where oid = 'public.figure_reports'::regclass;
--   select policyname from pg_policies where tablename = 'figure_reports';
