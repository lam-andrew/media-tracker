-- Marqd multi-user RLS policies. Run in the Supabase SQL editor AFTER schema.sql.
-- RLS is already enabled on both tables (schema.sql). These policies define access
-- for signed-in (authenticated) users. See docs/adr/0009-supabase-auth-multi-user.md.

-- media_items: a shared metadata cache. Any signed-in user may read it and add to
-- it (adding an item may upsert its shared metadata row).
drop policy if exists "media_items_select" on media_items;
create policy "media_items_select" on media_items
  for select to authenticated using (true);

drop policy if exists "media_items_insert" on media_items;
create policy "media_items_insert" on media_items
  for insert to authenticated with check (true);

drop policy if exists "media_items_update" on media_items;
create policy "media_items_update" on media_items
  for update to authenticated using (true) with check (true);

-- user_items: each user sees and manages ONLY their own tracking rows.
drop policy if exists "user_items_all" on user_items;
create policy "user_items_all" on user_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
