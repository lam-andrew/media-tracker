-- Adds the favorites flag to user_items. Run once in the Supabase SQL editor.
-- (New projects get it from schema.sql; this is for the existing database.)
alter table user_items
  add column if not exists favorite boolean not null default false;
