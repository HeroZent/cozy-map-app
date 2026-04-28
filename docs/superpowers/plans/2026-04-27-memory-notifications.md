# Memory Unlocking + Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote stories older than 7 days to "memory" status via a daily cron job, notify authors with a dismissible in-app banner, and lay the notifications table foundation for future reply/reaction notifications.

**Architecture:** Three layers — DB (`notifications` table, service-role writes only), Edge (`promote-memories` daily cron), Client (`useNotifications` hook + `MemoryBanner` UI + `MySulatRow` badge). Fails open everywhere: fetch errors keep the banner hidden, markRead is optimistic.

**Tech Stack:** Supabase Edge Functions (Deno), pg_cron, pg_net, Supabase JS v2, React Native Web, Expo Router, Jest + Testing Library

---

## File Map

| Status | Path | What it does |
|--------|------|--------------|
| Create | `supabase/migrations/20260427000004_notifications.sql` | notifications table, index, RLS |
| Create | `supabase/migrations/20260427000005_promote_memories_schedule.sql` | pg_cron schedule |
| Create | `supabase/functions/promote-memories/index.ts` | daily promotion edge function |
| Create | `src/data/useNotifications.ts` | hook: fetch unread, markRead, memoryCount |
| Create | `src/data/__tests__/useNotifications.test.ts` | hook tests |
| Create | `src/notifications/MemoryBanner.tsx` | dismissible banner component |
| Create | `src/notifications/__tests__/MemoryBanner.test.tsx` | banner tests |
| Modify | `src/profile/useMyStories.ts` | add is_memory to MyStory + SELECT |
| Create | `src/profile/__tests__/MySulatRow.test.tsx` | memory badge tests |
| Modify | `src/profile/MySulatRow.tsx` | render ✦ memory badge |
| Modify | `app/index.tsx` | mount useNotifications + MemoryBanner |

---

## Task 1: Notifications DB Migration

**Files:**
- Create: `supabase/migrations/20260427000004_notifications.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Verify**

```bash
npx supabase migration list
```

Expected output includes `20260427000004_notifications` with status `applied`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260427000004_notifications.sql
git commit -m "feat: add notifications table with RLS"
```

---

## Task 2: promote-memories Edge Function

**Files:**
- Create: `supabase/functions/promote-memories/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/promote-memories/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  // Verify caller is the service role (pg_cron sends the service role key)
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('Unauthorized', { status: 401, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    serviceRoleKey,
  );

  // Find stories eligible for memory promotion:
  // live, not yet a memory, older than 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stories, error: fetchError } = await supa
    .from('stories')
    .select('id, author_id')
    .eq('is_memory', false)
    .eq('status', 'live')
    .lt('created_at', cutoff);

  if (fetchError) {
    console.error('[promote-memories] fetch error:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const candidates = stories ?? [];
  console.log(`[promote-memories] found ${candidates.length} stories to promote`);

  let promoted = 0;
  let failed = 0;

  for (const story of candidates) {
    // Update story first
    const { error: updateError } = await supa
      .from('stories')
      .update({ is_memory: true })
      .eq('id', story.id);

    if (updateError) {
      console.error(`[promote-memories] update failed for ${story.id}:`, updateError.message);
      failed++;
      continue;
    }

    // Insert notification — non-fatal if this fails (story is already promoted)
    const { error: notifError } = await supa
      .from('notifications')
      .insert({
        user_id: story.author_id,
        type: 'memory_promoted',
        story_id: story.id,
        payload: {},
      });

    if (notifError) {
      console.error(`[promote-memories] notification failed for ${story.id}:`, notifError.message);
      // Story is already promoted — do not increment failed
    }

    promoted++;
  }

  return new Response(
    JSON.stringify({ promoted, failed, total: candidates.length }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
```

- [ ] **Step 2: Deploy the function**

```bash
npx supabase functions deploy promote-memories
```

Expected: `Function promote-memories deployed successfully`

- [ ] **Step 3: Smoke-test with curl**

Replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` with values from `.env.local` / Supabase dashboard.

```bash
curl -X POST \
  https://<PROJECT_REF>.supabase.co/functions/v1/promote-memories \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected response (JSON):
