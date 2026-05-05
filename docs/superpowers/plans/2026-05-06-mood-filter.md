# Mood filter — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-select mood filter — a "Moods" pill chip in the lower-right (next to the existing "Unread" chip) that opens a bottom sheet listing all 8 moods with checkboxes. Composes via AND with the existing Unread filter.

**Architecture:** New context-provider hook (`useMoodFilter`) owns singleton selected-moods state with an "override flag" so future-added moods aren't accidentally hidden. New chip component opens a new bottom sheet using the existing `AnimatedSheet` pattern. `app/index.tsx` ANDs the mood selection into the existing `visibleStories` filter and ORs `moodHydrating` into the existing `useLoaderGating` call.

**Tech Stack:** TypeScript, React Native + react-native-web (Expo SDK 54), expo-router, jest-expo, @testing-library/react-native. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-06-mood-filter-design.md](cozy-map-app/docs/superpowers/specs/2026-05-06-mood-filter-design.md)

---

## Task 1: `useMoodFilter` provider + hook (TDD)

**Files:**
- Create: `src/data/__tests__/useMoodFilter.test.tsx`
- Create: `src/data/useMoodFilter.tsx`

### Step 1: Write the failing tests

Use the Write tool to create `src/data/__tests__/useMoodFilter.test.tsx` with this exact content:

```tsx
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { MoodFilterProvider, useMoodFilter } from '../useMoodFilter';
import { MOODS } from '@/moods/catalog';

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

function Harness({ onApi }: { onApi: (api: ReturnType<typeof useMoodFilter>) => void }) {
  const api = useMoodFilter();
  onApi(api);
  return (
    <View>
      <Text testID="hydrating">{String(api.hydrating)}</Text>
      <Text testID="size">{api.selectedMoods.size}</Text>
    </View>
  );
}

function renderWithProvider() {
  const apiRef: ReturnType<typeof useMoodFilter>[] = [];
  const utils = render(
    <MoodFilterProvider>
      <Harness onApi={(api) => apiRef.push(api)} />
    </MoodFilterProvider>
  );
  return { ...utils, apiRef };
}

describe('useMoodFilter', () => {
  test('starts with hydrating=true and selectedMoods = all 8 (no override default)', () => {
    const { getByTestId } = renderWithProvider();
    expect(getByTestId('hydrating').props.children).toBe('true');
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('with no persisted state, post-hydration selectedMoods = all 8', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(MOODS.length);
    const api = apiRef[apiRef.length - 1];
    for (const m of MOODS) {
      expect(api.selectedMoods.has(m.id)).toBe(true);
    }
  });

  test('with persisted override + subset, post-hydration selectedMoods = subset', async () => {
    store['sulat.filters.moodsOverride'] = 'true';
    store['sulat.filters.moods'] = JSON.stringify(['hopeful', 'memory']);
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(2);
    const api = apiRef[apiRef.length - 1];
    expect(api.selectedMoods.has('hopeful')).toBe(true);
    expect(api.selectedMoods.has('memory')).toBe(true);
    expect(api.selectedMoods.has('regret')).toBe(false);
  });

  test('with persisted moods but override=false, post-hydration ignores stored set (selectedMoods = all 8)', async () => {
    store['sulat.filters.moods'] = JSON.stringify(['hopeful']);
    // No override key — treated as false
    const { getByTestId } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('toggle(mood) starting from no-override state removes that mood and sets override', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length - 1);
    expect(store['sulat.filters.moodsOverride']).toBe('true');
    const stored: string[] = JSON.parse(store['sulat.filters.moods']);
    expect(stored).not.toContain('memory');
    expect(stored.length).toBe(MOODS.length - 1);
  });

  test('toggle(mood) twice (round-trip) returns to all-selected', async () => {
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    await act(async () => {
      await apiRef[apiRef.length - 1].toggle('memory');
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length);
  });

  test('reset() clears override and re-shows all moods', async () => {
    store['sulat.filters.moodsOverride'] = 'true';
    store['sulat.filters.moods'] = JSON.stringify(['hopeful']);
    const { getByTestId, apiRef } = renderWithProvider();
    await waitFor(() => expect(getByTestId('hydrating').props.children).toBe('false'));
    expect(getByTestId('size').props.children).toBe(1);
    await act(async () => {
      await apiRef[apiRef.length - 1].reset();
    });
    expect(getByTestId('size').props.children).toBe(MOODS.length);
    expect(store['sulat.filters.moodsOverride']).toBe('false');
  });

  test('useMoodFilter throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<Harness onApi={() => {}} />)
    ).toThrow(/useMoodFilter must be used inside/);
    spy.mockRestore();
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/data/__tests__/useMoodFilter.test.tsx --silent 2>&1 | tail -10
```

