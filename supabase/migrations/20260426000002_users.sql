create table public.users (
  id uuid primary key default gen_random_uuid(),
  device_fingerprint text not null unique,
  email text unique,
  display_handle text,
  theme_preference text default 'lantern-glow',
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create index users_device_fingerprint_idx on public.users (device_fingerprint);
