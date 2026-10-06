-- Unicelerate migration 005 — student-added universities + more seed data
-- Run this once in the Supabase SQL Editor, after migration_004.
-- Safe to re-run: "if not exists" / "drop ... if exists" throughout, and
-- seed rows are only inserted when no shared row with that name exists.

-- ─────────────────────────────────────────────────────────────────────────
-- Student-added universities
-- created_by is null for the shared seed data, and the student's user id
-- for a school they added themselves.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.universities
  add column if not exists created_by uuid references auth.users (id) on delete cascade;

-- A student adding a small or unranked school shouldn't have to invent a
-- ranking, so it's optional now. The app shows "Unranked" when it's empty.
alter table public.universities alter column qs_ranking drop not null;

-- Replace the old "everyone can read everything" policy:
--   read:   shared rows, plus rows you created
--   write:  only rows you created, and you can't hand a row to someone else
-- (RLS treats a NULL result as "no", so auth.uid() = null for a logged-out
-- visitor can never match created_by.)
drop policy if exists "Universities are viewable by everyone" on public.universities;
drop policy if exists "Read shared universities and your own" on public.universities;
drop policy if exists "Add your own universities" on public.universities;
drop policy if exists "Edit your own universities" on public.universities;
drop policy if exists "Delete your own universities" on public.universities;

create policy "Read shared universities and your own"
  on public.universities for select
  using (created_by is null or created_by = auth.uid());

create policy "Add your own universities"
  on public.universities for insert
  with check (created_by = auth.uid());

create policy "Edit your own universities"
  on public.universities for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Delete your own universities"
  on public.universities for delete
  using (created_by = auth.uid());

create index if not exists universities_created_by_idx on public.universities (created_by);

-- ─────────────────────────────────────────────────────────────────────────
-- 34 more sample universities (61 in total), across 15 more countries.
--
-- IMPORTANT: like the rest of the seed data, every figure here is an
-- ILLUSTRATIVE APPROXIMATION for demo purposes — tuition (USD/yr, for
-- international students), rankings, acceptance rates, subject rankings
-- and admission stats are not official numbers. SAT ranges are only given
-- for US schools. Many non-English-speaking countries teach most
-- undergraduate programs in the local language, which this app doesn't
-- model yet.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.universities (
  name, country, tuition, qs_ranking, acceptance_rate, popular_programs,
  description, program_rankings, degree_levels, avg_admitted_gpa,
  sat_25, sat_75, min_ielts, living_cost_per_year
)
select
  v.name, v.country, v.tuition, v.qs_ranking, v.acceptance_rate,
  v.popular_programs::text[], v.description, v.program_rankings::jsonb,
  array['Undergraduate', 'Masters', 'PhD'], v.gpa, v.sat_25, v.sat_75,
  v.ielts, v.living
