create table if not exists accounts (
 id uuid primary key, email text not null unique, password_hash text not null, created_at timestamptz not null default now()
);
create table if not exists sessions (
 token_hash text primary key, user_id uuid not null references accounts(id) on delete cascade,
 expires_at timestamptz not null
);
create index if not exists sessions_expiry on sessions(expires_at);
create table if not exists library (
 id uuid primary key, user_id uuid not null references accounts(id) on delete cascade,
 source text not null, external_id text not null, media_type text not null, media jsonb not null,
 tracking jsonb not null, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,source,external_id)
);
create index if not exists library_user on library(user_id,created_at desc);
