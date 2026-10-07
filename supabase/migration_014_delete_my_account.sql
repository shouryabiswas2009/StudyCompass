-- migration_014: let a signed-in student delete their own account and data.
--
-- Deleting a Supabase login normally needs the secret service-role key. This
-- avoids that key entirely: the function below runs with the database
-- owner's rights ("security definer") but can only ever delete the account
-- of whoever is calling it (auth.uid()), so it's safe to expose to the app.
--
-- Deleting the auth.users row removes everything that belongs to the student,
-- because every table references it with ON DELETE CASCADE:
--   profiles, saved_universities, applications, and universities they added.
-- Shared universities (College Scorecard, curated) are never touched.
--
-- Safe to run more than once.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
-- An empty search_path, so the function can't be tricked into using
-- someone else's table or function with the same name.
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'You must be signed in to delete your account.' using errcode = '28000';
  end if;
  delete from auth.users where id = caller;
end;
$$;

-- Only signed-in users may call it (not the public / anonymous role).
-- (The roles only exist on Supabase; the local test database skips this.)
revoke all on function public.delete_my_account() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.delete_my_account() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.delete_my_account() to authenticated';
  end if;
end;
$$;