Expected: 8 failures (`Cannot find module '../useMoodFilter'`).

### Step 3: Commit failing tests

```bash
git add src/data/__tests__/useMoodFilter.test.tsx
git commit -m "test(data): failing tests for useMoodFilter hook"
```

### Step 4: Write the provider + hook

Use the Write tool to create `src/data/useMoodFilter.tsx` with this exact content:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { kvGet, kvSet } from '@/lib/persistence';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

const MOODS_KEY = 'sulat.filters.moods';
const OVERRIDE_KEY = 'sulat.filters.moodsOverride';

const ALL_MOOD_IDS: Mood[] = MOODS.map((m) => m.id);

export interface MoodFilterAPI {
  /**
   * Override-aware Set of moods the user wants visible.
   * - When the user has not overridden the default, this returns ALL moods
   *   (so future-added moods are visible automatically).
   * - When the user has toggled or reset, this returns the explicit selection.
   */
  selectedMoods: Set<Mood>;
  /** True from mount until persisted state has been read. */
  hydrating: boolean;
  /** Whether the user has ever explicitly chosen a mood selection. */
  hasOverride: boolean;
  /** Add or remove a single mood from the selection. Persists. */
  toggle: (mood: Mood) => Promise<void>;
  /** Re-show all moods (filter off). Clears the override flag. Persists. */
  reset: () => Promise<void>;
}

function safeParseMoodArray(json: string | null): Mood[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) {
      return v.filter((x): x is Mood =>
        typeof x === 'string' && (ALL_MOOD_IDS as string[]).includes(x)
      );
    }
  } catch {
    // fall through
  }
  return [];
}

const MoodFilterContext = createContext<MoodFilterAPI | null>(null);

export function MoodFilterProvider({ children }: { children: ReactNode }) {
  const [userSelectedMoods, setUserSelectedMoods] = useState<Set<Mood>>(() => new Set());
  const [hasOverride, setHasOverride] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  const userSelectedRef = useRef<Set<Mood>>(userSelectedMoods);
  const hasOverrideRef = useRef(hasOverride);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [overrideJson, moodsJson] = await Promise.all([
        kvGet(OVERRIDE_KEY),
        kvGet(MOODS_KEY),
      ]);
      if (cancelled) return;
      const override = overrideJson === 'true';
      const userSet = new Set<Mood>(safeParseMoodArray(moodsJson));
      userSelectedRef.current = userSet;
      hasOverrideRef.current = override;
      setUserSelectedMoods(userSet);
      setHasOverride(override);
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Override-aware computed Set: when no override, treat as all moods visible.
  const selectedMoods = useMemo<Set<Mood>>(() => {
    return hasOverride ? userSelectedMoods : new Set(ALL_MOOD_IDS);
  }, [hasOverride, userSelectedMoods]);

  const toggle = useCallback(async (mood: Mood) => {
    // First override starts from the all-selected baseline so unchecking ONE
    // mood doesn't accidentally hide everything.
    const baseline = hasOverrideRef.current
      ? new Set(userSelectedRef.current)
      : new Set<Mood>(ALL_MOOD_IDS);
    if (baseline.has(mood)) baseline.delete(mood);
    else baseline.add(mood);

    userSelectedRef.current = baseline;
    hasOverrideRef.current = true;
    setUserSelectedMoods(baseline);
    setHasOverride(true);

    await Promise.all([
      kvSet(OVERRIDE_KEY, 'true'),
      kvSet(MOODS_KEY, JSON.stringify(Array.from(baseline))),
    ]);
  }, []);

  const reset = useCallback(async () => {
    const empty = new Set<Mood>();
    userSelectedRef.current = empty;
    hasOverrideRef.current = false;
    setUserSelectedMoods(empty);
    setHasOverride(false);

    await Promise.all([
      kvSet(OVERRIDE_KEY, 'false'),
      kvSet(MOODS_KEY, JSON.stringify([])),
    ]);
  }, []);

  const value: MoodFilterAPI = {
    selectedMoods,
    hydrating,
    hasOverride,
    toggle,
    reset,
  };

  return <MoodFilterContext.Provider value={value}>{children}</MoodFilterContext.Provider>;
}

