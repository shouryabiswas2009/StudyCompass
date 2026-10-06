-- migration_013: an optional "accept by" date per offer.
--
-- Universities give admitted students a date by which to accept the offer
-- (often 1 May in the US, other dates elsewhere). The offers page shows an
-- "upcoming" or "overdue" badge from it. It's different from `deadline`,
-- which is the application deadline. Empty (null) = not entered.
--
-- No new RLS policy is needed: the applications policies from migration_006
-- already limit every row (and so every column) to its owner.
--
-- Safe to run more than once.

alter table public.applications add column if not exists accept_by date;