```json
{ "promoted": 0, "failed": 0, "total": 0 }
```
(Zero if no stories are old enough yet — that's correct.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/promote-memories/index.ts
git commit -m "feat: add promote-memories edge function"
```

---

## Task 3: pg_cron Schedule Migration

**Files:**
- Create: `supabase/migrations/20260427000005_promote_memories_schedule.sql`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260427000005_promote_memories_schedule.sql

select cron.schedule(
  'promote-memories',
  '0 3 * * *',
  $$select net.http_post(
      url := supabase_url() || '/functions/v1/promote-memories',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || supabase_service_role_key(),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
  ) as request_id$$
);
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: no errors. The cron job is registered in the `cron.job` table.

- [ ] **Step 3: Verify in Supabase dashboard**

In the Supabase dashboard → Database → Extensions → pg_cron, confirm the `promote-memories` job appears with schedule `0 3 * * *`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260427000005_promote_memories_schedule.sql
git commit -m "feat: schedule promote-memories cron at 03:00 UTC daily"
```

---

## Task 4: useNotifications Hook

**Files:**
- Create: `src/data/useNotifications.ts`
- Create: `src/data/__tests__/useNotifications.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/data/__tests__/useNotifications.test.ts
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Text, Pressable } from 'react-native';
import { useNotifications } from '../useNotifications';

// Mutable state — modified per test to control mock behavior
let mockNotifications: any[] = [];
let mockFetchError: { message: string } | null = null;
let mockUserId: string | null = 'user-1';

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockUserId ? { user: { id: mockUserId } } : null },
        }),
    },
    from: () => ({
      select: () => ({
        is: () => Promise.resolve({ data: mockNotifications, error: mockFetchError }),
      }),
      update: () => ({
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  },
}));

// Test harness wraps the hook so we can observe its output
function Harness() {
  const { notifications, memoryCount, markRead, loading } = useNotifications();
  if (loading) return <Text>loading</Text>;
  return (
    <>
      <Text>{`count-${memoryCount}`}</Text>
      <Text>{`total-${notifications.length}`}</Text>
      <Pressable onPress={() => markRead(notifications.map((n) => n.id))}>
        <Text>mark-read</Text>
      </Pressable>
    </>
  );
}

describe('useNotifications', () => {
  beforeEach(() => {
    mockNotifications = [];
    mockFetchError = null;
    mockUserId = 'user-1';
  });

  it('returns memoryCount 0 and empty notifications when there are none', async () => {
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('counts only memory_promoted type notifications', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
      { id: 'n2', type: 'memory_promoted', story_id: 's2', payload: {}, created_at: '2026-01-02' },
      { id: 'n3', type: 'new_reply', story_id: 's3', payload: {}, created_at: '2026-01-03' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-2')).toBeTruthy());
    expect(getByText('total-3')).toBeTruthy();
  });

  it('returns empty when not logged in', async () => {
    mockUserId = null;
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('fails open on fetch error — memoryCount stays 0, banner stays hidden', async () => {
    mockFetchError = { message: 'db down' };
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });

  it('markRead removes notifications from state optimistically', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('count-1')).toBeTruthy());
    fireEvent.press(getByText('mark-read'));
    await waitFor(() => expect(getByText('count-0')).toBeTruthy());
    expect(getByText('total-0')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest src/data/__tests__/useNotifications.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../useNotifications'`

- [ ] **Step 3: Implement the hook**

```typescript
// src/data/useNotifications.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/data/supabase';

export interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}

const SELECT = 'id, type, story_id, payload, created_at';

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;

      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select(SELECT)
        .is('read_at', null);

      if (error) {
        console.error('[useNotifications] fetch error:', error.message);
        if (!cancelled) setLoading(false);
        return; // fail open — memoryCount stays 0, banner stays hidden
      }

      if (!cancelled) {
        setNotifications((data ?? []) as Notification[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    // Optimistic: update local state immediately
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    // Patch DB in background — fire and forget
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .then(({ error }) => {
        if (error) {
          console.error('[useNotifications] markRead error:', error.message);
          // On error, silently re-fetch to restore correct state
          supabase
            .from('notifications')
            .select(SELECT)
            .is('read_at', null)
            .then(({ data }) => {
              setNotifications((data ?? []) as Notification[]);
            });
        }
      });
  };

  const memoryCount = notifications.filter((n) => n.type === 'memory_promoted').length;

  return { notifications, memoryCount, markRead, loading };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/data/__tests__/useNotifications.test.ts --no-coverage
```

Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/data/useNotifications.ts src/data/__tests__/useNotifications.test.ts
git commit -m "feat: add useNotifications hook with fail-open fetch and optimistic markRead"
```

---

## Task 5: MemoryBanner Component

**Files:**
- Create: `src/notifications/MemoryBanner.tsx`
- Create: `src/notifications/__tests__/MemoryBanner.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// src/notifications/__tests__/MemoryBanner.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemoryBanner } from '../MemoryBanner';
import type { Notification } from '@/data/useNotifications';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    accent: '#f4c97a',
    textMuted: '#888',
    textPrimary: '#fff',
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    fontFamily: 'serif',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

const memoryNotif = (id: string, storyId: string): Notification => ({
  id,
  type: 'memory_promoted',
  story_id: storyId,
  payload: {},
  created_at: '2026-04-20T00:00:00Z',
});

describe('MemoryBanner', () => {
  it('renders nothing when memoryCount is 0', () => {
    const { queryByText } = render(
      <MemoryBanner notifications={[]} memoryCount={0} markRead={jest.fn()} />,
    );
    expect(queryByText(/sulat/)).toBeNull();
  });

  it('shows singular text when exactly one memory', () => {
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1')]}
        memoryCount={1}
        markRead={jest.fn()}
      />,
    );
    expect(getByText('✦ One of your sulat became a memory')).toBeTruthy();
  });

  it('shows plural text when more than one memory', () => {
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1'), memoryNotif('n2', 's2')]}
        memoryCount={2}
        markRead={jest.fn()}
      />,
    );
    expect(getByText('✦ 2 of your sulat became memories')).toBeTruthy();
  });

  it('calls markRead with all memory notification IDs when tapped', () => {
    const mockMarkRead = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(
      <MemoryBanner
        notifications={[memoryNotif('n1', 's1'), memoryNotif('n2', 's2')]}
        memoryCount={2}
        markRead={mockMarkRead}
      />,
    );
    fireEvent.press(getByText('✦ 2 of your sulat became memories'));
    expect(mockMarkRead).toHaveBeenCalledWith(['n1', 'n2']);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest src/notifications/__tests__/MemoryBanner.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../MemoryBanner'`

- [ ] **Step 3: Implement the component**

```tsx
// src/notifications/MemoryBanner.tsx
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Notification } from '@/data/useNotifications';

export interface MemoryBannerProps {
  notifications: Notification[];
  memoryCount: number;
  markRead: (ids: string[]) => Promise<void>;
  bottomOffset?: number;
}

export function MemoryBanner({
  notifications,
  memoryCount,
  markRead,
  bottomOffset = 0,
}: MemoryBannerProps) {
  const theme = useTheme();

  if (memoryCount === 0) return null;

  const memoryIds = notifications
    .filter((n) => n.type === 'memory_promoted')
    .map((n) => n.id);

  const label =
    memoryCount === 1
      ? '✦ One of your sulat became a memory'
      : `✦ ${memoryCount} of your sulat became memories`;

  return (
    <Pressable
      onPress={() => markRead(memoryIds)}
      style={[
        styles.banner,
        { backgroundColor: theme.surface, bottom: bottomOffset },
      ]}
    >
      <Text style={[styles.text, { color: theme.pinMemory.body }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderTopColor: 'rgba(244,201,122,0.08)',
    borderTopWidth: 1,
    justifyContent: 'center',
    left: 0,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
  },
  text: {
    fontSize: 13,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/notifications/__tests__/MemoryBanner.test.tsx --no-coverage
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/notifications/MemoryBanner.tsx src/notifications/__tests__/MemoryBanner.test.tsx
git commit -m "feat: add MemoryBanner component"
```

---

## Task 6: useMyStories + MySulatRow Updates

**Files:**
- Modify: `src/profile/useMyStories.ts`
- Modify: `src/profile/MySulatRow.tsx`
- Create: `src/profile/__tests__/MySulatRow.test.tsx`

- [ ] **Step 1: Write the failing test for the memory badge**

```typescript
// src/profile/__tests__/MySulatRow.test.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { MySulatRow } from '../MySulatRow';
import type { MyStory } from '../useMyStories';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#fff',
    textMuted: '#888',
    accent: '#f4c97a',
    pinMemory: { body: '#d4a96a', glow: '#d4a96a', decoration: '✦' },
    id: 'lantern',
    name: 'Lantern Glow',
    description: '',
    mapStyle: '',
    background: '#0a0e22',
    fontFamily: 'serif',
    pin: { glow: '#f4c97a', body: '#f4c97a', pulseDuration: 2000 },
    heatmap: [],
    reactionTint: '#f4c97a',
  }),
}));

const baseStory: MyStory = {
  id: 'story-1',
  body: 'Hello world',
  location_label: 'Manila',
  created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
  reaction_count: 0,
  reply_count: 0,
  lat: 14.5995,
  lng: 120.9842,
  is_memory: false,
};

describe('MySulatRow', () => {
  it('does not show memory badge when is_memory is false', () => {
    const { queryByText } = render(
      <MySulatRow story={baseStory} isUnread={false} onNavigate={jest.fn()} />,
    );
    expect(queryByText('✦ memory')).toBeNull();
  });

  it('shows memory badge when is_memory is true', () => {
    const { getByText } = render(
      <MySulatRow
        story={{ ...baseStory, is_memory: true }}
        isUnread={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(getByText('✦ memory')).toBeTruthy();
  });

  it('shows both reaction badge and memory badge simultaneously', () => {
    const { getByText } = render(
      <MySulatRow
        story={{ ...baseStory, is_memory: true, reaction_count: 3 }}
        isUnread={false}
        onNavigate={jest.fn()}
      />,
    );
    expect(getByText('✦ 3')).toBeTruthy();
    expect(getByText('✦ memory')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest src/profile/__tests__/MySulatRow.test.tsx --no-coverage
```

Expected: FAIL — `is_memory` property does not exist on `MyStory`

- [ ] **Step 3: Update useMyStories.ts — add is_memory to interface, row type, SELECT, and mapping**

Replace the contents of `src/profile/useMyStories.ts`:

```typescript
// src/profile/useMyStories.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/data/supabase';

export interface MyStory {
  id: string;
  body: string;
  location_label: string | null;
  created_at: string;
  reaction_count: number;
  reply_count: number;
  lat: number;
  lng: number;
  is_memory: boolean;
}

export interface UseMyStoriesResult {
  stories: MyStory[];
  loading: boolean;
  error: Error | null;
}

type ReactionRow = { emoji: string };
type ReplyCountRow = { count: number };
type MyStoryRow = {
  id: string;
  body: string;
  location_label: string | null;
  created_at: string;
  lat: number;
  lng: number;
  is_memory: boolean;
  reactions: ReactionRow[];
  replies: ReplyCountRow[];
};

const SELECT = 'id, body, location_label, created_at, lat, lng, is_memory, reactions(emoji), replies(count)';

export function useMyStories(): UseMyStoriesResult {
  const [stories, setStories] = useState<MyStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id ?? null;

        if (!userId) {
          if (!cancelled) { setStories([]); setLoading(false); }
          return;
        }

        const { data, error: e } = await supabase
          .from('stories')
          .select(SELECT)
          .eq('author_id', userId)
          .eq('status', 'live')
          .order('created_at', { ascending: false });
        if (e) throw e;

        const rows = (data ?? []) as unknown as MyStoryRow[];
        const mapped: MyStory[] = rows.map((r) => ({
          id: r.id,
          body: r.body,
          location_label: r.location_label,
          created_at: r.created_at,
          reaction_count: r.reactions?.length ?? 0,
          reply_count: r.replies?.[0]?.count ?? 0,
          lat: r.lat,
          lng: r.lng,
          is_memory: r.is_memory ?? false,
        }));

        if (!cancelled) { setStories(mapped); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e as Error); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { stories, loading, error };
}
```

- [ ] **Step 4: Update MySulatRow.tsx — add memory badge**

Replace the contents of `src/profile/MySulatRow.tsx`:

```tsx
// src/profile/MySulatRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { MyStory } from './useMyStories';

export interface MySulatRowProps {
  story: MyStory;
  isUnread: boolean;
  onNavigate: () => void;
}

export function MySulatRow({ story, isUnread, onNavigate }: MySulatRowProps) {
  const theme = useTheme();
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;

  return (
    <Pressable
      onPress={onNavigate}
      style={[styles.row, { borderBottomColor: 'rgba(245,230,200,0.08)' }]}
    >
      <View style={styles.main}>
        <Text style={[styles.body, { color: theme.textPrimary }]} numberOfLines={2}>
          {story.body}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.metaTxt, { color: theme.textMuted }]}>
            {story.location_label ?? 'somewhere'}{' · '}{timeLabel}
          </Text>
          {story.reaction_count > 0 && (
            <Text style={[styles.badge, { color: theme.accent }]}>
              {`✦ ${story.reaction_count}`}
            </Text>
          )}
          {story.is_memory && (
            <Text style={[styles.memoryBadge, { color: theme.pinMemory.body }]}>✦ memory</Text>
          )}
          {isUnread && (
            <Text style={[styles.unreadDot, { color: theme.accent }]}>●</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  main: { flex: 1 },
  memoryBadge: { fontSize: 11, fontStyle: 'italic', marginLeft: 8 },
  meta: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  metaTxt: { fontSize: 11 },
  row: { borderBottomWidth: 1, paddingVertical: 12 },
  unreadDot: { fontSize: 8, marginLeft: 6 },
});
```

- [ ] **Step 5: Run all tests to confirm they pass**

```bash
npx jest src/profile/__tests__/MySulatRow.test.tsx --no-coverage
```

Expected: PASS — 3 tests passing

```bash
npx jest --no-coverage
```

Expected: all existing tests still passing (ProfileModal mocks MySulatRow as `() => null` so is unaffected by the prop change)

- [ ] **Step 6: Commit**

```bash
git add src/profile/useMyStories.ts src/profile/MySulatRow.tsx src/profile/__tests__/MySulatRow.test.tsx
git commit -m "feat: add is_memory to MyStory and ✦ memory badge to MySulatRow"
```

---

## Task 7: Wire into app/index.tsx

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Add imports and hook call**

In `app/index.tsx`, add these two imports near the top (after the existing imports):

```tsx
import { useNotifications } from '@/data/useNotifications';
import { MemoryBanner } from '@/notifications/MemoryBanner';
```

Inside the `Home()` function body, add the hook call after the existing `const theme = useTheme();` line:

```tsx
const { notifications, memoryCount, markRead } = useNotifications();
```

- [ ] **Step 2: Render MemoryBanner just above the bottom nav bar**

In the JSX return, add `<MemoryBanner>` directly before the `{/* Bottom nav bar */}` comment:

```tsx
      {/* Memory banner — floats above nav bar, disappears on tap */}
      <MemoryBanner
        notifications={notifications}
        memoryCount={memoryCount}
        markRead={markRead}
        bottomOffset={NAV_HEIGHT}
      />

      {/* Bottom nav bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface }]}>
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass

- [ ] **Step 4: Manual smoke test in browser**

```bash
npx expo start --web
```

1. Open `http://localhost:8081`
2. Log in as a user who has no stories older than 7 days → confirm no banner appears
3. In the Supabase dashboard, manually insert a test notification row:
   ```sql
   insert into public.notifications (user_id, type, story_id, payload)
   values (
     '<your-user-id>',
     'memory_promoted',
     null,
     '{}'
   );
   ```
4. Reload the page → confirm the banner appears: `✦ One of your sulat became a memory`
5. Tap the banner → confirm it disappears
6. Check Supabase dashboard: the `read_at` column on that row should now have a timestamp

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx
git commit -m "feat: mount useNotifications and MemoryBanner in home screen"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Section 1 (notifications table + RLS) → Task 1
- [x] Section 2 (promote-memories cron) → Tasks 2 + 3
- [x] Section 3 (useNotifications hook interface) → Task 4
- [x] Section 4 (MemoryBanner UI) → Task 5
- [x] Section 4 (MySulatRow memory badge) → Task 6
- [x] useNotifications called once in app/index.tsx → Task 7
- [x] Fail-open on fetch error → Task 4 implementation + test
- [x] markRead optimistic → Task 4 implementation + test
- [x] No polling (mounted once) → Task 4 implementation (single useEffect, no interval)
- [x] Service-role-only writes → Task 2 (function uses service role key, no client INSERT)

**What this plan intentionally omits (per spec):**
- Push notifications (web push / VAPID)
- Reply/reaction notification delivery (inserting new_reply/new_reaction rows)
- Notification inbox / history UI