export function useMoodFilter(): MoodFilterAPI {
  const ctx = useContext(MoodFilterContext);
  if (!ctx) {
    throw new Error('useMoodFilter must be used inside <MoodFilterProvider>');
  }
  return ctx;
}
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/data/__tests__/useMoodFilter.test.tsx --silent 2>&1 | tail -5
```

Expected: 8 passing.

### Step 6: Commit

```bash
git add src/data/useMoodFilter.tsx
git commit -m "feat(data): useMoodFilter context + override-aware selectedMoods"
```

---

## Task 2: `MoodFilterChip` component (TDD)

**Files:**
- Create: `src/map/__tests__/MoodFilterChip.test.tsx`
- Create: `src/map/MoodFilterChip.tsx`

### Step 1: Write the failing tests

Use the Write tool to create `src/map/__tests__/MoodFilterChip.test.tsx` with this exact content:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodFilterChip } from '../MoodFilterChip';
import * as MoodFilterModule from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

jest.mock('@/data/useMoodFilter');

const ALL_MOODS: Set<Mood> = new Set(MOODS.map((m) => m.id));
const SUBSET_MOODS: Set<Mood> = new Set(['hopeful', 'memory'] as Mood[]);

function setHookReturn(selectedMoods: Set<Mood>, hasOverride: boolean) {
  jest.spyOn(MoodFilterModule, 'useMoodFilter').mockReturnValue({
    selectedMoods,
    hydrating: false,
    hasOverride,
    toggle: jest.fn(),
    reset: jest.fn(),
  });
}

beforeEach(() => {
  jest.restoreAllMocks();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('MoodFilterChip', () => {
  test('renders the label "Moods"', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByText } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByText('Moods')).toBeTruthy();
  });

  test('inactive when all moods selected (no override) — accessibilityState.selected = false', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByTestId('mood-filter-chip').props.accessibilityState?.selected).toBe(false);
  });

  test('active when fewer than all moods selected — accessibilityState.selected = true', () => {
    setHookReturn(SUBSET_MOODS, true);
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={() => {}} />)
    );
    expect(getByTestId('mood-filter-chip').props.accessibilityState?.selected).toBe(true);
  });

  test('tap calls onOpen', () => {
    setHookReturn(ALL_MOODS, false);
    const onOpen = jest.fn();
    const { getByTestId } = render(
      withTheme(<MoodFilterChip onOpen={onOpen} />)
    );
    fireEvent.press(getByTestId('mood-filter-chip'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/map/__tests__/MoodFilterChip.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 failures (`Cannot find module '../MoodFilterChip'`).

### Step 3: Commit failing tests

```bash
git add src/map/__tests__/MoodFilterChip.test.tsx
git commit -m "test(map): failing tests for MoodFilterChip"
```

### Step 4: Write the component

Use the Write tool to create `src/map/MoodFilterChip.tsx` with this exact content:

```tsx
import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useMoodFilter } from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';

export interface MoodFilterChipProps {
  /** Fired when the user taps the chip — parent opens the MoodFilterSheet. */
  onOpen: () => void;
}

