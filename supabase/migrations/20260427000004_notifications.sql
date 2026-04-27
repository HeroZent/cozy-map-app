-- supabase/migrations/20260427000004_notifications.sql

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,   -- 'memory_promoted' | 'new_reply' | 'new_reaction'
  story_id    uuid references public.stories(id) on delete cascade,
  payload     jsonb not null default '{}',
  read_at     timestamptz null,   -- null = unread
  created_at  timestamptz not null default now()
);

-- Fast lookup: all unread notifications for a user
create index notifications_user_unread
  on public.notifications (user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

-- Users can read their own notifications
create policy "users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Users can mark their own notifications read (set read_at)
-- No client INSERT or DELETE — service role only
create policy "users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);
