# Delete Sulat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent-delete flow to the profile view — X button on each sulat row, styled confirmation sheet, direct Supabase delete enforced by existing RLS.

**Architecture:** `useMyStories` gains a `deleteStory` method that calls `supabase.from('stories').delete()` and filters state on success. `MySulatRow` gets an optional `onDelete` prop that renders an absolute-positioned X button. `ProfileModal` tracks `pendingDeleteId` / `deleting` state and renders a new `DeleteConfirmSheet` overlay to confirm before acting.

**Tech Stack:** React Native (Pressable, StyleSheet, Text, View), Supabase JS v2, Jest + @testing-library/react-native

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/profile/useMyStories.ts` | Add `deleteStory(id)` method + update `UseMyStoriesResult` interface |
| Modify | `src/profile/MySulatRow.tsx` | Add optional `onDelete` prop + X button overlay |
| Create | `src/profile/DeleteConfirmSheet.tsx` | Full-screen backdrop + themed card confirmation overlay |
| Modify | `src/profile/ProfileModal.tsx` | Import + render `DeleteConfirmSheet`; pass `onDelete` to each `MySulatRow` |
| Modify | `src/profile/__tests__/MySulatRow.test.tsx` | Tests for X button presence/absence/press |
| Create | `src/profile/__tests__/DeleteConfirmSheet.test.tsx` | Full test suite for new component |
| Modify | `src/profile/__tests__/ProfileModal.test.tsx` | Tests for delete orchestration flow |

---

## Task 1: `deleteStory` in `useMyStories`

**Files:**
- Modify: `src/profile/useMyStories.ts`

The existing hook returns `{ stories, loading, error }`. We extend the return type with `deleteStory` and implement it inside the hook body. No new imports needed — `supabase` and `setStories` are already in scope.

- [ ] **Step 1: Write the failing tests**

Create `src/profile/__tests__/useMyStories.test.tsx`:

```tsx
// src/profile/__tests__/useMyStories.test.tsx
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useMyStories } from '../useMyStories';

// Controls mock behaviour per test
let mockStories: any[] = [];
let mockDeleteError: { message: string } | null = null;

jest.mock('@/data/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: 'u1' } } } }),
    },
    from: (table: string) => {
      if (table === 'stories') {
        return {
          // used by initial fetch
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () =>
                  Promise.resolve({ data: mockStories, error: null }),
              }),
            }),
          }),
          // used by deleteStory
          delete: () => ({
            eq: () => Promise.resolve({ error: mockDeleteError }),
          }),
        };
      }
      return {};
    },
  },
}));

function Harness({
  onReady,
}: {
  onReady: (deleteStory: (id: string) => Promise<void>, ids: string[]) => void;
}) {
  const { stories, loading, deleteStory } = useMyStories();
  if (!loading) {
    onReady(deleteStory, stories.map((s) => s.id));
  }
  return <Text>{loading ? 'loading' : `count-${stories.length}`}</Text>;
}