/**
 * Lower-right pill chip that opens the mood filter sheet. Active state when
 * the user has narrowed the selection (fewer than all moods visible).
 */
export function MoodFilterChip({ onOpen }: MoodFilterChipProps) {
  const theme = useTheme();
  const { selectedMoods } = useMoodFilter();
  const active = selectedMoods.size < MOODS.length;
  const labelColor = active ? theme.accent : theme.textMuted;

  return (
    <PressableScale
      testID="mood-filter-chip"
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? 'Mood filter active — tap to change' : 'Filter by mood'}
      style={[
        styles.btn,
        { borderColor: active ? theme.accent : theme.border },
      ]}
    >
      <Text style={[styles.icon, { color: labelColor, opacity: active ? 1 : 0.85 }]}>🎚</Text>
      <Text style={[styles.label, { color: labelColor }]}>Moods</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(20, 26, 58, 0.85)',
    borderRadius: 999,
    borderWidth: 1,
  },
  icon: { fontSize: 14 },
  label: { fontSize: 12, letterSpacing: 0.5 },
});
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/map/__tests__/MoodFilterChip.test.tsx --silent 2>&1 | tail -5
```

Expected: 4 passing.

### Step 6: Commit

```bash
git add src/map/MoodFilterChip.tsx
git commit -m "feat(map): MoodFilterChip — opens the mood filter sheet"
```

---

## Task 3: `MoodFilterSheet` component (TDD)

**Files:**
- Create: `src/map/__tests__/MoodFilterSheet.test.tsx`
- Create: `src/map/MoodFilterSheet.tsx`

### Step 1: Write the failing tests

Use the Write tool to create `src/map/__tests__/MoodFilterSheet.test.tsx` with this exact content:

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeContext';
import { MoodFilterSheet } from '../MoodFilterSheet';
import * as MoodFilterModule from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

jest.mock('@/data/useMoodFilter');

const ALL_MOODS: Set<Mood> = new Set(MOODS.map((m) => m.id));

const mockToggle = jest.fn(() => Promise.resolve());
const mockReset = jest.fn(() => Promise.resolve());

function setHookReturn(selectedMoods: Set<Mood>, hasOverride: boolean) {
  jest.spyOn(MoodFilterModule, 'useMoodFilter').mockReturnValue({
    selectedMoods,
    hydrating: false,
    hasOverride,
    toggle: mockToggle,
    reset: mockReset,
  });
}

beforeEach(() => {
  mockToggle.mockClear();
  mockReset.mockClear();
  jest.restoreAllMocks();
});

function withTheme(node: React.ReactNode) {
  return <ThemeProvider>{node}</ThemeProvider>;
}

describe('MoodFilterSheet', () => {
  test('renders nothing when open=false', () => {
    setHookReturn(ALL_MOODS, false);
    const { queryByText } = render(
      withTheme(<MoodFilterSheet open={false} onClose={() => {}} />)
    );
    expect(queryByText('Moods')).toBeNull();
  });

  test('renders header "Moods" + a row for every mood when open=true', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByText } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByText('Moods')).toBeTruthy();
    for (const m of MOODS) {
      expect(getByText(m.name)).toBeTruthy();
    }
  });

  test('tap on a mood row calls toggle(moodId)', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    fireEvent.press(getByTestId('mood-filter-row-hopeful'));
    expect(mockToggle).toHaveBeenCalledWith('hopeful');
  });

  test('tap Reset calls reset()', () => {
    setHookReturn(new Set(['hopeful'] as Mood[]), true);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    fireEvent.press(getByTestId('mood-filter-reset'));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  test('Reset is disabled when hasOverride=false (nothing to reset)', () => {
    setHookReturn(ALL_MOODS, false);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByTestId('mood-filter-reset').props.accessibilityState?.disabled).toBe(true);
  });

  test('Reset is enabled when hasOverride=true', () => {
    setHookReturn(new Set(['hopeful'] as Mood[]), true);
    const { getByTestId } = render(
      withTheme(<MoodFilterSheet open={true} onClose={() => {}} />)
    );
    expect(getByTestId('mood-filter-reset').props.accessibilityState?.disabled).toBe(false);
  });
});
```

