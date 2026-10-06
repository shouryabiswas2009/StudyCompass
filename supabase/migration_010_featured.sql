-- StudyCompass migration 010 — "featured" universities
-- Run this once in the Supabase SQL Editor, after migration_009, then run
-- supabase/featured/featured.sql (which decides which rows are featured).
-- Safe to re-run.
--
-- Featured schools are shown by default; every other school is still in the
-- table and one click away ("Include all N schools"). Nothing is deleted.
-- The rule lives in scripts/relevance-rule.mjs, not here, so its thresholds
-- can change without a new migration.
alter table public.universities add column if not exists is_featured boolean not null default false;