describe('useMyStories – deleteStory', () => {
  beforeEach(() => {
    mockDeleteError = null;
    mockStories = [
      {
        id: 's1',
        body: 'Hello',
        location_label: 'Manila',
        created_at: new Date().toISOString(),
        lat: 14,
        lng: 121,
        is_memory: false,
        reactions: [],
        replies: [{ count: 0 }],
      },
      {
        id: 's2',
        body: 'World',
        location_label: null,
        created_at: new Date().toISOString(),
        lat: 14,
        lng: 121,
        is_memory: false,
        reactions: [],
        replies: [{ count: 0 }],
      },
    ];
  });

  it('removes the story from state on successful delete', async () => {
    let capturedDelete!: (id: string) => Promise<void>;
    const { getByText } = render(
      <Harness
        onReady={(del) => { capturedDelete = del; }}
      />,
    );
    await waitFor(() => getByText('count-2'));
    await act(async () => { await capturedDelete('s1'); });
    await waitFor(() => getByText('count-1'));
  });

  it('keeps the story in state when delete returns an error', async () => {
    mockDeleteError = { message: 'db down' };
    let capturedDelete!: (id: string) => Promise<void>;
    const { getByText } = render(
      <Harness
        onReady={(del) => { capturedDelete = del; }}
      />,
    );
    await waitFor(() => getByText('count-2'));
    await act(async () => {
      await expect(capturedDelete('s1')).rejects.toBeTruthy();
    });
    expect(getByText('count-2')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx jest src/profile/__tests__/useMyStories.test.tsx --no-coverage
```

Expected: FAIL — `deleteStory` is not a function (property doesn't exist yet)

- [ ] **Step 3: Implement `deleteStory`**

Replace the contents of `src/profile/useMyStories.ts` with:

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
  deleteStory: (id: string) => Promise<void>;
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

  const deleteStory = async (id: string): Promise<void> => {
    const { error: e } = await supabase.from('stories').delete().eq('id', id);
    if (e) throw e;
    setStories((prev) => prev.filter((s) => s.id !== id));
  };

  return { stories, loading, error, deleteStory };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx jest src/profile/__tests__/useMyStories.test.tsx --no-coverage
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/profile/useMyStories.ts src/profile/__tests__/useMyStories.test.tsx
git commit -m "feat: add deleteStory to useMyStories"
```

---

## Task 2: X button in `MySulatRow`

**Files:**
- Modify: `src/profile/MySulatRow.tsx`
- Modify: `src/profile/__tests__/MySulatRow.test.tsx`

Add an optional `onDelete` prop. When provided, render an absolutely-positioned X button overlay. The existing outer `<Pressable>` already wraps the card — the X button sits inside it at `top: 8, right: 8` with `position: 'absolute'`.

- [ ] **Step 1: Write the failing tests**

Add three new tests to `src/profile/__tests__/MySulatRow.test.tsx`. Append after the existing `describe` block (keep all existing tests intact):

```tsx
// Add to describe('MySulatRow') block — append after the last existing test:

  it('does not render an X button when onDelete is not provided', () => {
    const { queryByTestId } = render(
      <MySulatRow story={baseStory} isUnread={false} onNavigate={jest.fn()} />,
    );
    expect(queryByTestId('delete-sulat-button')).toBeNull();
  });

  it('renders an X button when onDelete is provided', () => {
    const { getByTestId } = render(
      <MySulatRow
        story={baseStory}
        isUnread={false}
        onNavigate={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByTestId('delete-sulat-button')).toBeTruthy();
  });

  it('calls onDelete when the X button is pressed', () => {
    const onDelete = jest.fn();
    const { getByTestId } = render(
      <MySulatRow
        story={baseStory}
        isUnread={false}
        onNavigate={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.press(getByTestId('delete-sulat-button'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
```

Also add `fireEvent` to the import at the top of the test file:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
```

- [ ] **Step 2: Run tests to confirm the new ones fail**

```
npx jest src/profile/__tests__/MySulatRow.test.tsx --no-coverage
```

Expected: 3 existing tests PASS, 3 new tests FAIL — `testID="delete-sulat-button"` not found

- [ ] **Step 3: Update `MySulatRow`**

Replace the full file content:

```tsx
// src/profile/MySulatRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { MyStory } from './useMyStories';

export interface MySulatRowProps {
  story: MyStory;
  isUnread: boolean;
  onNavigate: () => void;
  onDelete?: () => void;
}

export function MySulatRow({ story, isUnread, onNavigate, onDelete }: MySulatRowProps) {
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
      {onDelete && (
        <Pressable
          onPress={onDelete}
          style={styles.deleteBtn}
          hitSlop={4}
          accessibilityLabel="Delete sulat"
          testID="delete-sulat-button"
        >
          <Text style={[styles.deleteTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { padding: 8, position: 'absolute', right: 0, top: 4 },
  deleteTxt: { fontSize: 11 },
  main: { flex: 1, paddingRight: 24 },
  memoryBadge: { fontSize: 11, fontStyle: 'italic', marginLeft: 8 },
  meta: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  metaTxt: { fontSize: 11 },
  row: { borderBottomWidth: 1, paddingVertical: 12 },
  unreadDot: { fontSize: 8, marginLeft: 6 },
});
```

Note: `main` now has `paddingRight: 24` so the body text doesn't flow under the X button. The X button is `position: 'absolute', right: 0, top: 4` — inside the outer Pressable, vertically centred near the top.

- [ ] **Step 4: Run all MySulatRow tests**

```
npx jest src/profile/__tests__/MySulatRow.test.tsx --no-coverage
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/profile/MySulatRow.tsx src/profile/__tests__/MySulatRow.test.tsx
git commit -m "feat: add onDelete X button to MySulatRow"
```

---

## Task 3: `DeleteConfirmSheet` component

**Files:**
- Create: `src/profile/DeleteConfirmSheet.tsx`
- Create: `src/profile/__tests__/DeleteConfirmSheet.test.tsx`

A standalone component. Returns `null` when `visible` is false. Renders a full-screen backdrop with a themed card when `visible` is true.

- [ ] **Step 1: Write the failing tests**

Create `src/profile/__tests__/DeleteConfirmSheet.test.tsx`:

```tsx
// src/profile/__tests__/DeleteConfirmSheet.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DeleteConfirmSheet } from '../DeleteConfirmSheet';

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

describe('DeleteConfirmSheet', () => {
  it('renders nothing when visible is false', () => {
    const { queryByText } = render(
      <DeleteConfirmSheet
        visible={false}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(queryByText('Delete sulat')).toBeNull();
  });

  it('renders title and warning copy when visible is true', () => {
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText('Delete sulat')).toBeTruthy();
    expect(getByText("This sulat can't be recovered after deletion.")).toBeTruthy();
  });

  it('renders Cancel and Delete buttons when visible', () => {
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText('Cancel')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
  });

  it('calls onCancel when Cancel is pressed', () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Delete is pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={false}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows "Deleting…" and disables both buttons when deleting is true', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const { getByText, queryByText } = render(
      <DeleteConfirmSheet
        visible={true}
        deleting={true}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(getByText('Deleting…')).toBeTruthy();
    expect(queryByText('Delete')).toBeNull();
    // Buttons disabled — pressing them does nothing
    fireEvent.press(getByText('Cancel'));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.press(getByText('Deleting…'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx jest src/profile/__tests__/DeleteConfirmSheet.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '../DeleteConfirmSheet'`

- [ ] **Step 3: Create `DeleteConfirmSheet.tsx`**

Create `src/profile/DeleteConfirmSheet.tsx`:

```tsx
// src/profile/DeleteConfirmSheet.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface DeleteConfirmSheetProps {
  visible: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmSheet({ visible, deleting, onConfirm, onCancel }: DeleteConfirmSheetProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Delete sulat</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          {"This sulat can't be recovered after deletion."}
        </Text>
        <View style={styles.buttons}>
          <Pressable onPress={deleting ? undefined : onCancel} disabled={deleting}>
            <Text style={[styles.cancelTxt, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={deleting ? undefined : onConfirm} disabled={deleting}>
            <Text style={[styles.deleteTxt, { opacity: deleting ? 0.5 : 1 }]}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelTxt: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 16,
    maxWidth: 320,
    padding: 24,
    width: '80%',
  },
  deleteTxt: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx jest src/profile/__tests__/DeleteConfirmSheet.test.tsx --no-coverage
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/profile/DeleteConfirmSheet.tsx src/profile/__tests__/DeleteConfirmSheet.test.tsx
git commit -m "feat: add DeleteConfirmSheet component"
```

---

## Task 4: Wire delete flow in `ProfileModal`

**Files:**
- Modify: `src/profile/ProfileModal.tsx`
- Modify: `src/profile/__tests__/ProfileModal.test.tsx`

`ProfileModal` gains `pendingDeleteId` and `deleting` state. It passes `onDelete` to each `MySulatRow` and renders `<DeleteConfirmSheet>` inside `AnimatedSheet` after the `ScrollView`. The `handleConfirmDelete` async function calls `deleteStory`, dismisses the sheet on success or error, and logs errors.

- [ ] **Step 1: Write the failing tests**

Append four new tests to `src/profile/__tests__/ProfileModal.test.tsx`. The file uses module-level mocks that need updating — replace the entire file:

```tsx
// src/profile/__tests__/ProfileModal.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileModal } from '../ProfileModal';

// Mock expo-linear-gradient (needed for StylePicker)
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      require('react').createElement(View, { style }, children),
  };
});

// Mutable variables — set per test
let mockDisplayHandle: string | null = null;
let mockPreferredStyle = 'a';
let mockStories: any[] = [];
let mockDeleteStory = jest.fn();

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: mockDisplayHandle === null
      ? null
      : {
          id: 'u1',
          display_handle: mockDisplayHandle,
          preferred_card_style: mockPreferredStyle,
          device_fingerprint: 'fp1',
          email: null,
          theme_preference: 'lantern',
          banned_at: null,
          created_at: '2026-01-01',
        },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/data/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

jest.mock('@/profile/useMyStories', () => ({
  useMyStories: () => ({ stories: mockStories, loading: false, error: null, deleteStory: mockDeleteStory }),
}));

jest.mock('@/profile/HandleClaim', () => ({
  HandleClaim: () => null,
}));

// MySulatRow renders a pressable testID per story so tests can tap the X button
jest.mock('@/profile/MySulatRow', () => {
  const { Pressable, Text } = require('react-native');
  return {
    MySulatRow: ({ story, onDelete }: { story: { id: string }; onDelete?: () => void }) => (
      <>
        {onDelete && (
          <Pressable testID={`delete-btn-${story.id}`} onPress={onDelete}>
            <Text>✕</Text>
          </Pressable>
        )}
      </>
    ),
  };
});

jest.mock('@/profile/useUnreadReplies', () => ({
  getSeenCount: jest.fn().mockResolvedValue(0),
  isUnread: jest.fn().mockReturnValue(false),
  markSeen: jest.fn(),
}));

beforeEach(() => {
  mockDisplayHandle = null;
  mockStories = [];
  mockDeleteStory = jest.fn().mockResolvedValue(undefined);
});

test('style picker is hidden when user has no claimed handle', () => {
  mockDisplayHandle = null;
  const { queryByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  expect(queryByTestId('style-swatch-a')).toBeNull();
});

test('style picker is visible when user has a claimed handle', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => {
    expect(getByTestId('style-swatch-a')).toBeTruthy();
  });
});

test('selecting a style shows Saved ✓', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId, getByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => getByTestId('style-swatch-b'));
  fireEvent.press(getByTestId('style-swatch-b'));
  await waitFor(() => expect(getByText('Saved ✓')).toBeTruthy());
});

test('tapping X on a row shows the confirmation sheet', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => expect(getByText('Delete sulat')).toBeTruthy());
});

test('Cancel dismisses the confirmation sheet without calling deleteStory', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Cancel'));
  fireEvent.press(getByText('Cancel'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
  expect(mockDeleteStory).not.toHaveBeenCalled();
});

test('confirming delete calls deleteStory and dismisses the sheet', async () => {
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Delete'));
  fireEvent.press(getByText('Delete'));
  await waitFor(() => expect(mockDeleteStory).toHaveBeenCalledWith('s1'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
});

test('when deleteStory throws, sheet dismisses and story stays', async () => {
  mockDeleteStory = jest.fn().mockRejectedValue(new Error('db down'));
  mockStories = [{ id: 's1', body: 'hello', location_label: null, created_at: new Date().toISOString(), lat: 14, lng: 121, is_memory: false, reaction_count: 0, reply_count: 0 }];
  const { getByTestId, getByText, queryByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  fireEvent.press(getByTestId('delete-btn-s1'));
  await waitFor(() => getByText('Delete'));
  fireEvent.press(getByText('Delete'));
  await waitFor(() => expect(queryByText('Delete sulat')).toBeNull());
  // Story still in mock list (the mock manages state; deleteStory threw so filter never ran)
  expect(mockDeleteStory).toHaveBeenCalledWith('s1');
});
```

- [ ] **Step 2: Run tests to confirm the new four fail**

```
npx jest src/profile/__tests__/ProfileModal.test.tsx --no-coverage
```

Expected: 3 existing tests PASS, 4 new tests FAIL — `deleteStory` / `DeleteConfirmSheet` not wired yet

- [ ] **Step 3: Update `ProfileModal.tsx`**

Replace the full file:

```tsx
// src/profile/ProfileModal.tsx
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';
import { useMyStories } from './useMyStories';
import { getSeenCount, isUnread as checkUnread } from './useUnreadReplies';
import { HandleClaim } from './HandleClaim';
import { MySulatRow } from './MySulatRow';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { supabase } from '@/data/supabase';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';

export interface ProfileModalProps {
  onClose: () => void;
  /** Called when user taps a sulat row. Caller should fly the map to this location. */
  onNavigate: (lat: number, lng: number) => void;
  bottomOffset?: number;
}

export function ProfileModal({ onClose, onNavigate, bottomOffset = 0 }: ProfileModalProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { user, loading: userLoading, error: userError } = useUser();
  const { stories, loading: storiesLoading, error: storiesError, deleteStory } = useMyStories();
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [preferredStyle, setPreferredStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);
  const [saved, setSaved] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Resolved handle: prefer the just-claimed one over the DB value.
  const displayHandle = claimedHandle ?? user?.display_handle ?? null;

  // Load AsyncStorage seen counts once stories are ready.
  useEffect(() => {
    if (stories.length === 0) return;
    (async () => {
      const counts: Record<string, number> = {};
      for (const story of stories) {
        counts[story.id] = await getSeenCount(story.id);
      }
      setSeenCounts(counts);
    })();
  }, [stories]);

  useEffect(() => {
    if (user?.preferred_card_style) {
      setPreferredStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);

  const handleStyleChange = async (id: CardStyleId) => {
    if (!user) return;
    setPreferredStyle(id);
    const { error: saveErr } = await supabase
      .from('users')
      .update({ preferred_card_style: id })
      .eq('id', user.id);
    if (!saveErr) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteStory(pendingDeleteId);
      setPendingDeleteId(null);
    } catch (err) {
      console.error('[ProfileModal] delete failed:', err);
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          your sulat
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {userLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.centred} />
      ) : userError ? (
        <Text style={[styles.errorTxt, { color: '#e87c6a' }]}>could not load profile</Text>
      ) : (
        <>
          {/* Handle section */}
          {displayHandle !== null ? (
            <>
              <View style={styles.handleRow}>
                <Text style={[styles.handleTxt, { color: theme.accent }]}>
                  @{displayHandle}
                </Text>
                <Text style={[styles.lockIcon, { color: theme.textMuted }]}>{'  🔒'}</Text>
              </View>
              <View style={styles.styleSection}>
                <Text style={[styles.styleSectionLabel, { color: theme.textMuted }]}>your paper</Text>
                <StylePicker selected={preferredStyle} onSelect={handleStyleChange} showLabel />
                {saved && (
                  <Text style={[styles.savedTxt, { color: theme.accent }]}>Saved ✓</Text>
                )}
              </View>
            </>
          ) : user !== null ? (
            <HandleClaim
              userId={user.id}
              onClaimed={(h) => setClaimedHandle(h)}
            />
          ) : null}

          <View style={[styles.divider, { backgroundColor: 'rgba(245,230,200,0.08)' }]} />

          {/* Sulat feed */}
          {storiesError ? (
            <Text style={[styles.emptyTxt, { color: '#e87c6a' }]}>could not load sulats</Text>
          ) : storiesLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.centred} />
          ) : stories.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>
              you haven't posted any sulats yet
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.feed}>
              {stories.map((story) => (
                <MySulatRow
                  key={story.id}
                  story={story}
                  isUnread={checkUnread(story.reply_count, seenCounts[story.id] ?? 0)}
                  onNavigate={() => {
                    onClose();
                    onNavigate(story.lat, story.lng);
                  }}
                  onDelete={() => setPendingDeleteId(story.id)}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      <DeleteConfirmSheet
        visible={pendingDeleteId !== null}
        deleting={deleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
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
  errorTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  divider: { height: 1, marginBottom: 10, marginTop: 10 },
  emptyTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  feed: { flex: 1 },
  handleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 4 },
  handleTxt: { fontSize: 18, fontWeight: '600' },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  lockIcon: { fontSize: 13 },
  title: { fontSize: 17, fontWeight: '500' },
  savedTxt: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  styleSectionLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  styleSection: { marginBottom: 4, marginTop: 8 },
});
```

- [ ] **Step 4: Run all ProfileModal tests**

```
npx jest src/profile/__tests__/ProfileModal.test.tsx --no-coverage
```

Expected: PASS — 7 tests pass

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

```
npx jest --no-coverage
```

Expected: All previously passing tests still pass plus the new ones (net +13 new tests)

- [ ] **Step 6: Commit**

```bash
git add src/profile/ProfileModal.tsx src/profile/__tests__/ProfileModal.test.tsx
git commit -m "feat: wire delete flow in ProfileModal"
```
