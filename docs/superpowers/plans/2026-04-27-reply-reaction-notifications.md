# Reply & Reaction Notification Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify story authors when someone replies to or reacts to their sulat — a 4-second auto-dismiss activity banner on app open, plus a persistent profile button badge that clears when the author opens their profile.

**Architecture:** Edge functions (`post-reply`, `react-story`) insert `new_reply`/`new_reaction` rows using the existing service-role client pattern (fire-and-forget, non-blocking). The `useNotifications` hook gains two derived fields (`activityCount`, `activityNotificationIds`) computed from the already-fetched `notifications` array — no new fetch. A new `ActivityBanner` component sits at the top of the screen and auto-dismisses via `setTimeout`. A badge dot overlays the profile button; opening the profile calls `markRead(activityNotificationIds)` optimistically.

**Tech Stack:** Supabase Edge Functions (Deno), Supabase JS v2, React Native Web, Expo Router, Jest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/useNotifications.ts` | Modify | Add `activityCount` + `activityNotificationIds` to interface and return |
| `src/data/__tests__/useNotifications.test.tsx` | Modify | Extend Harness, add 2 tests for new fields |
| `src/notifications/ActivityBanner.tsx` | Create | Top-positioned banner, 4s auto-dismiss, informational only |
| `src/notifications/__tests__/ActivityBanner.test.tsx` | Create | 7 tests: label variants + auto-dismiss |
| `app/index.tsx` | Modify | Wire ActivityBanner, profile badge dot, `openProfile` function |
| `supabase/functions/post-reply/index.ts` | Modify | Insert `new_reply` notification after reply (reuse `serviceSupa`) |
| `supabase/functions/react-story/index.ts` | Modify | Add `serviceSupa`, insert `new_reaction` after reaction added |

---

### Task 1: useNotifications — activityCount and activityNotificationIds

**Files:**
- Modify: `src/data/useNotifications.ts`
- Modify: `src/data/__tests__/useNotifications.test.tsx`

Background: `useNotifications` already fetches all unread notifications and exposes `memoryCount` (filtered to `memory_promoted`). We need two more derived values over the same array: a count and an ID list for `new_reply` + `new_reaction` rows. No new fetch. The existing test Harness renders `count-${memoryCount}` and `total-${notifications.length}` — we extend it to also render `activity-${activityCount}` and `ids-${activityNotificationIds.join(',')}` without touching existing assertions.

- [ ] **Step 1: Update the test Harness to render activity fields**

Open `src/data/__tests__/useNotifications.test.tsx`. Replace the `Harness` function (the one starting with `function Harness()`) with:

```tsx
function Harness() {
  const { notifications, memoryCount, activityCount, activityNotificationIds, markRead, loading } = useNotifications();
  if (loading) return <Text>loading</Text>;
  return (
    <>
      <Text>{`count-${memoryCount}`}</Text>
      <Text>{`total-${notifications.length}`}</Text>
      <Text>{`activity-${activityCount}`}</Text>
      <Text>{`ids-${activityNotificationIds.join(',')}`}</Text>
      <Pressable onPress={() => markRead(notifications.map((n) => n.id))}>
        <Text>mark-read</Text>
      </Pressable>
    </>
  );
}
```

- [ ] **Step 2: Add two failing tests at the bottom of the describe block**

Inside the `describe('useNotifications', ...)` block in the same file, add after the last existing `it(...)`:

```tsx
  it('activityCount counts new_reply and new_reaction but not memory_promoted', async () => {
    mockNotifications = [
      { id: 'n1', type: 'new_reply', story_id: 's1', payload: {}, created_at: '2026-01-01' },
      { id: 'n2', type: 'new_reaction', story_id: 's2', payload: { emoji: 'heart' }, created_at: '2026-01-02' },
      { id: 'n3', type: 'memory_promoted', story_id: 's3', payload: {}, created_at: '2026-01-03' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('activity-2')).toBeTruthy());
    expect(getByText('ids-n1,n2')).toBeTruthy();
  });

  it('activityCount is 0 and ids is empty when there are no activity notifications', async () => {
    mockNotifications = [
      { id: 'n1', type: 'memory_promoted', story_id: 's1', payload: {}, created_at: '2026-01-01' },
    ];
    const { getByText } = render(<Harness />);
    await waitFor(() => expect(getByText('activity-0')).toBeTruthy());
    expect(getByText('ids-')).toBeTruthy();
  });
