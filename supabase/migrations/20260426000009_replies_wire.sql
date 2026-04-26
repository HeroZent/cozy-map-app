-- Allow authenticated users to read any user's display_handle
-- Required for the users(display_handle) PostgREST join in useReplies
create policy users_read_handle
  on public.users
  for select
  to authenticated
  using (true);
