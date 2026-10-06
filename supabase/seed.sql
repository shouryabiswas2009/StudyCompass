-- StudyCompass database setup
-- Run this once in your Supabase project's SQL Editor (Dashboard > SQL Editor > New query).
-- It creates the tables, locks them down with Row Level Security (RLS), and
-- seeds a sample list of universities so recommendations have data to work with.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. profiles — one row per user, holds the student's academic profile
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  country text not null,
  intended_major text not null,
  gpa_percentage numeric not null,
  ielts_score numeric,
  budget numeric not null,
  preferred_country text not null,
  preferred_degree_level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Keep updated_at current whenever a profile row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. universities — public reference data, the same for every user
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  tuition numeric not null, -- annual tuition in USD
  qs_ranking integer not null,
  acceptance_rate numeric not null, -- percentage, e.g. 12.5
  popular_programs text[] not null default '{}',
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.universities enable row level security;

create policy "Universities are viewable by everyone"
  on public.universities for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. saved_universities — join table for bookmarks
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.saved_universities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, university_id)
);

alter table public.saved_universities enable row level security;

create policy "Users can view their own saved universities"
  on public.saved_universities for select
  using (auth.uid() = user_id);

create policy "Users can save universities for themselves"
  on public.saved_universities for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own saved universities"
  on public.saved_universities for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Seed data — ~27 sample universities across several countries
-- ─────────────────────────────────────────────────────────────────────────
insert into public.universities
  (name, country, tuition, qs_ranking, acceptance_rate, popular_programs, description)
values
  ('Massachusetts Institute of Technology', 'United States', 57986, 1, 4, '{Computer Science,Engineering,Physics,Data Science}', 'A world leader in science and technology, known for rigorous engineering and research programs.'),
  ('University of Cambridge', 'United Kingdom', 45000, 2, 21, '{Natural Sciences,Engineering,Economics,Law}', 'One of the oldest universities in the world, renowned for research across nearly every discipline.'),
  ('University of Oxford', 'United Kingdom', 44000, 3, 17, '{Philosophy Politics and Economics,Medicine,Law,Computer Science}', 'A historic collegiate university with strengths across humanities, sciences, and law.'),
  ('Harvard University', 'United States', 56550, 4, 3, '{Business,Law,Medicine,Computer Science}', 'An Ivy League university with standout programs in business, law, and medicine.'),
  ('Stanford University', 'United States', 62484, 5, 4, '{Computer Science,Engineering,Business,Data Science}', 'Located in Silicon Valley, Stanford is a hub for technology, entrepreneurship, and research.'),
  ('ETH Zurich', 'Switzerland', 1500, 7, 27, '{Engineering,Computer Science,Architecture,Physics}', 'A top European technical university with low tuition and strong engineering programs.'),
  ('National University of Singapore', 'Singapore', 29000, 8, 5, '{Computer Science,Business,Engineering,Data Science}', 'Asia''s leading university, known for strong industry ties and a global outlook.'),
  ('University of Toronto', 'Canada', 45000, 21, 43, '{Computer Science,Business,Engineering,Life Sciences}', 'Canada''s top-ranked university, with a large research output and diverse programs.'),
  ('University of Melbourne', 'Australia', 38000, 14, 70, '{Business,Medicine,Arts,Law}', 'Australia''s leading university, offering a broad range of undergraduate and graduate degrees.'),
  ('University of British Columbia', 'Canada', 40000, 34, 52, '{Computer Science,Business,Environmental Science,Engineering}', 'A research-intensive university on Canada''s west coast with strong environmental programs.'),
  ('University of Sydney', 'Australia', 39000, 19, 30, '{Business,Engineering,Medicine,Arts}', 'One of Australia''s oldest universities, with a strong reputation across many fields.'),
  ('Technical University of Munich', 'Germany', 3000, 28, 8, '{Engineering,Computer Science,Physics,Data Science}', 'Germany''s top technical university, offering very low tuition for a world-class engineering education.'),
  ('LMU Munich', 'Germany', 2500, 54, 20, '{Medicine,Law,Business,Natural Sciences}', 'A leading German research university with affordable tuition and strong medical programs.'),
  ('University of Amsterdam', 'Netherlands', 15000, 55, 44, '{Business,Social Sciences,Computer Science,Economics}', 'A major European university known for social sciences, business, and a highly international student body.'),
  ('Delft University of Technology', 'Netherlands', 18000, 47, 27, '{Engineering,Computer Science,Architecture,Data Science}', 'The Netherlands'' top technical university, specializing in engineering and design.'),
  ('University of Manchester', 'United Kingdom', 32000, 32, 56, '{Business,Engineering,Computer Science,Social Sciences}', 'A large research university in the UK with a broad range of well-regarded programs.'),
  ('King''s College London', 'United Kingdom', 34000, 40, 13, '{Law,Medicine,International Relations,Business}', 'A central London university known for law, medicine, and international relations.'),
  ('University of Edinburgh', 'United Kingdom', 35000, 27, 40, '{Business,Computer Science,Medicine,Arts}', 'A historic Scottish university with strong research output and a lively student city.'),
  ('McGill University', 'Canada', 32000, 30, 46, '{Medicine,Business,Engineering,Arts}', 'A prestigious Canadian university known for medicine and a strong international reputation.'),
  ('University of Waterloo', 'Canada', 42000, 112, 53, '{Computer Science,Engineering,Mathematics,Data Science}', 'Renowned for co-op programs and one of the strongest computer science schools in Canada.'),
  ('Monash University', 'Australia', 37000, 42, 40, '{Business,Engineering,Pharmacy,Medicine}', 'Australia''s largest university, with a strong focus on pharmacy and engineering.'),
  ('University of Auckland', 'New Zealand', 30000, 68, 60, '{Business,Engineering,Arts,Medicine}', 'New Zealand''s top-ranked university, offering a wide range of programs in a relaxed setting.'),
  ('Trinity College Dublin', 'Ireland', 23000, 81, 30, '{Business,Computer Science,Law,Arts}', 'Ireland''s oldest university, with a historic campus in the heart of Dublin.'),
  ('KTH Royal Institute of Technology', 'Sweden', 18000, 87, 25, '{Engineering,Computer Science,Architecture,Data Science}', 'Sweden''s largest technical university, with strong ties to industry and research.'),
  ('Arizona State University', 'United States', 29000, 213, 88, '{Business,Computer Science,Engineering,Journalism}', 'A large, innovation-focused US university known for accessibility and flexible programs.'),
  ('University of Texas at Austin', 'United States', 40000, 58, 31, '{Computer Science,Business,Engineering,Data Science}', 'A major US public research university with standout computer science and business programs.'),
  ('Purdue University', 'United States', 29000, 89, 53, '{Engineering,Computer Science,Aviation,Business}', 'Known for engineering and aviation programs, with comparatively affordable tuition for US institutions.')
on conflict do nothing;
