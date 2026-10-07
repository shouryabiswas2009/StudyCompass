-- Unicelerate: the student's "show amounts also in" currency (profile).
-- Amounts are still stored and compared in US dollars; the app adds an
-- approximate conversion at the dated ECB rates in lib/exchange-rates.ts.
-- The app only offers currencies it has a rate for; here we just require
-- an ISO 4217-style code. Safe to re-run.

alter table public.profiles add column if not exists display_currency text not null default 'USD';

alter table public.profiles drop constraint if exists profiles_display_currency_check;
alter table public.profiles add constraint profiles_display_currency_check
  check (display_currency ~ '^[A-Z]{3}$');

-- Check (should list display_currency, text, 'USD'::text):
--   select column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'profiles' and column_name = 'display_currency';