### Step 2: Run the tests — expect failures

```bash
npx jest src/map/__tests__/MoodFilterSheet.test.tsx --silent 2>&1 | tail -5
```

Expected: 6 failures (`Cannot find module '../MoodFilterSheet'`).

### Step 3: Commit failing tests

```bash
git add src/map/__tests__/MoodFilterSheet.test.tsx
git commit -m "test(map): failing tests for MoodFilterSheet"
```

### Step 4: Write the component

Use the Write tool to create `src/map/MoodFilterSheet.tsx` with this exact content:

```tsx
import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useMoodFilter } from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface MoodFilterSheetProps {
  /** When true, the sheet is mounted and animates in. */
  open: boolean;
  /** Fired when the user dismisses the sheet (backdrop tap). */
  onClose: () => void;
}

/**
 * Bottom sheet listing the 8 moods. Tapping a mood row toggles its
 * inclusion in the visible set. Tapping "Reset" clears the override and
 * returns to the default (all moods visible).
 */
export function MoodFilterSheet({ open, onClose }: MoodFilterSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { selectedMoods, hasOverride, toggle, reset } = useMoodFilter();

  if (!open) return null;

  const dismiss = () => {
    sheetRef.current?.close(onClose);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — tap to dismiss */}
      <PressableScale
        onPress={dismiss}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
      />

      <AnimatedSheet
        ref={sheetRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.surface,
          borderTopLeftRadius: theme.radii.xl,
          borderTopRightRadius: theme.radii.xl,
          maxHeight: '80%',
          paddingBottom: 32,
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Moods</Text>
          <PressableScale
            testID="mood-filter-reset"
            onPress={() => { if (hasOverride) reset(); }}
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasOverride }}
            accessibilityLabel={hasOverride ? 'Reset — show all moods' : 'Reset (nothing to reset)'}
            style={styles.resetBtn}
          >
            <Text
              style={[
                styles.resetLabel,
                { color: hasOverride ? theme.accent : theme.textFaint },
              ]}
            >
              Reset
            </Text>
          </PressableScale>
        </View>

        <ScrollView style={styles.list}>
          {MOODS.map((m) => {
            const active = selectedMoods.has(m.id as Mood);
            return (
              <PressableScale
                key={m.id}
                testID={`mood-filter-row-${m.id}`}
                onPress={() => toggle(m.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${m.name} — ${active ? 'shown' : 'hidden'}`}
                style={styles.row}
              >
                <Text style={styles.emoji}>{m.emoji}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: theme.textPrimary }]}>{m.name}</Text>
                  <Text style={[styles.desc, { color: theme.textMuted }]} numberOfLines={1}>
                    {m.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accent : 'transparent',
                    },
                  ]}
                />
              </PressableScale>
            );
          })}
        </ScrollView>
      </AnimatedSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  resetLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  list: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Georgia, serif',
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
});
```

### Step 5: Run the tests — expect pass

```bash
npx jest src/map/__tests__/MoodFilterSheet.test.tsx --silent 2>&1 | tail -5
```

Expected: 6 passing.

### Step 6: Run all data + map + story tests as a regression check

```bash
npx jest src/data/__tests__/ src/map/__tests__/ src/story/__tests__/ --silent 2>&1 | tail -5
```

Expected: all green.

### Step 7: Commit

```bash
git add src/map/MoodFilterSheet.tsx
git commit -m "feat(map): MoodFilterSheet — bottom sheet with 8 mood rows + reset"
```

---

## Task 4: Wire into `app/_layout.tsx` + `app/index.tsx`

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`

### Step 1: Wrap children in `MoodFilterProvider` in `app/_layout.tsx`

Use the Read tool to confirm the current shape of `app/_layout.tsx`. It should already contain `<ReadStoriesProvider>` and `<UnreadFilterProvider>`.

