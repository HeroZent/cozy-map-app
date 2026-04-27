-- supabase/migrations/20260427000006_push_subscriptions.sql

create table public.push_subscriptions (
  user_id    uuid primary key references public.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- Users can read their own subscription (hook checks DB on mount)
create policy "users select own push subscription"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

-- Client always upserts (INSERT ... ON CONFLICT DO UPDATE) — no UPDATE policy needed
create policy "users insert own push subscription"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "users delete own push subscription"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