from (values
  -- United States
  ('University of California, Berkeley', 'United States', 48000, 10, 11, '{Computer Science,Engineering,Business,Data Science}', 'A leading public research university in the San Francisco Bay Area, known for computer science and engineering.', '{"Computer Science": 3, "Engineering": 5, "Business": 15, "Data Science": 4}', 96, 1330, 1530, 7.0, 24000),
  ('University of California, Los Angeles', 'United States', 46000, 29, 9, '{Business,Engineering,Medicine,Arts}', 'A large public university in Los Angeles with highly rated arts, medicine and engineering programs.', '{"Business": 20, "Engineering": 25, "Medicine": 15, "Arts": 10}', 96, 1290, 1510, 7.0, 22000),
  ('University of Michigan', 'United States', 57000, 33, 18, '{Business,Engineering,Computer Science,Medicine}', 'A major public research university in Ann Arbor with strong business and engineering schools.', '{"Business": 12, "Engineering": 10, "Computer Science": 15, "Medicine": 14}', 94, 1350, 1530, 6.5, 17000),
  ('Georgia Institute of Technology', 'United States', 33000, 97, 17, '{Engineering,Computer Science,Data Science,Business}', 'A technology-focused public university in Atlanta, known for engineering and computing.', '{"Engineering": 8, "Computer Science": 9, "Data Science": 10, "Business": 60}', 94, 1370, 1530, 7.0, 16000),
  ('University of Illinois Urbana-Champaign', 'United States', 36000, 64, 44, '{Computer Science,Engineering,Business,Data Science}', 'A large public university with one of the most respected computer science and engineering programs in the US.', '{"Computer Science": 6, "Engineering": 7, "Business": 30, "Data Science": 8}', 92, 1340, 1520, 6.5, 14000),
  ('University of Washington', 'United States', 42000, 63, 43, '{Computer Science,Medicine,Engineering,Data Science}', 'A public research university in Seattle with strong computer science and medical programs.', '{"Computer Science": 12, "Medicine": 10, "Engineering": 25, "Data Science": 14}', 92, 1300, 1500, 7.0, 19000),
  ('New York University', 'United States', 60000, 38, 8, '{Business,Arts,Law,Data Science}', 'A private university in the heart of Manhattan, known for business, law and the arts.', '{"Business": 10, "Arts": 8, "Law": 8, "Data Science": 25}', 95, 1480, 1570, 7.5, 28000),
  ('Northeastern University', 'United States', 63000, 375, 6, '{Business,Computer Science,Engineering,Data Science}', 'A private university in Boston built around its co-op program, which alternates study with full-time work.', '{"Business": 80, "Computer Science": 70, "Engineering": 120, "Data Science": 60}', 93, 1440, 1530, 7.0, 24000),
  -- United Kingdom
  ('Imperial College London', 'United Kingdom', 48000, 6, 15, '{Engineering,Medicine,Computer Science,Natural Sciences}', 'A science, engineering and medicine specialist in central London.', '{"Engineering": 3, "Medicine": 5, "Computer Science": 10, "Natural Sciences": 8}', 96, null, null, 7.0, 21000),
  ('University College London', 'United Kingdom', 40000, 9, 30, '{Architecture,Medicine,Law,Economics}', 'A large multidisciplinary university in central London with a world-leading architecture school.', '{"Architecture": 1, "Medicine": 8, "Law": 10, "Economics": 9}', 94, null, null, 7.0, 21000),
  -- Canada, Australia
  ('University of Alberta', 'Canada', 25000, 96, 58, '{Engineering,Natural Sciences,Business,Medicine}', 'A large research university in Edmonton with comparatively affordable tuition for Canada.', '{"Engineering": 70, "Natural Sciences": 60, "Business": 90, "Medicine": 80}', 85, null, null, 6.5, 12000),
  ('Australian National University', 'Australia', 36000, 30, 35, '{Natural Sciences,Social Sciences,Law,Computer Science}', 'Australia''s national research university in Canberra, strong in sciences and social sciences.', '{"Natural Sciences": 25, "Social Sciences": 15, "Law": 20, "Computer Science": 40}', 90, null, null, 6.5, 17000),
  -- East and South Asia
  ('University of Tokyo', 'Japan', 5000, 32, 35, '{Engineering,Natural Sciences,Economics,Medicine}', 'Japan''s top-ranked university, with very low tuition and a strong research focus.', '{"Engineering": 12, "Natural Sciences": 10, "Economics": 30, "Medicine": 20}', 92, null, null, 6.5, 14000),
  ('Kyoto University', 'Japan', 5000, 50, 40, '{Natural Sciences,Engineering,Medicine,Law}', 'A historic research university known for natural sciences and a long list of Nobel laureates.', '{"Natural Sciences": 15, "Engineering": 25, "Medicine": 30, "Law": 50}', 90, null, null, 6.5, 12000),
  ('Seoul National University', 'South Korea', 8000, 31, 30, '{Engineering,Business,Medicine,Computer Science}', 'South Korea''s leading national university in Seoul.', '{"Engineering": 20, "Business": 35, "Medicine": 30, "Computer Science": 30}', 92, null, null, 6.5, 11000),
  ('KAIST', 'South Korea', 6000, 53, 30, '{Engineering,Computer Science,Physics,Data Science}', 'A science and technology university in Daejeon with many programs taught in English.', '{"Engineering": 15, "Computer Science": 20, "Physics": 30, "Data Science": 25}', 91, null, null, 6.5, 10000),
  ('The University of Hong Kong', 'Hong Kong', 22000, 17, 10, '{Business,Law,Medicine,Computer Science}', 'Hong Kong''s oldest university, teaching in English, with highly rated law and medicine.', '{"Business": 20, "Law": 18, "Medicine": 25, "Computer Science": 30}', 93, null, null, 6.5, 15000),
  ('Hong Kong University of Science and Technology', 'Hong Kong', 22000, 47, 20, '{Business,Engineering,Computer Science,Data Science}', 'A young research university known for business, engineering and technology.', '{"Business": 15, "Engineering": 20, "Computer Science": 25, "Data Science": 22}', 91, null, null, 6.5, 15000),
  ('Tsinghua University', 'China', 5000, 20, 15, '{Engineering,Computer Science,Architecture,Economics}', 'A leading Chinese university in Beijing with a strong engineering and computer science focus.', '{"Engineering": 4, "Computer Science": 8, "Architecture": 10, "Economics": 30}', 94, null, null, 6.5, 9000),
  ('Peking University', 'China', 5000, 14, 15, '{Natural Sciences,Economics,Law,Medicine}', 'A leading comprehensive university in Beijing, strong in sciences, economics and the humanities.', '{"Natural Sciences": 10, "Economics": 20, "Law": 25, "Medicine": 35}', 94, null, null, 6.5, 9000),
  ('Nanyang Technological University', 'Singapore', 28000, 15, 20, '{Engineering,Computer Science,Business,Data Science}', 'A research-intensive university in Singapore known for engineering and technology.', '{"Engineering": 5, "Computer Science": 10, "Business": 25, "Data Science": 12}', 92, null, null, 6.5, 12000),
  ('Universiti Malaya', 'Malaysia', 6000, 60, 40, '{Engineering,Business,Medicine,Computer Science}', 'Malaysia''s oldest university in Kuala Lumpur, with low tuition and living costs.', '{"Engineering": 60, "Business": 70, "Medicine": 80, "Computer Science": 90}', 85, null, null, 6.0, 6000),
  ('Indian Institute of Technology Bombay', 'India', 3000, 118, 2, '{Engineering,Computer Science,Physics,Data Science}', 'One of India''s top engineering institutes in Mumbai; most undergraduate places are filled through a national entrance exam.', '{"Engineering": 30, "Computer Science": 40, "Physics": 80, "Data Science": 50}', 95, null, null, null, 4000),
  -- Continental Europe
  ('Université PSL', 'France', 4000, 24, 15, '{Natural Sciences,Economics,Mathematics,Physics}', 'A Paris university grouping several elite schools, very strong in mathematics and physics.', '{"Natural Sciences": 15, "Economics": 25, "Mathematics": 8, "Physics": 12}', 92, null, null, 6.5, 17000),
  ('Sorbonne University', 'France', 4000, 59, 30, '{Natural Sciences,Medicine,Arts,Mathematics}', 'A historic Paris university covering sciences, medicine and the humanities.', '{"Natural Sciences": 30, "Medicine": 40, "Arts": 25, "Mathematics": 20}', 86, null, null, 6.5, 15000),
  ('Politecnico di Milano', 'Italy', 4000, 111, 40, '{Engineering,Architecture,Data Science,Business}', 'Italy''s leading technical university, especially known for architecture and design.', '{"Engineering": 15, "Architecture": 7, "Data Science": 40, "Business": 30}', 85, null, null, 6.0, 13000),
  ('University of Bologna', 'Italy', 3500, 133, 50, '{Economics,Law,Medicine,Arts}', 'One of the oldest universities in the world, with low tuition and a lively student city.', '{"Economics": 50, "Law": 45, "Medicine": 60, "Arts": 30}', 82, null, null, 6.0, 11000),
  ('University of Barcelona', 'Spain', 3000, 149, 50, '{Medicine,Business,Arts,Natural Sciences}', 'A large public university in Barcelona with affordable tuition.', '{"Medicine": 50, "Business": 80, "Arts": 60, "Natural Sciences": 70}', 82, null, null, 6.0, 12000),
  ('University of Copenhagen', 'Denmark', 16000, 101, 40, '{Natural Sciences,Medicine,Economics,Law}', 'Denmark''s largest research university, strong in life and natural sciences.', '{"Natural Sciences": 25, "Medicine": 30, "Economics": 50, "Law": 60}', 86, null, null, 6.5, 17000),
  ('KU Leuven', 'Belgium', 4000, 60, 50, '{Engineering,Medicine,Law,Economics}', 'Belgium''s top-ranked university, known for research and relatively low tuition.', '{"Engineering": 30, "Medicine": 25, "Law": 35, "Economics": 45}', 84, null, null, 6.5, 13000),
  ('University of Helsinki', 'Finland', 15000, 116, 25, '{Natural Sciences,Computer Science,Education,Arts}', 'Finland''s largest university, with a highly regarded education program.', '{"Natural Sciences": 40, "Computer Science": 70, "Education": 20, "Arts": 50}', 85, null, null, 6.5, 13000),
  ('University of Oslo', 'Norway', 14000, 117, 30, '{Natural Sciences,Law,Medicine,Social Sciences}', 'Norway''s oldest and largest university.', '{"Natural Sciences": 50, "Law": 40, "Medicine": 55, "Social Sciences": 45}', 86, null, null, 6.5, 17000),
  ('University of Vienna', 'Austria', 1700, 137, 70, '{Social Sciences,Arts,Natural Sciences,Law}', 'One of the oldest universities in Europe, with very low tuition.', '{"Social Sciences": 50, "Arts": 45, "Natural Sciences": 70, "Law": 80}', 80, null, null, 6.5, 13000),
  -- Middle East
  ('Khalifa University', 'United Arab Emirates', 20000, 202, 30, '{Engineering,Computer Science,Physics,Data Science}', 'A science and engineering university in Abu Dhabi that offers many scholarships.', '{"Engineering": 100, "Computer Science": 120, "Physics": 150, "Data Science": 130}', 88, null, null, 6.0, 14000)
) as v(
  name, country, tuition, qs_ranking, acceptance_rate, popular_programs,
  description, program_rankings, gpa, sat_25, sat_75, ielts, living
)
where not exists (
  select 1 from public.universities u
  where u.name = v.name and u.created_by is null
);