Use the Edit tool. Find this existing import block:

```tsx
import { ReadStoriesProvider } from '@/data/useReadStories';
import { UnreadFilterProvider } from '@/data/useUnreadFilter';
```

Add immediately after:

```tsx
import { MoodFilterProvider } from '@/data/useMoodFilter';
```

Then find the existing JSX:

```tsx
<ThemeProvider>
  <BackgroundMusicProvider>
    <ReadStoriesProvider>
      <UnreadFilterProvider>
        <UserInit />
        <Stack screenOptions={{ headerShown: false }} />
      </UnreadFilterProvider>
    </ReadStoriesProvider>
  </BackgroundMusicProvider>
</ThemeProvider>
```

Replace with:

```tsx
<ThemeProvider>
  <BackgroundMusicProvider>
    <ReadStoriesProvider>
      <UnreadFilterProvider>
        <MoodFilterProvider>
          <UserInit />
          <Stack screenOptions={{ headerShown: false }} />
        </MoodFilterProvider>
      </UnreadFilterProvider>
    </ReadStoriesProvider>
  </BackgroundMusicProvider>
</ThemeProvider>
```

### Step 2: Add imports + hook calls in `app/index.tsx`

Use the Read tool first to find the existing import block and existing hook calls. Then use the Edit tool.

Find this existing imports block (or similar):

```tsx
import { useReadStories } from '@/data/useReadStories';
import { useUnreadFilter } from '@/data/useUnreadFilter';
import { UnreadFilterChip } from '@/map/UnreadFilterChip';
```

Add nearby:

```tsx
import { useMoodFilter } from '@/data/useMoodFilter';
import { MoodFilterChip } from '@/map/MoodFilterChip';
import { MoodFilterSheet } from '@/map/MoodFilterSheet';
import type { Mood } from '@/data/types';
```

### Step 3: Add the hook call + new state

Find this existing block (around line 60–75):

```tsx
  const { read, starred, hydrating: readsHydrating } = useReadStories();
  const { unreadOnly, hydrating: filterHydrating } = useUnreadFilter();
  const loaderGating = useLoaderGating(loading || readsHydrating || filterHydrating);
```

Replace with:

```tsx
  const { read, starred, hydrating: readsHydrating } = useReadStories();
  const { unreadOnly, hydrating: filterHydrating } = useUnreadFilter();
  const { selectedMoods, hydrating: moodHydrating } = useMoodFilter();
  const loaderGating = useLoaderGating(loading || readsHydrating || filterHydrating || moodHydrating);
```

Then add a piece of state for the mood-sheet open boolean. Find the existing state declarations near the top of the function body (e.g., `const [heatmapOn, setHeatmapOn] = useState(true);`). Add nearby:

```tsx
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
```

### Step 4: Update `closeAllSheets` to also close the mood sheet

Find:

```tsx
  const closeAllSheets = () => {
    setSelectedStory(null);
    setDraftPhase({ kind: 'idle' });
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setNotifSheetOpen(false);
    setClusterStories(null);
  };
```

Replace with:

```tsx
  const closeAllSheets = () => {
    setSelectedStory(null);
    setDraftPhase({ kind: 'idle' });
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setNotifSheetOpen(false);
    setClusterStories(null);
    setMoodSheetOpen(false);
  };
```

### Step 5: Update `visibleStories` to AND the mood filter

Find this existing useMemo:

```tsx
  const visibleStories = useMemo(() => {
    if (!unreadOnly) return stories;
    const meId = user?.id;
    return stories.filter(
      (s) => s.author_id === meId || starred.has(s.id) || !read.has(s.id)
    );
  }, [stories, unreadOnly, read, starred, user?.id]);
```

Replace with:

```tsx
  const visibleStories = useMemo(() => {
    const meId = user?.id;
    return stories.filter((s) => {
      // Mood filter — applies regardless of override; selectedMoods is the
      // override-aware computed Set (returns all moods when no override).
      if (!selectedMoods.has(s.mood as Mood)) return false;
      // Unread filter — composes via AND.
      if (!unreadOnly) return true;
      return s.author_id === meId || starred.has(s.id) || !read.has(s.id);
    });
  }, [stories, unreadOnly, selectedMoods, read, starred, user?.id]);
```