```

- [ ] **Step 3: Run — expect 5 existing pass, 2 new fail**

```
npx jest src/data/__tests__/useNotifications.test.tsx --no-coverage
```

Expected: 5 pass, 2 fail with `TypeError` or `activityCount is not defined`.

- [ ] **Step 4: Extend the UseNotificationsResult interface**

In `src/data/useNotifications.ts`, replace the `UseNotificationsResult` interface:

```typescript
export interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;
  activityCount: number;
  activityNotificationIds: string[];
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}
```

- [ ] **Step 5: Compute the two derived values and update the return statement**

In `src/data/useNotifications.ts`, replace the final two lines of the hook body (the `memoryCount` line and the `return` line) with:

```typescript
  const memoryCount = notifications.filter((n) => n.type === 'memory_promoted').length;

  const activityNotifs = notifications.filter(
    (n) => n.type === 'new_reply' || n.type === 'new_reaction',
  );
  const activityCount = activityNotifs.length;
  const activityNotificationIds = activityNotifs.map((n) => n.id);

  return { notifications, memoryCount, activityCount, activityNotificationIds, markRead, loading };
```

- [ ] **Step 6: Run — expect all 7 to pass**

```
npx jest src/data/__tests__/useNotifications.test.tsx --no-coverage
```

Expected: 7 tests pass, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add src/data/useNotifications.ts src/data/__tests__/useNotifications.test.tsx
git commit -m "feat: add activityCount and activityNotificationIds to useNotifications"
```

---

### Task 2: ActivityBanner component

**Files:**
- Create: `src/notifications/ActivityBanner.tsx`
- Create: `src/notifications/__tests__/ActivityBanner.test.tsx`

Background: `MemoryBanner` (`src/notifications/MemoryBanner.tsx`) is tap-to-dismiss and sits at the bottom. `ActivityBanner` is different: it's informational (no `markRead` call), positioned at the top (below the floating header), and auto-dismisses after 4 seconds via a `setTimeout` in a `useEffect`. It does NOT use `Pressable` — it's a plain `View`. The `dismissed` local state starts `false`; the `useEffect` fires when `activityCount > 0` and sets a 4-second timer. The component returns `null` when `activityCount === 0` OR `dismissed === true`.

Label logic (all three branches must be present):
- Both: `"💬 3 new replies · 2 reactions"`
- Replies only: `"💬 2 new replies"` / `"💬 1 new reply"`
- Reactions only: `"💬 2 reactions"` / `"💬 1 reaction"`

- [ ] **Step 1: Write the test file**

Create `src/notifications/__tests__/ActivityBanner.test.tsx`:

```tsx
// src/notifications/__tests__/ActivityBanner.test.tsx
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { ActivityBanner } from '../ActivityBanner';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1d2e',
    accent: '#f4c97a',
  }),
}));

describe('ActivityBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when activityCount is 0', () => {
    const { queryByText } = render(
      <ActivityBanner activityCount={0} replyCount={0} reactionCount={0} />,
    );
    expect(queryByText(/💬/)).toBeNull();
  });

  it('shows singular reply label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={1} replyCount={1} reactionCount={0} />,
    );
    expect(getByText('💬 1 new reply')).toBeTruthy();
  });

  it('shows plural reply label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={3} replyCount={3} reactionCount={0} />,
    );
    expect(getByText('💬 3 new replies')).toBeTruthy();
  });

  it('shows singular reaction label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={1} replyCount={0} reactionCount={1} />,
    );
    expect(getByText('💬 1 reaction')).toBeTruthy();
  });

  it('shows plural reaction label', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={2} replyCount={0} reactionCount={2} />,
    );
    expect(getByText('💬 2 reactions')).toBeTruthy();
  });

  it('shows combined label with both counts', () => {
    const { getByText } = render(
      <ActivityBanner activityCount={5} replyCount={3} reactionCount={2} />,
    );
    expect(getByText('💬 3 new replies · 2 reactions')).toBeTruthy();
  });

  it('auto-dismisses after 4 seconds', async () => {
    const { getByText, queryByText } = render(
      <ActivityBanner activityCount={2} replyCount={2} reactionCount={0} />,
    );
    expect(getByText('💬 2 new replies')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    await waitFor(() => expect(queryByText('💬 2 new replies')).toBeNull());
  });
});
```

- [ ] **Step 2: Run — expect all 7 to fail with module not found**

