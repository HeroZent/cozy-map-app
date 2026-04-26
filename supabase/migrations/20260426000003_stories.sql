create type story_mood as enum (
  'regret', 'on_my_mind', 'struggling', 'hopeful',
  'memory', 'dream', 'unsent_letter', 'forgiveness'
);

create type pin_mode as enum ('gps', 'dropped', 'city');

create type story_status as enum ('live', 'hidden', 'flagged', 'removed');

create table public.stories (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.users(id) on delete cascade,
  mood story_mood not null,
  body text not null check (char_length(body) <= 1000 and char_length(body) >= 1),
  location geography(Point, 4326) not null,
  location_label text,
  pin_mode pin_mode not null,
  language text default 'en',
  status story_status not null default 'live',
  is_memory boolean not null default false,
  created_at timestamptz not null default now()
);

create index stories_location_idx on public.stories using gist (location);
create index stories_created_at_idx on public.stories (created_at desc);
create index stories_status_idx on public.stories (status) where status = 'live';
create index stories_author_idx on public.stories (author_id);
