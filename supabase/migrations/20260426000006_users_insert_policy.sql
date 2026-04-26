-- Allow an authenticated user to create their own public.users row.
-- The insert check binds public.users.id to auth.uid() so RLS is consistent
-- with the existing select/update policies.
create policy users_self_insert on public.users
  for insert with check (auth.uid() = id);
