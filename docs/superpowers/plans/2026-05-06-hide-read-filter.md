# Hide-read filter + starred sulat — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in "Unread only" map filter that hides sulat the user has already opened, plus a star affordance to keep specific sulat always visible regardless of the filter.

**Architecture:** Two new state hooks (`useReadStories`, `useUnreadFilter`) persist to a single JSON-encoded set per concept via the existing `kvGet`/`kvSet` helpers — works identically on web (`localStorage`) and native (`expo-secure-store`). One new bottom-bar chip (`UnreadFilterChip`) toggles the filter; one new sheet-header button (`StarToggle`) toggles a story's starred state. Filter is a pure `Array.filter` over the existing `useStories` result. The existing `SulatLoader` extends to cover hydration of the new state hooks so cold-start never flashes unfiltered pins.

**Tech Stack:** TypeScript, React Native + react-native-web (Expo SDK 54), expo-router, jest-expo, @testing-library/react-native. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-06-hide-read-filter-design.md](cozy-map-app/docs/superpowers/specs/2026-05-06-hide-read-filter-design.md)

---

## Task 1: `useReadStories` — failing tests + implementation

**Files:**
- Create: `src/data/__tests__/useReadStories.test.tsx`
- Create: `src/data/useReadStories.ts`

### Step 1: Write the failing tests

Use the Write tool to create `src/data/__tests__/useReadStories.test.tsx` with this exact content:

```tsx
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useReadStories } from '../useReadStories';

const store: Record<string, string> = {};

jest.mock('@/lib/persistence', () => ({
  kvGet: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  kvSet: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useReadStories>) => void }) {
  const api = useReadStories();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="readSize">{api.read.size}</Text>
      <Text testID="starredSize">{api.starred.size}</Text>
    </View>
  );
}

describe('useReadStories', () => {
  test('starts with hydrating=true and empty sets', () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('readSize').props.children).toBe(0);
    expect(getByTestId('starredSize').props.children).toBe(0);
  });

  test('hydrates from kvGet on mount; hydrating flips false', async () => {
    store['sulat.read'] = JSON.stringify(['s1', 's2']);
    store['sulat.starred'] = JSON.stringify(['s3']);
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('readSize').props.children).toBe(2);
    expect(getByTestId('starredSize').props.children).toBe(1);
    const latest = apiRef[apiRef.length - 1];
    expect(latest.isRead('s1')).toBe(true);
    expect(latest.isRead('s2')).toBe(true);
    expect(latest.isRead('s3')).toBe(false);
    expect(latest.isStarred('s3')).toBe(true);
  });

  test('hydration tolerates malformed JSON without throwing', async () => {
    store['sulat.read'] = 'not valid json {';
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('readSize').props.children).toBe(0);
  });

  test('markRead adds to set and persists', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    expect(getByTestId('readSize').props.children).toBe(1);
    expect(JSON.parse(store['sulat.read'])).toEqual(['story-a']);
  });

  test('markRead is idempotent — calling twice does not duplicate', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    await act(async () => {
      await apiRef[apiRef.length - 1].markRead('story-a');
    });
    expect(getByTestId('readSize').props.children).toBe(1);
  });

  test('toggleStarred adds then removes', async () => {
    const apiRef: ReturnType<typeof useReadStories>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggleStarred('story-x');
    });
    expect(getByTestId('starredSize').props.children).toBe(1);
    expect(JSON.parse(store['sulat.starred'])).toEqual(['story-x']);
    await act(async () => {
      await apiRef[apiRef.length - 1].toggleStarred('story-x');
    });
    expect(getByTestId('starredSize').props.children).toBe(0);
    expect(JSON.parse(store['sulat.starred'])).toEqual([]);
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/data/__tests__/useReadStories.test.tsx --silent 2>&1 | tail -10
```

Expected: 6 failures (`Cannot find module '../useReadStories'`).

### Step 3: Commit failing tests

```bash
git add src/data/__tests__/useReadStories.test.tsx
git commit -m "test(data): failing tests for useReadStories hook"
```

### Step 4: Write the hook

Use the Write tool to create `src/data/useReadStories.ts` with this exact content:

