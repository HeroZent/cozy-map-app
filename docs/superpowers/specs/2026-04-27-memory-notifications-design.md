# Memory Unlocking + Notifications Infrastructure Design

## Goal

Promote stories older than 7 days to "memory" status automatically, notify authors quietly in-app, and lay the notifications table foundation for future reply/reaction notifications.

## Architecture

**Three layers:**
1. **DB** — `notifications` table (service-role writes only, user reads via RLS)
2. **Edge function** — `promote-memories` cron job (daily, service role)
3. **Client** — `useNotifications` hook + `MemoryBanner` UI + `MySulatRow` memory badge

## Tech Stack

Supabase Edge Functions (Deno), `pg_cron`, Supabase JS v2, React Native Web, Expo Router

---

## Section 1 — Notifications Table

```sql
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,   -- 'memory_promoted' | 'new_reply' | 'new_reaction'
  story_id    uuid references public.stories(id) on delete cascade,
  payload     jsonb not null default '{}',
  read_at     timestamptz null,  -- null = unread
  created_at  timestamptz not null default now()
);

create index notifications_user_unread
  on public.notifications (user_id, read_at)
  where read_at is null;
```

**RLS:**
- Users can `SELECT` their own rows (`auth.uid() = user_id`)
- Users can `UPDATE` their own rows (to set `read_at`) — no client `INSERT` or `DELETE`
- Only service-role edge functions write notifications

---

## Section 2 — Memory Promotion Cron

**Edge function:** `supabase/functions/promote-memories/index.ts`

Runs daily at 03:00 UTC via `pg_cron`. On each run:

1. `SELECT id, author_id FROM stories WHERE is_memory = false AND status = 'live' AND created_at < now() - interval '7 days'`
2. For each story: `UPDATE stories SET is_memory = true WHERE id = $1`
3. `INSERT INTO notifications (user_id, type, story_id, payload) VALUES (author_id, 'memory_promoted', story_id, '{}')`
4. Steps 2+3 run together so a partial failure doesn't leave stories promoted without a notification

Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS (same pattern as audit log in `create-story`).

**Schedule migration:**
```sql
select cron.schedule(
  'promote-memories',
  '0 3 * * *',
  $$select net.http_post(
      url := supabase_url() || '/functions/v1/promote-memories',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || supabase_service_role_key(),
        'Content-Type', 'application/json'
      ),
      body := '{}'
  ) as request_id$$
);
```

---

## Section 3 — Client Notification Hook

**File:** `src/data/useNotifications.ts`

```ts
interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;           // unread memory_promoted count
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}
```

- Fetches `notifications` where `read_at is null` for the current user on mount
- `markRead(ids)` patches `read_at = now()` and removes those rows from local state
- Called once in `app/index.tsx` — no polling
- Future reply/reaction delivery reads `type === 'new_reply'` etc. from the same hook

---

## Section 4 — UI

### MemoryBanner (`src/notifications/MemoryBanner.tsx`)

Shown in `app/index.tsx` above the nav bar when `memoryCount > 0`.

- Single story: `✦ One of your sulat became a memory`
- Multiple: `✦ ${memoryCount} of your sulat became memories`
- Tap anywhere on banner → calls `markRead` on all memory notification IDs → banner disappears
- Positioned `absolute`, `bottom: NAV_HEIGHT`, full width, dark surface background, accent text
- Renders `null` when `memoryCount === 0`

### MySulatRow memory badge

- Add `is_memory: boolean` to `MyStory` interface in `useMyStories.ts`
- Add `is_memory` to the Supabase SELECT in `useMyStories`
- In `MySulatRow`: show `✦ memory` label (accent color, 11px) next to the reaction badge when `story.is_memory === true`

---

## Error Handling

- Cron function: logs errors per-story, continues to next story on failure (no transaction abort for batch)
- `useNotifications`: fails open — if fetch errors, `memoryCount` stays 0, banner never shows
- `markRead`: optimistic — removes from local state immediately, patches DB in background; on error, silently re-fetches

---

## What This Spec Does NOT Cover

- Push notifications (web push / VAPID) — next spec
- Reply and reaction notification *delivery* (inserting `new_reply`/`new_reaction` rows) — next spec
- Notification inbox / history UI — future
- The `notifications` table structure is final and shared with all future types
