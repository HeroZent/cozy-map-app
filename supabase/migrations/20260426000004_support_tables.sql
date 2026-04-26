create type reply_status as enum ('live', 'hidden', 'flagged', 'removed');

create table public.replies (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) <= 500 and char_length(body) >= 1),
  status reply_status not null default 'live',
  created_at timestamptz not null default now()
);
create index replies_story_idx on public.replies (story_id, created_at desc);

create type reaction_emoji as enum ('hug', 'heart', 'seed', 'candle');

create table public.reactions (
  id uuid primary key default uuid_generate_v4(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  emoji reaction_emoji not null,
  created_at timestamptz not null default now(),
  unique (story_id, user_id, emoji)
);
create index reactions_story_idx on public.reactions (story_id);

create type flag_target as enum ('story', 'reply');

create table public.flags (
  id uuid primary key default uuid_generate_v4(),
  target_type flag_target not null,
  target_id uuid not null,
  flagged_by uuid not null references public.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
create index flags_target_idx on public.flags (target_type, target_id);

create table public.moderation_events (
  id uuid primary key default uuid_generate_v4(),
  target_type flag_target not null,
  target_id uuid not null,
  verdict text not null,
  service text not null,
  crisis_score numeric,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_tokens (
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