```ts
import { useCallback, useEffect, useState } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const READ_KEY = 'sulat.read';
const STARRED_KEY = 'sulat.starred';

export interface ReadStoriesAPI {
  /** IDs of stories the user has opened. */
  read: Set<string>;
  /** IDs of stories the user has starred. */
  starred: Set<string>;
  /** True from mount until both sets have been read from persistence. */
  hydrating: boolean;
  isRead: (id: string) => boolean;
  isStarred: (id: string) => boolean;
  /** Marks a story as read. Idempotent. Persists to kv. */
  markRead: (id: string) => Promise<void>;
  /** Adds or removes a story from the starred set. Persists to kv. */
  toggleStarred: (id: string) => Promise<void>;
}

function safeParseIdArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  } catch {
    // fall through
  }
  return [];
}

export function useReadStories(): ReadStoriesAPI {
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const [starred, setStarred] = useState<Set<string>>(() => new Set());
  const [hydrating, setHydrating] = useState(true);

  // Hydrate once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [readJson, starredJson] = await Promise.all([
        kvGet(READ_KEY),
        kvGet(STARRED_KEY),
      ]);
      if (cancelled) return;
      setRead(new Set(safeParseIdArray(readJson)));
      setStarred(new Set(safeParseIdArray(starredJson)));
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    let next: Set<string> | null = null;
    setRead((prev) => {
      if (prev.has(id)) return prev;
      next = new Set(prev);
      next.add(id);
      return next;
    });
    if (next) {
      await kvSet(READ_KEY, JSON.stringify(Array.from(next)));
    }
  }, []);

  const toggleStarred = useCallback(async (id: string) => {
    let next: Set<string> = new Set();
    setStarred((prev) => {
      next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    await kvSet(STARRED_KEY, JSON.stringify(Array.from(next)));
  }, []);

  const isRead = useCallback((id: string) => read.has(id), [read]);
  const isStarred = useCallback((id: string) => starred.has(id), [starred]);

  return { read, starred, hydrating, isRead, isStarred, markRead, toggleStarred };
}
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/data/__tests__/useReadStories.test.tsx --silent 2>&1 | tail -5
```

Expected: 6 passing.

### Step 6: Commit

```bash
git add src/data/useReadStories.ts
git commit -m "feat(data): useReadStories hook (per-device read + starred sets)"
```

---

## Task 2: `useUnreadFilter` — failing tests + implementation

**Files:**
- Create: `src/data/__tests__/useUnreadFilter.test.tsx`
- Create: `src/data/useUnreadFilter.ts`

### Step 1: Write the failing tests

Use the Write tool to create `src/data/__tests__/useUnreadFilter.test.tsx` with this exact content:

```tsx
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useUnreadFilter } from '../useUnreadFilter';

const store: Record<string, string> = {};

jest.mock('@/lib/persistence', () => ({
  kvGet: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  kvSet: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
});

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useUnreadFilter>) => void }) {
  const api = useUnreadFilter();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="unreadOnly">{String(api.unreadOnly)}</Text>
    </View>
  );
}

describe('useUnreadFilter', () => {
  test('starts with hydrating=true and unreadOnly=false', () => {
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('unreadOnly').props.children).toBe('false');
  });

  test('hydrates unreadOnly=true when persisted', async () => {
    store['sulat.filters.unreadOnly'] = 'true';
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('unreadOnly').props.children).toBe('true');
  });

  test('hydrates unreadOnly=false when persisted as anything other than "true"', async () => {
    store['sulat.filters.unreadOnly'] = 'false';
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('unreadOnly').props.children).toBe('false');
  });

  test('toggle flips state and persists', async () => {
    const apiRef: ReturnType<typeof useUnreadFilter>[] = [];
    const { getByTestId } = render(<Harness onApi={(api) => apiRef.push(api)} />);
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle();
    });
    expect(getByTestId('unreadOnly').props.children).toBe('true');
    expect(store['sulat.filters.unreadOnly']).toBe('true');
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle();
    });
    expect(getByTestId('unreadOnly').props.children).toBe('false');
    expect(store['sulat.filters.unreadOnly']).toBe('false');
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/data/__tests__/useUnreadFilter.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 failures (`Cannot find module '../useUnreadFilter'`).

### Step 3: Commit failing tests

```bash
git add src/data/__tests__/useUnreadFilter.test.tsx
git commit -m "test(data): failing tests for useUnreadFilter hook"
```

### Step 4: Write the hook

Use the Write tool to create `src/data/useUnreadFilter.ts` with this exact content:

```ts
import { useCallback, useEffect, useState } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const FILTER_KEY = 'sulat.filters.unreadOnly';

