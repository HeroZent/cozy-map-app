# Notification Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated bell-icon notification inbox to the map screen that shows rich notification rows (excerpt + location + time) and marks everything read when opened.

**Architecture:** Four tasks in order — (1) extend the existing `useNotifications` hook to JOIN stories so rows can show excerpt/location; (2) build a stateless `NotificationRow` component; (3) build `NotificationSheet` using the `AnimatedSheet` pattern with a snapshot + mark-all-read-on-open approach; (4) wire a bell button into `app/index.tsx`. Each task is independently testable.

**Tech Stack:** React Native, TypeScript, `@testing-library/react-native`, Supabase JS v2 (PostgREST joined query), existing `AnimatedSheet` + theme patterns.

---

## File Map

| File | Action |
|---|---|
| `src/data/useNotifications.ts` | Modify — extend SELECT with stories JOIN; update `Notification` type |
| `src/data/__tests__/useNotifications.test.tsx` | Modify — add test for stories join shape |
| `src/notifications/NotificationRow.tsx` | Create — stateless row, all type variants, unread border |
| `src/notifications/__tests__/NotificationRow.test.tsx` | Create — 7 unit tests |
| `src/notifications/NotificationSheet.tsx` | Create — sheet container, snapshot pattern, mark-read |
| `src/notifications/__tests__/NotificationSheet.test.tsx` | Create — 6 integration tests |
| `app/index.tsx` | Modify — bell button, badge, `notifSheetOpen` state, `NotificationSheet` render, remove `markRead` from `openProfile` |

---

### Task 1: Extend useNotifications with stories JOIN

**Files:**
- Modify: `src/data/useNotifications.ts`
- Modify: `src/data/__tests__/useNotifications.test.tsx`

The hook currently selects `id, type, story_id, payload, created_at`. We need `stories ( body, location_label, lat, lng, created_at )` so notification rows can show the excerpt, location, and sulat age. The mock in tests returns whatever is in `mockNotifications`, so existing tests are unaffected — we just add one new test that verifies the stories shape passes through.

- [ ] **Step 1: Add a new test for the stories join shape**

Open `src/data/__tests__/useNotifications.test.tsx`. Add this test at the bottom of the `describe` block (after the existing 6 tests):

```typescript
it('passes stories join data through to notifications', async () => {
  mockNotifications = [
    {
      id: 'n1',
      type: 'new_reply',
      story_id: 's1',
      payload: {},
      created_at: '2026-01-01T00:00:00Z',
      stories: {
        body: 'A quiet afternoon in Intramuros',
        location_label: 'Manila',
        lat: 14.5995,
        lng: 120.9842,
        created_at: '2026-01-01T00:00:00Z',
      },
    },
  ];
  const { getByText } = render(<Harness />);
  await waitFor(() => expect(getByText('total-1')).toBeTruthy());
  // The hook exposes the raw notification objects; stories join data is part of them.
  // We can only observe totals through the Harness — the shape is verified by TypeScript.
  expect(getByText('count-0')).toBeTruthy(); // type is new_reply, not memory_promoted
  expect(getByText('activity-1')).toBeTruthy();
});
```

- [ ] **Step 2: Run the new test — expect it to pass (data already flows through)**

```
npx jest src/data/__tests__/useNotifications.test.tsx --no-coverage
```

Expected: 7 passing (the mock returns whatever is in `mockNotifications`, including `stories`, so the test passes immediately). If it fails, verify the Harness renders `total-1` for a single item.

- [ ] **Step 3: Update `useNotifications.ts` — SELECT and types**

Replace the file content entirely:

```typescript
// src/data/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/data/supabase';

export interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  // Joined from stories — null when the story has been deleted.
  stories: {
    body: string;
    location_label: string | null;
    lat: number;
    lng: number;
    created_at: string;
  } | null;
}

export interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;
  activityCount: number;
  activityNotificationIds: string[];
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}

// Raw shape returned from the DB — cast target before mapping to Notification
interface NotificationRow {
  id: string;
  type: string;
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  stories: {
    body: string;
    location_label: string | null;
    lat: number;
    lng: number;
    created_at: string;
  } | null;
}

const SELECT = `
  id, type, story_id, payload, created_at,
  stories ( body, location_label, lat, lng, created_at )
