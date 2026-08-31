-- Marqd database schema. Run once in the Supabase SQL editor.
--
-- `type` is TEXT (not an enum) and type-specific fields live in JSONB, so adding a
-- new media type needs no migration. See docs/adr/0002-generic-media-engine.md.
-- Row Level Security is ENABLED with no policies (deny-by-default): the public anon
-- key can't touch these tables, while Marqd's server uses the service_role key, which
-- bypasses RLS. Per-user policies come with real auth. See
-- docs/adr/0004-single-user-mvp.md and docs/adr/0008-enable-rls-deny-by-default.md.

create extension if not exists "pgcrypto";

-- Global, shared metadata cache (one row per external item).
create table if not exists media_items (
  id              uuid primary key default gen_random_uuid(),
  type            text not null,                 -- 'book' | 'movie' | 'tv' | 'game' | (future)
  external_source text not null,                 -- 'openlibrary' | 'tmdb' | 'rawg'
  external_id     text not null,
  title           text not null,
  creators        text[] not null default '{}',  -- authors / directors / developers
  image_url       text,                          -- cover / poster
  release_year    int,
  metadata        jsonb not null default '{}',   -- page_count, runtime, seasons, platforms...
  created_at      timestamptz not null default now(),
  unique (external_source, external_id)
);

-- Per-user tracking record (the heart of the app).
create table if not exists user_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,                   -- MVP: DEFAULT_USER_ID constant
  media_item_id uuid not null references media_items (id) on delete cascade,
  status        text not null default 'backlog', -- backlog | in_progress | completed | abandoned
  rating        numeric(2, 1),                   -- 0.5..5.0 (half-stars), nullable
  progress      jsonb not null default '{}',     -- {current_page,total_pages}|{season,episode}|{percent}
  notes         text,
  started_at    date,
  finished_at   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, media_item_id)
);

create index if not exists user_items_user_status_idx on user_items (user_id, status);
create index if not exists media_items_type_idx on media_items (type);

-- Deny-by-default security: RLS on, no policies. The service_role key (used only
-- server-side) bypasses RLS; the public anon key is locked out. See ADR 0008.
alter table media_items enable row level security;
alter table user_items enable row level security;