export interface UnreadFilterAPI {
  /** When true, the map should hide stories the user has already read. */
  unreadOnly: boolean;
  /** True from mount until persisted state has been read. */
  hydrating: boolean;
  /** Flips unreadOnly and persists. */
  toggle: () => Promise<void>;
}

export function useUnreadFilter(): UnreadFilterAPI {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v = await kvGet(FILTER_KEY);
      if (cancelled) return;
      setUnreadOnly(v === 'true');
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    let next = false;
    setUnreadOnly((prev) => {
      next = !prev;
      return next;
    });
    await kvSet(FILTER_KEY, String(next));
  }, []);

  return { unreadOnly, hydrating, toggle };
}
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/data/__tests__/useUnreadFilter.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 passing.

### Step 6: Commit

```bash
git add src/data/useUnreadFilter.ts
git commit -m "feat(data): useUnreadFilter hook (persisted unread-only toggle)"
```

---

## Task 3: `UnreadFilterChip` — failing tests + implementation

**Files:**
- Create: `src/map/__tests__/UnreadFilterChip.test.tsx`
- Create: `src/map/UnreadFilterChip.tsx`

The chip is a small Pressable that mirrors the existing "Near me" / "Lantern" nav button styling (icon glyph above a label). Tap fires the `useUnreadFilter().toggle()`. Active state visually distinguishes via amber-tinted icon + label color (theme.accent vs theme.textMuted).

### Step 1: Write the failing tests

Use the Write tool to create `src/map/__tests__/UnreadFilterChip.test.tsx` with this exact content:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { UnreadFilterChip } from '../UnreadFilterChip';

const mockToggle = jest.fn(() => Promise.resolve());
let currentState = { unreadOnly: false, hydrating: false, toggle: mockToggle };

jest.mock('@/data/useUnreadFilter', () => ({
  useUnreadFilter: () => currentState,
}));