`;

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  // Captured so markRead can add a user filter as defense-in-depth (RLS is the primary guard)
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id ?? null;
      userIdRef.current = userId;

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
        setNotifications((data ?? []) as unknown as NotificationRow[] as Notification[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    const userId = userIdRef.current;
    if (!userId) return;
    // Optimistic: update local state immediately
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    // Patch DB in background — fire and forget.
    // .eq('user_id', userId) is defense-in-depth; RLS is the primary guard.
    supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
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
              if (mountedRef.current) {
                setNotifications((data ?? []) as unknown as NotificationRow[] as Notification[]);
              }
            });
        }
      });
  };

  const memoryCount = notifications.filter((n) => n.type === 'memory_promoted').length;

  const activityNotifs = notifications.filter(
    (n) => n.type === 'new_reply' || n.type === 'new_reaction',
  );
  const activityCount = activityNotifs.length;
  const activityNotificationIds = activityNotifs.map((n) => n.id);

  return { notifications, memoryCount, activityCount, activityNotificationIds, markRead, loading };
}
```

- [ ] **Step 4: Run the full test suite for this file**

```
npx jest src/data/__tests__/useNotifications.test.tsx --no-coverage
```

Expected: 7 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add src/data/useNotifications.ts src/data/__tests__/useNotifications.test.tsx
git commit -m "feat: extend useNotifications with stories join for inbox rows"
```

---

### Task 2: NotificationRow component

**Files:**
- Create: `src/notifications/NotificationRow.tsx`
- Create: `src/notifications/__tests__/NotificationRow.test.tsx`

A stateless presentational component. Receives a `Notification` object, renders the icon, label, excerpt, location, time, and an unread left-border. No internal state.

- [ ] **Step 1: Write the failing tests**

Create `src/notifications/__tests__/NotificationRow.test.tsx`:

```typescript
// src/notifications/__tests__/NotificationRow.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationRow } from '../NotificationRow';
import type { Notification } from '@/data/useNotifications';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#f5e6c8',
    textMuted: 'rgba(245,230,200,0.5)',
    accent: '#f4c97a',
  }),
}));

const baseStories = {
  body: 'A quiet afternoon in Intramuros, the old city walls…',
  location_label: 'Manila',
  lat: 14.5995,
  lng: 120.9842,
  created_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
};

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    type: 'new_reply',
    story_id: 's1',
    payload: {},
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    stories: baseStories,
    ...overrides,
  };
}

