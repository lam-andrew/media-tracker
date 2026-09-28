alter table accounts add column if not exists display_name text not null default '';
alter table accounts add column if not exists verified boolean not null default false;
alter table accounts add column if not exists google_id text unique;
create table if not exists account_tokens(token_hash text primary key,user_id uuid not null references accounts(id) on delete cascade,purpose text not null,expires_at timestamptz not null);
create table if not exists goals(user_id uuid not null references accounts(id) on delete cascade,year integer not null,media_type text not null,target integer not null check(target>0),primary key(user_id,year,media_type));
alter table library drop constraint if exists library_user_id_source_external_id_key;
create unique index if not exists library_identity on library(user_id,media_type,source,external_id);