```
npx jest src/notifications/__tests__/ActivityBanner.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../ActivityBanner'`

- [ ] **Step 3: Create ActivityBanner.tsx**

Create `src/notifications/ActivityBanner.tsx`:

```tsx
// src/notifications/ActivityBanner.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ActivityBannerProps {
  activityCount: number;
  replyCount: number;
  reactionCount: number;
  topOffset?: number;
}

export function ActivityBanner({
  activityCount,
  replyCount,
  reactionCount,
  topOffset = 100,
}: ActivityBannerProps) {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (activityCount === 0) return;
    const timer = setTimeout(() => setDismissed(true), 4000);
    return () => clearTimeout(timer);
  }, [activityCount]);

  if (activityCount === 0 || dismissed) return null;

  const replyLabel = replyCount === 1 ? '1 new reply' : `${replyCount} new replies`;
  const reactionLabel = reactionCount === 1 ? '1 reaction' : `${reactionCount} reactions`;

  let label: string;
  if (replyCount > 0 && reactionCount > 0) {
    label = `💬 ${replyLabel} · ${reactionLabel}`;
  } else if (replyCount > 0) {
    label = `💬 ${replyLabel}`;
  } else {
    label = `💬 ${reactionLabel}`;
  }

  return (
    <View style={[styles.banner, { backgroundColor: theme.surface, top: topOffset }]}>
      <Text style={[styles.text, { color: theme.accent }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderBottomColor: 'rgba(244,201,122,0.08)',
    borderBottomWidth: 1,
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

- [ ] **Step 4: Run — expect all 7 to pass**

```
npx jest src/notifications/__tests__/ActivityBanner.test.tsx --no-coverage
```

Expected: 7 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/ActivityBanner.tsx src/notifications/__tests__/ActivityBanner.test.tsx
git commit -m "feat: add ActivityBanner with 4s auto-dismiss"
```

---

### Task 3: app/index.tsx — profile badge, openProfile, ActivityBanner render

**Files:**
- Modify: `app/index.tsx`

Background: `app/index.tsx` already imports `useNotifications` and `MemoryBanner` and calls `useNotifications()` on line 64. We need to: (1) pull `activityCount` and `activityNotificationIds` from the hook, (2) compute `replyCount` and `reactionCount` from `notifications`, (3) extract an `openProfile` function that calls `markRead` before opening, (4) add a `●` badge dot to the profile button, (5) render `<ActivityBanner>` just above `<MemoryBanner>`, and (6) add the `profileBadge` style. No automated test for `app/index.tsx` — verify via TypeScript check and code inspection.

- [ ] **Step 1: Add ActivityBanner import**

In `app/index.tsx`, after the `MemoryBanner` import line (line 20):

```tsx
import { MemoryBanner } from '@/notifications/MemoryBanner';
import { ActivityBanner } from '@/notifications/ActivityBanner';
```

- [ ] **Step 2: Extend the hook destructure and compute reply/reaction counts**

Line 64 currently reads:
```tsx
  const { notifications, memoryCount, markRead } = useNotifications();
```

Replace with:
```tsx
  const { notifications, memoryCount, activityCount, activityNotificationIds, markRead } = useNotifications();
  const replyCount = notifications.filter((n) => n.type === 'new_reply').length;
  const reactionCount = notifications.filter((n) => n.type === 'new_reaction').length;
```

- [ ] **Step 3: Extract the openProfile function**

After the `closeAllSheets` function definition (around line 72), add `openProfile` directly below it:

```tsx
  const openProfile = () => {
    closeAllSheets();
    if (activityNotificationIds.length > 0) {
      markRead(activityNotificationIds);
    }
    setProfileOpen(true);
  };
```

- [ ] **Step 4: Update the profile button Pressable**

Find the profile button (lines 114–119):
```tsx
          <Pressable
            onPress={() => { closeAllSheets(); setProfileOpen(true); }}
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
          </Pressable>
```

Replace with:
```tsx
          <Pressable
            onPress={openProfile}
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
            {activityCount > 0 && (
              <Text style={[styles.profileBadge, { color: theme.accent }]}>●</Text>
            )}
          </Pressable>
```

- [ ] **Step 5: Add ActivityBanner just above the MemoryBanner**

