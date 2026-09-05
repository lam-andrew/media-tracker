-- Adds yearly completion goals (the Stats page). Run once in the Supabase SQL
-- editor: Dashboard → SQL Editor → New query → paste this file → Run.
-- Until it has been run, the Stats page shows a one-line setup notice in place
-- of the goals form; nothing else is affected.

-- One target per (user, year, media type). `type` NULL means "all media".
-- `nulls not distinct` (Postgres 15+) makes the NULL type unique too, so a user
-- has at most one all-media goal per year and upserts replace it.
create table if not exists user_goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  year       int not null,
  type       text,                                  -- 'book' | 'movie' | ... | NULL = all media
  target     int not null check (target > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, year, type)
);

create index if not exists user_goals_user_year_idx on user_goals (user_id, year);

-- Each user sees and manages ONLY their own goals (same posture as user_items;
-- see supabase/policies.sql and docs/adr/0009-supabase-auth-multi-user.md).
alter table user_goals enable row level security;

drop policy if exists "user_goals_all" on user_goals;
create policy "user_goals_all" on user_goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