### Step 6: Render the chip + sheet

Find the existing floating chip view:

```tsx
      <View style={styles.unreadChipFloat} pointerEvents="box-none">
        <UnreadFilterChip />
      </View>
```

Replace with:

```tsx
      <View style={styles.unreadChipFloat} pointerEvents="box-none">
        <MoodFilterChip onOpen={() => { closeAllSheets(); setMoodSheetOpen(true); }} />
        <View style={{ height: 8 }} />
        <UnreadFilterChip />
      </View>

      <MoodFilterSheet
        open={moodSheetOpen}
        onClose={() => setMoodSheetOpen(false)}
      />
```

### Step 7: TypeScript check + tests

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -15
```

Expected: no NEW errors involving `app/index.tsx`, `app/_layout.tsx`, or the new files.

```bash
npx jest --testPathIgnorePatterns=".worktrees" --silent 2>&1 | tail -5
```

Expected: 305+ passing (previous baseline 289 + ~18 new tests). Only the known NotificationSheet flake failing.

### Step 8: Commit

```bash
git add app/_layout.tsx app/index.tsx
git commit -m "feat(brand): wire MoodFilterChip + MoodFilterSheet into route; AND mood into visibleStories"
```

---

## Task 5: Visual verification in dev preview

This task is hands-on, not committable.

### Step 1: Confirm dev preview is running

Use `mcp__Claude_Preview__preview_list`. If `sulat-web` isn't running, start it with `mcp__Claude_Preview__preview_start`.

### Step 2: Clear localStorage and reload

```js
mcp__Claude_Preview__preview_eval with expression:

(() => {
  Object.keys(localStorage).filter(k => k.startsWith('sulat')).forEach(k => localStorage.removeItem(k));
  window.location.reload();
  return 'cleared';
})()
```

### Step 3: Verify both chips appear in lower-right

```js
mcp__Claude_Preview__preview_eval with expression:

new Promise(r => setTimeout(r, 6000)).then(() => ({
  moodChip: !!document.querySelector('[data-testid="mood-filter-chip"]'),
  unreadChip: !!document.querySelector('[data-testid="unread-filter-chip"]'),
  moodChipText: document.querySelector('[data-testid="mood-filter-chip"]')?.textContent,
  unreadChipText: document.querySelector('[data-testid="unread-filter-chip"]')?.textContent
}))
```

Expected: `moodChip: true`, `unreadChip: true`. Texts include "Moods" and "Unread".

### Step 4: Tap the Moods chip and verify the sheet appears with 8 rows

```js
mcp__Claude_Preview__preview_eval with expression:

(() => {
  const chip = document.querySelector('[data-testid="mood-filter-chip"]');
  chip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return new Promise(r => setTimeout(r, 800)).then(() => ({
    rowsRendered: document.querySelectorAll('[data-testid^="mood-filter-row-"]').length,
    resetButton: !!document.querySelector('[data-testid="mood-filter-reset"]'),
    resetDisabled: document.querySelector('[data-testid="mood-filter-reset"]')?.getAttribute('aria-disabled')
  }));
})()
```

Expected: `rowsRendered: 8`, `resetButton: true`, `resetDisabled` is `"true"` (because no override yet).

### Step 5: Tap a mood row and verify localStorage updates

```js
mcp__Claude_Preview__preview_eval with expression:

(() => {
  const row = document.querySelector('[data-testid="mood-filter-row-memory"]');
  row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return new Promise(r => setTimeout(r, 600)).then(() => ({
    overrideAfter: localStorage.getItem('sulat.filters.moodsOverride'),
    moodsAfter: localStorage.getItem('sulat.filters.moods'),
  }));
})()
```

Expected: `overrideAfter: "true"`, `moodsAfter` is a JSON array of 7 moods (excluding "memory").

### Step 6: Tap Reset and verify it clears

```js
mcp__Claude_Preview__preview_eval with expression:

(() => {
  const reset = document.querySelector('[data-testid="mood-filter-reset"]');
  reset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return new Promise(r => setTimeout(r, 600)).then(() => ({
    overrideAfter: localStorage.getItem('sulat.filters.moodsOverride'),
    moodsAfter: localStorage.getItem('sulat.filters.moods'),
  }));
})()
```

Expected: `overrideAfter: "false"`, `moodsAfter: "[]"`.

### Step 7: Tap backdrop to dismiss

```js
mcp__Claude_Preview__preview_eval with expression:

(() => {
  // Find the backdrop — it's the absolute-fill PressableScale with rgba(0,0,0,0.4)
  const all = Array.from(document.querySelectorAll('div'));
  const backdrop = all.find(d => {
    const cs = getComputedStyle(d);
    return cs.position === 'absolute' && cs.backgroundColor === 'rgba(0, 0, 0, 0.4)';
  });
  if (!backdrop) return 'no-backdrop';
  backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return new Promise(r => setTimeout(r, 600)).then(() => ({
    sheetGone: !document.querySelector('[data-testid="mood-filter-row-memory"]')
  }));
})()
```

Expected: `sheetGone: true`.

### Step 8: Take a screenshot for the record

`mcp__Claude_Preview__preview_screenshot` to capture the lower-right area showing both chips.

If any step fails, the issue is in the most-recently-touched task. Don't deploy until they all pass (or fail in known/explained ways).

---

## Task 6: Push + production deploy

Auto-deploy on push fails because of gitignored MP3s; production must be deployed via local Vercel CLI.

### Step 1: Push

```bash
git push origin mobile
```

### Step 2: Production deploy

```bash
vercel deploy --prod --yes
```

Expected: Production URL `Ready`, aliased to `sulat.vercel.app`.

### Step 3: Smoke check production

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sulat.vercel.app/
```

Expected: 200.

### Step 4: Hand back to user

Tell the user the deploy is live, list the URL, and remind them that toggling moods on / off in the new sheet will narrow down the visible pins.

---

## Self-review checklist

**Spec coverage** — every section of the spec maps to a task:

- ✅ `useMoodFilter` provider + hook (Task 1) — selectedMoods, hydrating, hasOverride, toggle, reset
- ✅ `MoodFilterChip` (Task 2) — opens the sheet, active state when filter narrowed
- ✅ `MoodFilterSheet` (Task 3) — 8 mood rows + reset button
- ✅ Override flag mechanic (Task 1, "Defaulting" section of spec)
- ✅ Reset clears override (Task 1, `reset()` impl)
- ✅ Loader integration via OR'd hydrating (Task 4 Step 3)
- ✅ Compose with Unread filter via AND (Task 4 Step 5, `visibleStories` useMemo)
- ✅ Stack chips vertically in lower-right (Task 4 Step 6)
- ✅ closeAllSheets dismisses the mood sheet (Task 4 Step 4)
- ✅ Visual verification (Task 5)
- ✅ Production deploy (Task 6)

**Type consistency**

- `useMoodFilter` returns `{ selectedMoods: Set<Mood>, hydrating, hasOverride, toggle, reset }` — same shape consumed in `MoodFilterChip` (Task 2), `MoodFilterSheet` (Task 3), and `app/index.tsx` (Task 4).
- `MoodFilterChipProps` requires `onOpen: () => void` — matched in Task 4 Step 6 wire-up.
- `MoodFilterSheetProps` requires `open: boolean, onClose: () => void` — matched in Task 4 Step 6 wire-up.
- `Mood` type imported from `@/data/types` — used consistently across all new files.

**No placeholders** — every step has full code or exact commands.

**Native parity** — `useMoodFilter` works identically on web and native (kv layer abstracts the difference). `MoodFilterSheet` uses the same `AnimatedSheet` pattern existing sheets use, so it works on both. No platform guards needed.