Find the MemoryBanner comment and render (lines 180–186):
```tsx
      {/* Memory banner — floats above nav bar, disappears on tap */}
      <MemoryBanner
        notifications={notifications}
        memoryCount={memoryCount}
        markRead={markRead}
        bottomOffset={NAV_HEIGHT}
      />
```

Insert `ActivityBanner` immediately before it:
```tsx
      {/* Activity banner — floats below header, auto-dismisses after 4s */}
      <ActivityBanner
        activityCount={activityCount}
        replyCount={replyCount}
        reactionCount={reactionCount}
        topOffset={100}
      />

      {/* Memory banner — floats above nav bar, disappears on tap */}
      <MemoryBanner
        notifications={notifications}
        memoryCount={memoryCount}
        markRead={markRead}
        bottomOffset={NAV_HEIGHT}
      />
```

- [ ] **Step 6: Add the profileBadge style**

In the `StyleSheet.create({...})` block, find the `profileIcon` style:
```ts
  profileIcon: { fontSize: 16 },
```

Add `profileBadge` directly after it:
```ts
  profileIcon: { fontSize: 16 },
  profileBadge: {
    fontSize: 8,
    position: 'absolute',
    right: -2,
    top: -2,
  },
```

- [ ] **Step 7: TypeScript check**

```
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add app/index.tsx
git commit -m "feat: wire ActivityBanner and profile badge dot to home screen"
```

---

### Task 4: post-reply edge function — insert new_reply notification

**Files:**
- Modify: `supabase/functions/post-reply/index.ts`

Background: `post-reply` already creates a `serviceSupa` client (lines 89–92) for the audit log. We reuse that same instance — do NOT create a second one. The notification block goes between the audit log block and the final `return` statement. It looks up the story's `author_id` via `serviceSupa` (service role bypasses RLS), skips the insert if replier is the author (`author_id !== authUser.user.id`), logs any errors, and never blocks the reply response. The existing `data.id` (reply ID) is available — we don't pass it in the payload since the spec says `payload: {}`.

- [ ] **Step 1: Insert the notification block after the audit log**

In `supabase/functions/post-reply/index.ts`, find the comment `// intentionally non-blocking — reply is already live` (line 104). Insert the following block immediately after it (before the `return new Response(...)` on line 106):

```typescript
  // ── Reply notification ────────────────────────────────────────────────────
  // Reuses the serviceSupa client created above for the audit log.
  // Fire-and-forget — a failed notification never blocks the reply response.
  const { data: notifStoryRow, error: notifStoryErr } = await serviceSupa
    .from('stories')
    .select('author_id')
    .eq('id', payload.story_id)
    .single();

  if (notifStoryErr) {
    console.error('[post-reply] notification story lookup error:', notifStoryErr.message);
  } else if (notifStoryRow && notifStoryRow.author_id !== authUser.user.id) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reply',
      story_id: payload.story_id,
      payload: {},
    });
    if (notifErr) {
      console.error('[post-reply] notification insert error:', notifErr.message);
    }
  }
  // intentionally non-blocking — reply is already live
```

The complete end of the function (from the audit log onward) should now look like this:

```typescript
  // ── Audit log ─────────────────────────────────────────────────────────────
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const { error: auditError } = await serviceSupa.from('moderation_events').insert({
    target_type: 'reply',
    target_id: data.id,
    verdict: modResult.verdict,
    service: modResult.service,
    crisis_score: modResult.crisisScore,
    metadata: { story_id: payload.story_id },
  });
  if (auditError) {
    console.error('[moderation_events] audit write failed:', auditError.message);
  }
  // intentionally non-blocking — reply is already live

  // ── Reply notification ────────────────────────────────────────────────────
  const { data: notifStoryRow, error: notifStoryErr } = await serviceSupa
    .from('stories')
    .select('author_id')
    .eq('id', payload.story_id)
    .single();

  if (notifStoryErr) {
    console.error('[post-reply] notification story lookup error:', notifStoryErr.message);
  } else if (notifStoryRow && notifStoryRow.author_id !== authUser.user.id) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reply',
      story_id: payload.story_id,
      payload: {},
    });
    if (notifErr) {
      console.error('[post-reply] notification insert error:', notifErr.message);
    }
  }
  // intentionally non-blocking — reply is already live

  return new Response(JSON.stringify({ id: data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
```

- [ ] **Step 2: Verify by inspection — check these four things**