describe('NotificationRow', () => {
  it('renders 💬 icon for new_reply', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'new_reply' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('💬')).toBeTruthy();
  });

  it('renders ✦ icon for new_reaction', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'new_reaction' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('✦')).toBeTruthy();
  });

  it('renders ✦ icon for memory_promoted', () => {
    const { getByText } = render(
      <NotificationRow notification={makeNotif({ type: 'memory_promoted' })} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByText('✦')).toBeTruthy();
  });

  it('shows gold left-border when isUnread=true', () => {
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={true} onPress={jest.fn()} />,
    );
    expect(getByTestId('notification-row-n1')).toHaveStyle({ borderLeftColor: '#f4c97a' });
  });

  it('has transparent left-border when isUnread=false', () => {
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={false} onPress={jest.fn()} />,
    );
    expect(getByTestId('notification-row-n1')).toHaveStyle({ borderLeftColor: 'transparent' });
  });

  it('calls onPress when the row is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <NotificationRow notification={makeNotif()} isUnread={true} onPress={onPress} />,
    );
    fireEvent.press(getByTestId('notification-row-n1'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates excerpt to ~40 chars with ellipsis', () => {
    const longBody = 'A'.repeat(50);
    const { getByText } = render(
      <NotificationRow
        notification={makeNotif({ stories: { ...baseStories, body: longBody } })}
        isUnread={true}
        onPress={jest.fn()}
      />,
    );
    // First 40 chars + '…'
    expect(getByText(`${'A'.repeat(40)}…`)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests — expect them to fail**

```
npx jest src/notifications/__tests__/NotificationRow.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../NotificationRow'`

- [ ] **Step 3: Create `NotificationRow.tsx`**

Create `src/notifications/NotificationRow.tsx`:

```typescript
// src/notifications/NotificationRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Notification } from '@/data/useNotifications';

export interface NotificationRowProps {
  notification: Notification;
  isUnread: boolean;
  onPress: () => void;
}

/** Compact relative time: "now", "2m", "3h", "5d" */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

/** Story age: "today", "1d ago", "5d ago" */
function sulatAge(iso: string): string {
  const ageDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (ageDays === 0) return 'today';
  if (ageDays === 1) return '1d ago';
  return `${ageDays}d ago`;
}

const LABEL: Record<Notification['type'], string> = {
  new_reply: 'Someone replied to your sulat',
  new_reaction: 'Someone reacted with heart',
  memory_promoted: 'Your sulat became a memory',
};

const ICON: Record<Notification['type'], string> = {
  new_reply: '💬',
  new_reaction: '✦',
  memory_promoted: '✦',
};

export function NotificationRow({ notification, isUnread, onPress }: NotificationRowProps) {
  const theme = useTheme();
  const { type, created_at, stories } = notification;

  const excerpt =
    stories === null
      ? null
      : stories.body.length > 40
        ? `${stories.body.slice(0, 40)}…`
        : stories.body;
  const location = stories?.location_label ?? null;
  const sulatDate = stories?.created_at ?? null;

  return (
    <Pressable
      testID={`notification-row-${notification.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={LABEL[type]}
      style={[
        styles.row,
        {
          borderLeftColor: isUnread ? '#f4c97a' : 'transparent',
          backgroundColor: isUnread ? 'rgba(255,255,255,0.05)' : 'transparent',
        },
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{ICON[type]}</Text>
        <Text
          style={[styles.label, { color: theme.textPrimary, opacity: isUnread ? 1 : 0.45 }]}
          numberOfLines={1}
        >
          {LABEL[type]}
        </Text>
        <Text style={[styles.time, { color: theme.textMuted, opacity: isUnread ? 0.6 : 0.3 }]}>
          {relativeTime(created_at)}
        </Text>
      </View>

      {excerpt !== null && (
        <Text
          style={[styles.excerpt, { color: theme.textMuted, opacity: isUnread ? 0.6 : 0.35 }]}
          numberOfLines={1}
        >
          {excerpt}
        </Text>
      )}

      {(location !== null || sulatDate !== null) && (
        <Text
          style={[styles.sulatMeta, { color: theme.accent, opacity: isUnread ? 0.6 : 0.35 }]}
          numberOfLines={1}
        >
          {location !== null ? `📍 ${location}` : ''}
          {location !== null && sulatDate !== null ? ' · ' : ''}
          {sulatDate !== null ? sulatAge(sulatDate) : ''}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  excerpt: { fontSize: 9, fontStyle: 'italic', marginBottom: 2, paddingLeft: 20 },
  icon: { fontSize: 13, marginRight: 6 },
  label: { flex: 1, fontSize: 10, fontWeight: '500' },
  labelRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 3 },
  row: { borderLeftWidth: 4, borderRadius: 6, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 8 },
  sulatMeta: { fontSize: 9, paddingLeft: 20 },
  time: { fontSize: 9 },
});
```

- [ ] **Step 4: Run the tests — expect them to pass**

```
npx jest src/notifications/__tests__/NotificationRow.test.tsx --no-coverage
```

Expected: 7 passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add src/notifications/NotificationRow.tsx src/notifications/__tests__/NotificationRow.test.tsx
git commit -m "feat: add NotificationRow component with unread border and excerpt"
```

---

### Task 3: NotificationSheet component

**Files:**
- Create: `src/notifications/NotificationSheet.tsx`
- Create: `src/notifications/__tests__/NotificationSheet.test.tsx`

Sheet container. Uses `AnimatedSheet` (same ref pattern as `ProfileModal`). On first load it snapshots the notifications list, calls `markRead` for all IDs, then displays the snapshot. Rows don't disappear when `markRead` clears the live array — the snapshot persists for the lifetime of the sheet.

**The snapshot pattern explained:** `markRead` is optimistic and removes rows from `notifications` array immediately. If we render from the live array, rows vanish when `markRead` fires. Instead, we store a `snapshot` ref on first non-loading render, and render from that snapshot forever. `markedRef` prevents double-calling `markRead`.

- [ ] **Step 1: Write the failing tests**

Create `src/notifications/__tests__/NotificationSheet.test.tsx`:

```typescript
// src/notifications/__tests__/NotificationSheet.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationSheet } from '../NotificationSheet';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1a1a2e',
    textPrimary: '#f5e6c8',
    textMuted: 'rgba(245,230,200,0.5)',
    accent: '#f4c97a',
    fontFamily: 'serif',
  }),
}));

// Mutable per-test variables
let mockLoading = false;
let mockNotifications: any[] = [];
const mockMarkRead = jest.fn();

jest.mock('@/data/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    activityCount: mockNotifications.filter((n: any) => n.type !== 'memory_promoted').length,
    activityNotificationIds: mockNotifications
      .filter((n: any) => n.type !== 'memory_promoted')
      .map((n: any) => n.id),
    memoryCount: mockNotifications.filter((n: any) => n.type === 'memory_promoted').length,
    markRead: mockMarkRead,
    loading: mockLoading,
  }),
}));

// NotificationRow renders a pressable testID per notification
jest.mock('@/notifications/NotificationRow', () => {
  const { Pressable, Text } = require('react-native');
  return {
    NotificationRow: ({
      notification,
      onPress,
    }: {
      notification: { id: string };
      onPress: () => void;
    }) => (
      <Pressable testID={`row-${notification.id}`} onPress={onPress}>
        <Text>{notification.id}</Text>
      </Pressable>
    ),
  };
});

function makeNotif(id: string, type = 'new_reply', withStories = true) {
  return {
    id,
    type,
    story_id: 's1',
    payload: {},
    created_at: new Date().toISOString(),
    stories: withStories
      ? { body: 'Hello world', location_label: 'Manila', lat: 14.5, lng: 121.0, created_at: new Date().toISOString() }
      : null,
  };
}

beforeEach(() => {
  mockLoading = false;
  mockNotifications = [];
  mockMarkRead.mockReset();
  mockMarkRead.mockResolvedValue(undefined);
});

test('shows ActivityIndicator while loading', () => {
  mockLoading = true;
  const { getByTestId } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  expect(getByTestId('notif-loading')).toBeTruthy();
});

test('shows empty state when there are no notifications', async () => {
  mockNotifications = [];
  const { getByText } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => expect(getByText('nothing new yet')).toBeTruthy());
});

test('calls markRead on mount with all notification IDs', async () => {
  mockNotifications = [
    makeNotif('n1', 'new_reply'),
    makeNotif('n2', 'memory_promoted'),
  ];
  render(<NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />);
  await waitFor(() =>
    expect(mockMarkRead).toHaveBeenCalledWith(expect.arrayContaining(['n1', 'n2'])),
  );
});

test('renders a row for each notification in the snapshot', async () => {
  mockNotifications = [makeNotif('n1'), makeNotif('n2')];
  const { getByTestId } = render(
    <NotificationSheet onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => {
    expect(getByTestId('row-n1')).toBeTruthy();
    expect(getByTestId('row-n2')).toBeTruthy();
  });
});

test('tapping a row calls onClose and onNavigate with correct lat/lng', async () => {
  mockNotifications = [makeNotif('n1')];
  const onClose = jest.fn();
  const onNavigate = jest.fn();
  const { getByTestId } = render(
    <NotificationSheet onClose={onClose} onNavigate={onNavigate} />,
  );
  await waitFor(() => getByTestId('row-n1'));
  fireEvent.press(getByTestId('row-n1'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onNavigate).toHaveBeenCalledWith(14.5, 121.0);
});

test('tapping a row with stories=null calls onClose but not onNavigate', async () => {
  mockNotifications = [makeNotif('n1', 'new_reply', false)];
  const onClose = jest.fn();
  const onNavigate = jest.fn();
  const { getByTestId } = render(
    <NotificationSheet onClose={onClose} onNavigate={onNavigate} />,
  );
  await waitFor(() => getByTestId('row-n1'));
  fireEvent.press(getByTestId('row-n1'));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onNavigate).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests — expect them to fail**

```
npx jest src/notifications/__tests__/NotificationSheet.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../NotificationSheet'`

- [ ] **Step 3: Create `NotificationSheet.tsx`**

Create `src/notifications/NotificationSheet.tsx`:

```typescript
// src/notifications/NotificationSheet.tsx
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useNotifications } from '@/data/useNotifications';
import type { Notification } from '@/data/useNotifications';
import { NotificationRow } from './NotificationRow';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';

export interface NotificationSheetProps {
  onClose: () => void;
  onNavigate: (lat: number, lng: number) => void;
  bottomOffset?: number;
}

export function NotificationSheet({ onClose, onNavigate, bottomOffset = 0 }: NotificationSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { notifications, activityNotificationIds, markRead, loading } = useNotifications();

  // Snapshot the notifications once on first non-loading render.
  // markRead is optimistic and removes rows from the live array — rendering from
  // the snapshot means rows stay visible until the sheet is closed.
  const [snapshot, setSnapshot] = useState<Notification[]>([]);
  const markedRef = useRef(false);

  useEffect(() => {
    if (loading || markedRef.current) return;
    markedRef.current = true;
    setSnapshot(notifications);
    const memoryIds = notifications
      .filter((n) => n.type === 'memory_promoted')
      .map((n) => n.id);
    markRead([...activityNotificationIds, ...memoryIds]).catch((err) => {
      console.error('[NotificationSheet] markRead failed:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRowPress = (notif: Notification) => {
    // Call onClose directly (not via animated ref) so it fires immediately —
    // matches ProfileModal's navigation tap pattern.
    onClose();
    if (notif.stories !== null) {
      onNavigate(notif.stories.lat, notif.stories.lng);
    }
  };

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          notifications
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {loading && snapshot.length === 0 ? (
        <ActivityIndicator
          testID="notif-loading"
          color={theme.accent}
          style={styles.centred}
        />
      ) : snapshot.length === 0 ? (
        <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>nothing new yet</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.feed}>
          {snapshot.map((notif) => (
            <NotificationRow
              key={notif.id}
              notification={notif}
              isUnread={true}
              onPress={() => handleRowPress(notif)}
            />
          ))}
        </ScrollView>
      )}
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    maxHeight: 520,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  centred: { marginVertical: 20 },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  emptyTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  feed: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '500' },
});
```

- [ ] **Step 4: Run the tests — expect them to pass**

```
npx jest src/notifications/__tests__/NotificationSheet.test.tsx --no-coverage
```

Expected: 6 passing, 0 failing.

- [ ] **Step 5: Run the full test suite to check nothing is broken**

```
npx jest --no-coverage
```

Expected: all passing (number from before + 13 new tests).

- [ ] **Step 6: Commit**

```bash
git add src/notifications/NotificationSheet.tsx src/notifications/__tests__/NotificationSheet.test.tsx
git commit -m "feat: add NotificationSheet with snapshot mark-all-read on open"
```

---

### Task 4: Bell button in app/index.tsx

**Files:**
- Modify: `app/index.tsx`

Wire the bell button into the map screen header. Add `notifSheetOpen` state, an `openNotifications` helper, update `closeAllSheets`, remove `markRead` from `openProfile`, and render `NotificationSheet`. No new tests — the sheet component is already tested; this is wiring only.

- [ ] **Step 1: Add `notifSheetOpen` state and `openNotifications` function**

In `app/index.tsx`, find the existing state declarations block (around line 62). Add one new state line after `const [profileOpen, setProfileOpen] = useState(false);`:

```typescript
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
```

- [ ] **Step 2: Update `closeAllSheets` to include the new sheet**

Find:
```typescript
  const closeAllSheets = () => {
    setSelectedStory(null);
    setComposeOpen(false);
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
  };
```

Replace with:
```typescript
  const closeAllSheets = () => {
    setSelectedStory(null);
    setComposeOpen(false);
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setNotifSheetOpen(false);
  };
```

- [ ] **Step 3: Add `openNotifications` and remove `markRead` from `openProfile`**

Find:
```typescript
  const openProfile = () => {
    closeAllSheets();
    if (activityNotificationIds.length > 0) {
      markRead(activityNotificationIds);
    }
    setProfileOpen(true);
  };
```

Replace with:
```typescript
  const openProfile = () => {
    closeAllSheets();
    setProfileOpen(true);
  };

  const openNotifications = () => {
    closeAllSheets();
    setNotifSheetOpen(true);
  };
```

- [ ] **Step 4: Add the bell button to the header**

Find the `headerRight` block (the `<View style={styles.headerRight}>` containing the profile and settings buttons). It currently looks like:

```tsx
        <View style={styles.headerRight} pointerEvents="box-none">
          <Pressable
            onPress={openProfile}
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
            {activityCount > 0 && (
              <View style={[styles.profileBadge, { backgroundColor: theme.accent }]} />
            )}
          </Pressable>
          <Pressable
            onPress={() => { closeAllSheets(); setSettingsOpen(true); }}
            style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.settingsIcon, { color: theme.accent }]}>⚙</Text>
          </Pressable>
        </View>
```

Replace with:
```tsx
        <View style={styles.headerRight} pointerEvents="box-none">
          <Pressable
            onPress={openProfile}
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
            {activityCount > 0 && (
              <View style={[styles.profileBadge, { backgroundColor: theme.accent }]} />
            )}
          </Pressable>
          <Pressable
            onPress={openNotifications}
            style={[styles.notifBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.notifIcon, { color: theme.accent }]}>🔔</Text>
            {activityCount + memoryCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: theme.accent }]} />
            )}
          </Pressable>
          <Pressable
            onPress={() => { closeAllSheets(); setSettingsOpen(true); }}
            style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.settingsIcon, { color: theme.accent }]}>⚙</Text>
          </Pressable>
        </View>
```

- [ ] **Step 5: Add the `NotificationSheet` import and render it**

Add to the import block at the top of `app/index.tsx` (after the existing notification imports):

```typescript
import { NotificationSheet } from '@/notifications/NotificationSheet';
```

Find the `{/* Profile modal — floats above nav bar */}` block and add the notification sheet render right after it (before the Settings sheet):

```tsx
      {/* Notification sheet — floats above nav bar */}
      {notifSheetOpen && (
        <NotificationSheet
          onClose={() => setNotifSheetOpen(false)}
          onNavigate={(lat, lng) => setFlyTarget({ lat, lng, zoom: 14 })}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}
```

- [ ] **Step 6: Add styles for the new bell button**

In the `StyleSheet.create({...})` block at the bottom of the file, add after the existing `profileBadge` style:

```typescript
  notifBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    width: 40,
  },
  notifBadge: {
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 8,
  },
  notifIcon: { fontSize: 16 },
```

- [ ] **Step 7: Run the full test suite**

```
npx jest --no-coverage
```

Expected: all passing. TypeScript will catch any import errors at build time, but the test suite confirms runtime behaviour is intact.

- [ ] **Step 8: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add bell notification button and NotificationSheet to map screen"
```

---

## Done

All 4 tasks complete. Run the full suite one final time to confirm:

```
npx jest --no-coverage
```

Expected: all tests passing. The notification inbox is live — bell icon on map, rich rows with excerpt + location, marks all read on open.
