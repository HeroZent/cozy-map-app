alter table public.users enable row level security;
alter table public.stories enable row level security;
alter table public.replies enable row level security;
alter table public.reactions enable row level security;
alter table public.flags enable row level security;
alter table public.moderation_events enable row level security;
alter table public.notification_tokens enable row level security;

-- users: a user can read and update their own row
create policy users_self_read on public.users
  for select using (auth.uid() = id);
create policy users_self_update on public.users
  for update using (auth.uid() = id);

-- stories: anyone can read live stories; authors see their own non-live ones; only authors write/update/delete their own
create policy stories_read_live on public.stories
  for select using (status = 'live' or auth.uid() = author_id);
create policy stories_insert_self on public.stories
  for insert with check (auth.uid() = author_id);
create policy stories_update_self on public.stories
  for update using (auth.uid() = author_id);
create policy stories_delete_self on public.stories
  for delete using (auth.uid() = author_id);

-- replies: read live, insert by self, update/delete by self (used in Plan 3)
create policy replies_read_live on public.replies
  for select using (status = 'live' or auth.uid() = author_id);
create policy replies_insert_self on public.replies
  for insert with check (auth.uid() = author_id);
create policy replies_update_self on public.replies
  for update using (auth.uid() = author_id);
create policy replies_delete_self on public.replies
  for delete using (auth.uid() = author_id);

-- reactions: read all, insert/delete by self (Plan 3)
create policy reactions_read_all on public.reactions for select using (true);
create policy reactions_insert_self on public.reactions
  for insert with check (auth.uid() = user_id);
create policy reactions_delete_self on public.reactions
  for delete using (auth.uid() = user_id);

-- flags: insert by self (Plan 2). No general read policy — server only.
create policy flags_insert_self on public.flags
  for insert with check (auth.uid() = flagged_by);

-- moderation_events: server-only (no policies = blocked for anon/authenticated)
-- notification_tokens: a user can manage their own tokens (Plan 3)
create policy tokens_self on public.notification_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