1. `serviceSupa` is used, not re-declared with `const serviceSupa = createClient(...)` a second time
2. The condition is `notifStoryRow.author_id !== authUser.user.id` (non-self-notification)
3. Both the story lookup error and insert error are `console.error`'d but do not cause a non-200 response
4. The `return new Response(JSON.stringify({ id: data.id }), ...)` comes AFTER the notification block

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/post-reply/index.ts
git commit -m "feat: insert new_reply notification in post-reply edge function"
```

---

### Task 5: react-story edge function — insert new_reaction notification

**Files:**
- Modify: `supabase/functions/react-story/index.ts`

Background: `react-story` currently uses only the anon-key `supa` client — there is no `serviceSupa`. We add one. The notification only fires when the reaction is **added** (not removed). The "Toggle off" branch (lines 54–61) already returns early, so we only need to add code at the end of the "Toggle on — insert" path. The `userId` variable (set on line 43 as `authUser.user.id`) is already available. The emoji goes into `payload: { emoji: payload.emoji }` for future UI use.

- [ ] **Step 1: Replace the "Toggle on — insert" return with the notification block + return**

In `supabase/functions/react-story/index.ts`, find the final `return new Response(JSON.stringify({ action: 'added' }), ...)` block (lines 73–76):

```typescript
  return new Response(JSON.stringify({ action: 'added' }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
```

Replace it with (keep the return — just insert the notification block before it):

```typescript
  // ── Reaction notification ─────────────────────────────────────────────────
  // Only fires on 'added' — the toggle-off branch returns early above.
  // Fire-and-forget — a failed notification never blocks the reaction response.
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: notifStoryRow, error: notifStoryErr } = await serviceSupa
    .from('stories')
    .select('author_id')
    .eq('id', payload.story_id)
    .single();

  if (notifStoryErr) {
    console.error('[react-story] notification story lookup error:', notifStoryErr.message);
  } else if (notifStoryRow && notifStoryRow.author_id !== userId) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reaction',
      story_id: payload.story_id,
      payload: { emoji: payload.emoji },
    });
    if (notifErr) {
      console.error('[react-story] notification insert error:', notifErr.message);
    }
  }
  // intentionally non-blocking — reaction is already live

  return new Response(JSON.stringify({ action: 'added' }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
```

The complete end of the file (from the "Toggle on" comment) should now look like this:

```typescript
  // Toggle on — insert
  const { error } = await supa.from('reactions').insert({
    story_id: payload.story_id,
    user_id: userId,
    emoji: payload.emoji,
  });

  if (error) return new Response(error.message, { status: 400, headers: cors });

  // ── Reaction notification ─────────────────────────────────────────────────
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: notifStoryRow, error: notifStoryErr } = await serviceSupa
    .from('stories')
    .select('author_id')
    .eq('id', payload.story_id)
    .single();

  if (notifStoryErr) {
    console.error('[react-story] notification story lookup error:', notifStoryErr.message);
  } else if (notifStoryRow && notifStoryRow.author_id !== userId) {
    const { error: notifErr } = await serviceSupa.from('notifications').insert({
      user_id: notifStoryRow.author_id,
      type: 'new_reaction',
      story_id: payload.story_id,
      payload: { emoji: payload.emoji },
    });
    if (notifErr) {
      console.error('[react-story] notification insert error:', notifErr.message);
    }
  }
  // intentionally non-blocking — reaction is already live

  return new Response(JSON.stringify({ action: 'added' }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
```

- [ ] **Step 2: Verify by inspection — check these five things**

1. `serviceSupa` uses `SUPABASE_SERVICE_ROLE_KEY` (not the anon key)
2. The condition is `notifStoryRow.author_id !== userId` (non-self-notification; `userId` is `authUser.user.id` set at line 43)
3. `payload: { emoji: payload.emoji }` — emoji is stored for future UI use
4. The "Toggle off" branch (returns `{ action: 'removed' }`) is unchanged — no notification path reached there
5. Notification block is AFTER the `if (error) return ...` guard for the insert, so it only runs on successful reaction add

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/react-story/index.ts
git commit -m "feat: insert new_reaction notification in react-story edge function"
```

---

## Deploy edge functions

After all tasks are committed, deploy both modified edge functions:

```bash
npx supabase functions deploy post-reply
npx supabase functions deploy react-story
```

Run these from the project root (`C:\Users\emman\OneDrive\Desktop\ClaudeBusiness\cozy-map-app`). Both commands should print `Deployed Functions post-reply / react-story`.