beforeEach(() => {
  mockToggle.mockClear();
  currentState = { unreadOnly: false, hydrating: false, toggle: mockToggle };
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('UnreadFilterChip', () => {
  test('renders with the inactive label "Unread"', () => {
    const { getByText } = render(withTheme(<UnreadFilterChip />));
    expect(getByText('Unread')).toBeTruthy();
  });

  test('tap calls toggle', () => {
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    fireEvent.press(getByTestId('unread-filter-chip'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  test('active state passes the active flag to children styling', () => {
    currentState = { unreadOnly: true, hydrating: false, toggle: mockToggle };
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    const chip = getByTestId('unread-filter-chip');
    // The component sets accessibilityState.selected when active so the
    // visual treatment is testable without color-by-color assertion.
    expect(chip.props.accessibilityState?.selected).toBe(true);
  });

  test('inactive state has accessibilityState.selected = false', () => {
    currentState = { unreadOnly: false, hydrating: false, toggle: mockToggle };
    const { getByTestId } = render(withTheme(<UnreadFilterChip />));
    expect(getByTestId('unread-filter-chip').props.accessibilityState?.selected).toBe(false);
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/map/__tests__/UnreadFilterChip.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 failures (`Cannot find module '../UnreadFilterChip'`).

### Step 3: Commit failing tests

```bash
git add src/map/__tests__/UnreadFilterChip.test.tsx
git commit -m "test(map): failing tests for UnreadFilterChip"
```

### Step 4: Write the component

Use the Write tool to create `src/map/UnreadFilterChip.tsx` with this exact content:

```tsx
import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useUnreadFilter } from '@/data/useUnreadFilter';

/**
 * Bottom-bar toggle that hides sulat the user has already opened. Mirrors
 * the styling of the adjacent "Near me" / "Lantern" nav buttons. Active
 * state tints the icon + label with theme.accent.
 */
export function UnreadFilterChip() {
  const theme = useTheme();
  const { unreadOnly, toggle } = useUnreadFilter();
  const labelColor = unreadOnly ? theme.accent : theme.textMuted;

  return (
    <PressableScale
      testID="unread-filter-chip"
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ selected: unreadOnly }}
      accessibilityLabel={unreadOnly ? 'Showing unread only — tap to show all' : 'Show unread only'}
      style={styles.btn}
    >
      <Text style={[styles.icon, { opacity: unreadOnly ? 1 : 0.85 }]}>✉︎</Text>
      <Text style={[styles.label, { color: labelColor }]}>Unread</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  icon: { fontSize: 17 },
  label: { fontSize: 11, letterSpacing: 0.3 },
});
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/map/__tests__/UnreadFilterChip.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 passing.

### Step 6: Commit

```bash
git add src/map/UnreadFilterChip.tsx
git commit -m "feat(map): UnreadFilterChip — bottom-bar toggle for hide-read"
```

---

## Task 4: `StarToggle` — failing tests + implementation

**Files:**
- Create: `src/story/__tests__/StarToggle.test.tsx`
- Create: `src/story/StarToggle.tsx`

### Step 1: Write the failing tests

Use the Write tool to create `src/story/__tests__/StarToggle.test.tsx` with this exact content:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { StarToggle } from '../StarToggle';

const mockToggleStarred = jest.fn(() => Promise.resolve());
let starredSet = new Set<string>();

jest.mock('@/data/useReadStories', () => ({
  useReadStories: () => ({
    read: new Set<string>(),
    starred: starredSet,
    hydrating: false,
    isRead: (id: string) => false,
    isStarred: (id: string) => starredSet.has(id),
    markRead: jest.fn(),
    toggleStarred: mockToggleStarred,
  }),
}));

beforeEach(() => {
  mockToggleStarred.mockClear();
  starredSet = new Set();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('StarToggle', () => {
  test('renders an unstarred icon when story is not in starred set', () => {
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    expect(getByTestId('star-toggle').props.accessibilityState?.selected).toBe(false);
  });

  test('renders a starred icon when story is in starred set', () => {
    starredSet = new Set(['s1']);
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    expect(getByTestId('star-toggle').props.accessibilityState?.selected).toBe(true);
  });

  test('tap calls toggleStarred with the story id', () => {
    const { getByTestId } = render(withTheme(<StarToggle storyId="s1" />));
    fireEvent.press(getByTestId('star-toggle'));
    expect(mockToggleStarred).toHaveBeenCalledTimes(1);
    expect(mockToggleStarred).toHaveBeenCalledWith('s1');
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/story/__tests__/StarToggle.test.tsx --silent 2>&1 | tail -5
```

Expected: 3 failures (`Cannot find module '../StarToggle'`).

### Step 3: Commit failing tests

```bash
git add src/story/__tests__/StarToggle.test.tsx
git commit -m "test(story): failing tests for StarToggle"
```

### Step 4: Write the component

Use the Write tool to create `src/story/StarToggle.tsx` with this exact content:

```tsx
import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useReadStories } from '@/data/useReadStories';

export interface StarToggleProps {
  storyId: string;
}

/**
 * Star icon inside StorySheet's header. Tap to toggle the story between
 * starred / not-starred. Starred sulat remain visible on the map even when
 * the user has the "Unread only" filter on.
 */
export function StarToggle({ storyId }: StarToggleProps) {
  const theme = useTheme();
  const { isStarred, toggleStarred } = useReadStories();
  const starred = isStarred(storyId);

  return (
    <PressableScale
      testID="star-toggle"
      onPress={() => toggleStarred(storyId)}
      accessibilityRole="button"
      accessibilityState={{ selected: starred }}
      accessibilityLabel={starred ? 'Remove star — let this sulat hide when filtered' : 'Star — keep this sulat visible'}
      style={styles.btn}
    >
      <Text
        style={[
          styles.glyph,
          { color: starred ? theme.accent : theme.textMuted },
        ]}
      >
        {starred ? '★' : '☆'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  glyph: { fontSize: 22 },
});
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/story/__tests__/StarToggle.test.tsx --silent 2>&1 | tail -5
```

Expected: 3 passing.

### Step 6: Commit

```bash
git add src/story/StarToggle.tsx
git commit -m "feat(story): StarToggle — toggle a story's starred state"
```

---

## Task 5: `PinMarker` — add `isStarred` prop with star overlay

**Files:**
- Modify: `src/map/PinMarker.tsx`
- Modify (or create): `tests/unit/PinMarker.test.tsx`

### Step 1: Inspect current PinMarker test

```bash
cat tests/unit/PinMarker.test.tsx 2>&1 | head -40
```

Note the existing test patterns and assertion style. You'll add new assertions in the same style.

### Step 2: Add a failing test for the star overlay

Use the Edit tool on `tests/unit/PinMarker.test.tsx`. Find the last `});` of the outer `describe(...)` block and add a new test block immediately above it. Paste:

```tsx
  test('renders the star glyph when isStarred=true', () => {
    const { getByText } = render(
      withTheme(<PinMarker mood="hopeful" isMemory={false} isStarred />)
    );
    expect(getByText('★')).toBeTruthy();
  });

  test('does not render the star glyph when isStarred is false or omitted', () => {
    const { queryByText } = render(
      withTheme(<PinMarker mood="hopeful" isMemory={false} />)
    );
    expect(queryByText('★')).toBeNull();
  });
```

If `withTheme` doesn't already exist in this test file, look for the existing render-with-theme helper (the file may use a `ThemeProvider` wrapper) and use the same pattern. If there's none, add at the top:

```tsx
import { ThemeProvider } from '@/theme/ThemeContext';
const withTheme = (node: React.ReactNode) => <ThemeProvider>{node}</ThemeProvider>;
```

### Step 3: Run tests — expect new failures

```bash
npx jest tests/unit/PinMarker.test.tsx --silent 2>&1 | tail -10
```

Expected: 2 new failures (the `★`-related tests). Existing tests should still pass.

### Step 4: Commit failing tests

```bash
git add tests/unit/PinMarker.test.tsx
git commit -m "test(map): failing tests for PinMarker isStarred prop"
```

### Step 5: Add isStarred to PinMarker

Use the Edit tool on `src/map/PinMarker.tsx`. Two edits.

Edit A — extend the `PinMarkerProps` interface. Find:

```tsx
export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
  reactionCount?: number;
  /** Number of replies on this story. Surfaces as a small badge on the pin. */
  replyCount?: number;
}
```

Replace with:

```tsx
export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
  reactionCount?: number;
  /** Number of replies on this story. Surfaces as a small badge on the pin. */
  replyCount?: number;
  /** When true, render a small star glyph overlay so the pin remains
   *  recognizable even when the user has many sulat starred. */
  isStarred?: boolean;
}
```

Edit B — extend the function signature and add the JSX. Find:

```tsx
export function PinMarker({ mood, isMemory, reactionCount = 0, replyCount = 0 }: PinMarkerProps) {
```

Replace with:

```tsx
export function PinMarker({ mood, isMemory, reactionCount = 0, replyCount = 0, isStarred = false }: PinMarkerProps) {
```

Then find the existing memory decoration JSX:

```tsx
      {isMemory && (
        <Text
          style={[
            styles.decoration,
            { color: theme.pinMemory.body, textShadowColor: theme.pinMemory.glow },
          ]}
        >
          {theme.pinMemory.decoration}
        </Text>
      )}
```

Insert the star overlay immediately after that block (before the reply badge):

```tsx
      {isStarred && (
        <Text
          style={[
            styles.starOverlay,
            { color: theme.accent, textShadowColor: theme.accentSoft },
          ]}
        >
          ★
        </Text>
      )}
```

Then find the `styles = StyleSheet.create({` block and add a `starOverlay` style. After the existing `decoration` style, insert:

```tsx
  starOverlay: {
    position: 'absolute',
    top: -6,
    right: -6,
    fontSize: 12,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
```

### Step 6: Run tests — expect pass

```bash
npx jest tests/unit/PinMarker.test.tsx --silent 2>&1 | tail -5
```

Expected: all PinMarker tests passing (existing + 2 new = N+2).

### Step 7: Commit

```bash
git add src/map/PinMarker.tsx
git commit -m "feat(map): PinMarker isStarred prop renders star overlay"
```

---

## Task 6: Thread `isStarred` through `StoryPins` (web + native)

**Files:**
- Modify: `src/map/StoryPins.tsx` (native)
- Modify: `src/map/StoryPins.web.tsx` (web)

### Step 1: Read both StoryPins files to find the PinMarker call sites

```bash
grep -n "PinMarker\|MemoPinMarker" src/map/StoryPins.tsx src/map/StoryPins.web.tsx
```

Note the lines where `<MemoPinMarker ...>` is rendered — both files have one (the native version typically inside a `<Marker>` and the web version inside a maplibre-gl marker wrapper).

### Step 2: Add `useReadStories` import and consume `isStarred` per pin (native)

Use the Edit tool on `src/map/StoryPins.tsx`. At the top, near the existing `import type { Story }` line, add:

```tsx
import { useReadStories } from '@/data/useReadStories';
```

Inside the `StoryPins` function body, near the top (after destructuring props but before the early returns / loops), add:

```tsx
  const { isStarred } = useReadStories();
```

Find the line that renders `<MemoPinMarker ...>` and add `isStarred={isStarred(story.id)}` to its props. The exact line varies; the change is: wherever a `story` object is in scope and `<MemoPinMarker mood={...} isMemory={...} />` appears, append `isStarred={isStarred(story.id)}`.

### Step 3: Same change in the web file

Use the Edit tool on `src/map/StoryPins.web.tsx`. Add the same import. Add `const { isStarred } = useReadStories();` inside the function body. Add `isStarred={isStarred(story.id)}` to the `<MemoPinMarker ...>` JSX.

### Step 4: Run tests + typecheck

```bash
npx jest src/map/ tests/unit/PinMarker.test.tsx --silent 2>&1 | tail -5
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -10
```

Expected: all map tests pass. Typecheck shows no new errors involving StoryPins or PinMarker.

### Step 5: Commit

```bash
git add src/map/StoryPins.tsx src/map/StoryPins.web.tsx
git commit -m "feat(map): thread isStarred from useReadStories through StoryPins"
```

---

## Task 7: `StorySheet` integration — markRead on mount + render StarToggle

**Files:**
- Modify: `src/story/StorySheet.tsx`

### Step 1: Read the current file to find the right insertion points

```bash
sed -n '1,40p' src/story/StorySheet.tsx
```

Note the imports section and the function body (around the existing `markSeen` `useEffect`).

### Step 2: Add imports

Use the Edit tool. Find this import:

```tsx
import { markSeen } from '@/profile/useUnreadReplies';
```

Add immediately below it:

```tsx
import { useReadStories } from '@/data/useReadStories';
import { StarToggle } from './StarToggle';
```

### Step 3: Hook into the read-marker state

Inside the `StorySheet` function, find the existing line:

```tsx
  const { user: currentUser } = useUser();
```

Add immediately after it:

```tsx
  const { markRead } = useReadStories();

  // Auto-mark the story as read on mount; the kv write is fire-and-forget.
  // Re-fires when the user navigates between different stories without
  // unmounting the sheet (story.id is stable per story).
  useEffect(() => {
    markRead(story.id).catch(() => {
      // Persistence failure is non-blocking — in-memory state is already
      // updated optimistically inside markRead.
    });
  }, [story.id, markRead]);
```

### Step 4: Render the StarToggle in the header

Find the sheet header JSX (search for the close button rendering) — typically a row with `onClose` button. Add the `StarToggle` adjacent to the close button. The exact structure varies; look for a header `View` containing the close button and add `<StarToggle storyId={story.id} />` either just before or just after the close button.

If the header structure is unclear, run:

```bash
grep -n "onClose\|sheetRef\|AnimatedSheet" src/story/StorySheet.tsx | head -10
```

…and look at the JSX around those lines. The header is typically at the top of the sheet's children. Insert `<StarToggle storyId={story.id} />` in a position that visually places the star top-right of the sheet (near where the close button lives, or in the same horizontal row as the story title/handle).

### Step 5: Run tests

```bash
npx jest src/story/ --silent 2>&1 | tail -5
```

Expected: all existing story tests still pass; the new StarToggle test passes.

### Step 6: Commit

```bash
git add src/story/StorySheet.tsx
git commit -m "feat(story): StorySheet calls markRead on mount and renders StarToggle"
```

---

## Task 8: `app/index.tsx` — chip + filter + loader gating

**Files:**
- Modify: `app/index.tsx`

### Step 1: Add the imports

Use the Edit tool. Find the existing brand imports (`SulatLoader`, `useLoaderGating`). Add nearby:

```tsx
import { useReadStories } from '@/data/useReadStories';
import { useUnreadFilter } from '@/data/useUnreadFilter';
import { UnreadFilterChip } from '@/map/UnreadFilterChip';
```

### Step 2: Consume the new hooks

Inside the function, find the existing `useStories` destructure (currently destructures `stories` and `loading`). Add nearby:

```tsx
  const { user: meUser } = useUser();
  const { read, starred, hydrating: readsHydrating } = useReadStories();
  const { unreadOnly, hydrating: filterHydrating } = useUnreadFilter();
```

(Note: `useUser` may already be imported and called elsewhere in the file. If so, reuse the existing variable instead of adding a new call.)

### Step 3: Update the loader gating to OR in the new hydrating flags

Find the existing line:

```tsx
  const loaderGating = useLoaderGating(loading);
```

Replace with:

```tsx
  const loaderGating = useLoaderGating(loading || readsHydrating || filterHydrating);
```

### Step 4: Compute the filtered stories list

Find the existing `const { stories, loading } = useStories(...)` line. Immediately after the `loaderGating` line (so it runs after the data is in scope), add:

```tsx
  const visibleStories = useMemo(() => {
    if (!unreadOnly) return stories;
    const meId = meUser?.id;
    return stories.filter(
      (s) => s.author_id === meId || starred.has(s.id) || !read.has(s.id)
    );
  }, [stories, unreadOnly, read, starred, meUser?.id]);
```

If `useMemo` is not yet imported from `react`, add it to the import line (it likely already is — most files in this codebase use it).

### Step 5: Pass the filtered list to consumers

Find every place in this file that currently passes `stories` (the unfiltered) to a child component — typically `<StoryPins stories={stories} ...>`. Replace each `stories=` (where it's the value passed to the map) with `stories={visibleStories}`. **Caveat:** do NOT change occurrences that reference `stories` for unrelated reasons (e.g., a notification banner that wants the full list, an analytics counter, a Profile-aware feature). Only the map-pin renderer should consume the filtered list.

To find the call sites:

```bash
grep -n "stories=" app/index.tsx
```

Inspect each match and decide whether the consumer cares about visibility (filtered) or about the full set (unfiltered).

### Step 6: Insert the UnreadFilterChip in the bottom bar

Find the bottom-bar inner `<View style={styles.bottomBarInner}>` block. Currently it contains three children: a "Near me" `<PressableScale>`, the FAB wrap, and a "Lantern" `<PressableScale>`. Add `<UnreadFilterChip />` as a fourth child, **after** the Lantern button. That gives:

```
[Near me] [FAB] [Lantern] [Unread]
```

The existing `bottomBarInner` style uses `justifyContent: 'space-around'` — adding a fourth child will redistribute spacing automatically. The FAB will shift slightly off-center, which is acceptable for v1. (If visual balance matters more, the user can ask to rebalance later.)

### Step 7: Run typecheck and tests

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -15
npx jest --testPathIgnorePatterns=".worktrees" --silent 2>&1 | tail -5
```

Expected: typecheck clean (no errors involving `app/index.tsx`); test counts unchanged-or-higher (270 baseline + the 17 new tests in this plan = ~287 passing). Pre-existing `NotificationSheet` flake may still fail.

### Step 8: Commit

```bash
git add app/index.tsx
git commit -m "feat(brand): wire UnreadFilterChip + filter visible stories + extend loader gating"
```

---

## Task 9: Visual verification in dev preview

This task is hands-on, not committable.

### Step 1: Confirm dev preview is running on port 8081

Use `mcp__Claude_Preview__preview_list`. If `sulat-web` isn't running, start it with `mcp__Claude_Preview__preview_start`.

### Step 2: Clear localStorage and reload

```js
mcp__Claude_Preview__preview_eval with expression:
Object.keys(localStorage).filter(k => k.startsWith('sulat')).forEach(k => localStorage.removeItem(k));
window.location.reload();
```

### Step 3: Verify the chip appears in the bottom bar

Use `mcp__Claude_Preview__preview_eval` with expression:

```js
new Promise(r => setTimeout(r, 5000)).then(() => ({
  chipPresent: !!document.querySelector('[data-testid="unread-filter-chip"]'),
  chipLabel: document.querySelector('[data-testid="unread-filter-chip"]')?.textContent
}))
```

Expected: `chipPresent: true`, `chipLabel` includes `"Unread"`.

### Step 4: Open a story, verify it gets marked read

Tap a pin (or use `preview_click` on a pin). Open the StorySheet. Close it. Then evaluate:

```js
JSON.parse(localStorage.getItem('sulat.read') || '[]').length
```

Expected: 1 (the story you opened).

### Step 5: Toggle the filter on and verify the read pin disappears

Use `preview_click` on the chip with selector `[data-testid="unread-filter-chip"]`. Then:

```js
({
  unreadOnly: localStorage.getItem('sulat.filters.unreadOnly'),
  pinCount: document.querySelectorAll('[role="button"]').length
})
```

Expected: `unreadOnly: "true"`. Pin count should drop by one (the read pin is hidden).

### Step 6: Toggle filter off again

`preview_click` the chip again. Verify all pins are back.

### Step 7: Star a story, verify it stays visible with filter on

Open a story, tap the star toggle (`[data-testid="star-toggle"]`), close the sheet, toggle filter on, verify the starred pin still renders with a `★` overlay near it.

### Step 8: Take a screenshot for the record

`mcp__Claude_Preview__preview_screenshot` — capture the bottom bar showing all 4 chips.

If any of these checks fail, the issue is in the most-recently-touched task. Don't deploy until they all pass.

---

## Task 10: Push to remote and ship to production

Auto-deploy on push fails because of the gitignored MP3s (per prior session's discovery). Production must be deployed via local CLI.

### Step 1: Push

```bash
cd cozy-map-app
git push origin mobile
```

### Step 2: Production deploy

```bash
vercel deploy --prod --yes
```

Expected: Production URL `Ready`, aliased to `sulat.vercel.app`.

### Step 3: Smoke check production

```bash
curl -s -o /dev/null -w "homepage: %{http_code}\n" https://sulat.vercel.app/
```

Expected: 200.

Also try the chip in production:

- Open https://sulat.vercel.app
- Toggle the new "Unread" chip in the bottom bar
- Verify behavior matches the dev preview

### Step 4: Hand back to user

Tell the user the deploy is live, list the production URL, and remind them to clear localStorage if they want a fresh state.

---

## Self-review checklist

Done by writer before declaring complete:

**Spec coverage** — every section of the spec maps to a task:

- ✅ `useReadStories` (Task 1) — read + starred sets, hydrating flag
- ✅ `useUnreadFilter` (Task 2) — unreadOnly + hydrating + toggle
- ✅ `UnreadFilterChip` (Task 3) — bottom-bar toggle UI
- ✅ `StarToggle` (Task 4) — sheet-header star button
- ✅ `PinMarker` star overlay (Task 5) — visual indicator on starred pins
- ✅ Thread isStarred through `StoryPins` (Task 6) — both web and native variants
- ✅ `StorySheet` markRead on mount + StarToggle in header (Task 7)
- ✅ `app/index.tsx` chip + filter + extended loader gating (Task 8) — covers the spec's loader-integration section
- ✅ Visual verification (Task 9) — covers the spec's "Visual verification" section
- ✅ Author exemption — implemented in Task 8's `visibleStories` filter (`s.author_id === meId`)
- ✅ JSON-encoded single-key persistence — implemented in Task 1's `useReadStories`

**Type consistency**

- `useReadStories` returns `{ read, starred, hydrating, isRead, isStarred, markRead, toggleStarred }` — same shape consumed in `StarToggle` (Task 4), `StoryPins` (Task 6), `StorySheet` (Task 7), and `app/index.tsx` (Task 8).
- `useUnreadFilter` returns `{ unreadOnly, hydrating, toggle }` — same shape consumed in `UnreadFilterChip` (Task 3) and `app/index.tsx` (Task 8).
- `StarToggleProps` requires a single `storyId: string` — matched in `StorySheet` Task 7.
- `PinMarkerProps.isStarred` is optional boolean — matched in `StoryPins` Task 6.

**No placeholders** — checked all task bodies; no "TBD"/"appropriate"/"TODO" patterns.

**Native parity** — `useReadStories` and `useUnreadFilter` work identically on web and native (kv layer abstracts the difference). No platform guards needed for this feature.
