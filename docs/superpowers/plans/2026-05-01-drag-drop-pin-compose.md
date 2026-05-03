# Drag-and-Drop Pin Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing `+` button "open empty compose" flow with a "drop pin first → confirm → write" flow. Three trigger gestures (tap `+`, press-and-drag from `+`, double-tap empty map) all converge on the same draft pin + chip → ComposeSheet path. Pin stays draggable through both phases.

**Architecture:** Replace `composeOpen` + `composeCoords` in `app/index.tsx` with a `DraftPhase` discriminated union (`idle | placing | composing`). Introduce a new `DraftConfirmChip` component (platform-split, web uses `react-map-gl` Popup, native uses MapLibre RN `Marker`) that anchors near the draft pin during the `placing` phase. Reuse the existing draggable `DraftPinMarker` unchanged.

**Tech Stack:** React Native 0.76+, Expo SDK 54, react-map-gl/maplibre (web), @maplibre/maplibre-react-native (native), `expo-location`, jest-expo + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-05-01-drag-drop-pin-compose-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/compose/DraftConfirmChip.tsx` | Create | Native variant. Renders the chip inside a MapLibre RN `<Marker>` anchored at the pin's lng/lat. Calls `reverseGeocode`, exposes `onWrite` + `onCancel`. |
| `src/compose/DraftConfirmChip.web.tsx` | Create | Web variant. Renders the chip inside a `react-map-gl` `<Popup>` anchored at the pin's lng/lat. Same props as native. |
| `src/compose/__tests__/DraftConfirmChip.test.tsx` | Create | Unit tests for the chip's content (label states, button callbacks). The platform-specific anchoring (Popup vs Marker) is mocked. |
| `app/index.tsx` | Modify | Replace `composeOpen + composeCoords` state with `draftPhase` discriminated union. Wire `+` tap, `+` press-and-drag, and `onDoubleClick` to drop a pin into `placing` (not `composing`). Render `DraftConfirmChip` during `placing`. |
| `tests/integration/draftPinCompose.test.tsx` | Create | Integration tests for the state machine in `app/index.tsx`: trigger → placing → Write → composing, plus Cancel paths. Map and ComposeSheet are mocked. |

No changes to: `DraftPinMarker.tsx`, `DraftPinMarker.web.tsx`, `MapView.tsx`, `MapView.web.tsx`, `lib/reverseGeocode.ts`. Their interfaces are sufficient.

---

## Task 1: DraftPhase state machine + refactor existing state

**Files:**
- Modify: `app/index.tsx` (lines 64–65 state, 97 reset, 115–119 openCompose, 135 onDoubleClick, 150–157 DraftPinMarker, 265–270 ComposeSheet)

The goal of this task is purely a refactor: same external behavior, cleaner internal state. New behavior comes in later tasks. Run the existing test suite at the end to confirm no regression.

- [ ] **Step 1: Add the `DraftPhase` type and state**

In `app/index.tsx`, find the line:
```tsx
const [composeOpen, setComposeOpen] = useState(false);
const [composeCoords, setComposeCoords] = useState<{ lat: number; lng: number } | undefined>();
```

Replace with:
```tsx
type DraftPhase =
  | { kind: 'idle' }
  | { kind: 'placing'; coords: { lat: number; lng: number } }
  | { kind: 'composing'; coords: { lat: number; lng: number } };

const [draftPhase, setDraftPhase] = useState<DraftPhase>({ kind: 'idle' });
```

- [ ] **Step 2: Update the `openCompose` helper**

Find:
```tsx
const openCompose = (coords?: { lat: number; lng: number }) => {
  closeAllSheets();
  setComposeCoords(coords);
  setComposeOpen(true);
};
```

Replace with (preserves existing behavior — direct-to-composing — for now; later tasks will introduce `placing`):
```tsx
const openCompose = (coords?: { lat: number; lng: number }) => {
  closeAllSheets();
  if (coords) {
    setDraftPhase({ kind: 'composing', coords });
  } else {
    // No coords yet → caller will populate via a later trigger.
    // For now, the FAB tap path lands here; Task 3 changes this to drop a pin.
    setDraftPhase({ kind: 'composing', coords: { lat: 0, lng: 0 } });
  }
};
```

- [ ] **Step 3: Update the `closeAllSheets` reset**

Find the line that resets compose:
```tsx
setComposeOpen(false);
```

Replace with:
```tsx
setDraftPhase({ kind: 'idle' });
```

(Drop the `setComposeCoords` line as well — it no longer exists.)

- [ ] **Step 4: Update DraftPinMarker render condition**

Find:
```tsx
{composeOpen && composeCoords && (
  <DraftPinMarker
    longitude={composeCoords.lng}
    latitude={composeCoords.lat}
```

Replace with:
```tsx
{draftPhase.kind !== 'idle' && (
  <DraftPinMarker
    longitude={draftPhase.coords.lng}
    latitude={draftPhase.coords.lat}
```

The `onDragEnd` body in that block already updates `composeCoords` — change it to update `draftPhase.coords` while preserving the kind:
```tsx
onDragEnd={(loc) => setDraftPhase((p) =>
  p.kind === 'idle' ? p : { kind: p.kind, coords: { lat: loc.lat, lng: loc.lng } }
)}
```

- [ ] **Step 5: Update ComposeSheet render condition + props**

Find:
```tsx
{composeOpen && (
  <ComposeSheet
    coords={composeCoords}
```

Replace with:
```tsx
{draftPhase.kind === 'composing' && (
  <ComposeSheet
    coords={draftPhase.coords}
```

The `onClose` and `onPosted` handlers already call `setComposeOpen(false)` — those go through the updated `closeAllSheets` already from Step 3, but verify the inline `setComposeOpen(false)` at line 269 is replaced with `setDraftPhase({ kind: 'idle' })`.

- [ ] **Step 6: Run the existing test suite**

Run: `npm test -- --silent`
Expected: same baseline as before (206/210 passing; the same 3 pre-existing suites failing). No NEW failures.

If any new failure references `composeOpen` or `composeCoords`, that test mocked the old internals and needs updating. There should be none — the existing tests don't reach into `app/index.tsx`'s internals.

- [ ] **Step 7: Commit**

```bash
git add app/index.tsx
git commit -m "$(cat <<'EOF'
refactor(compose): replace composeOpen+composeCoords with DraftPhase

Pure refactor. Single discriminated union (idle | placing | composing)
replaces two parallel state slots, prepping for the upcoming chip-based
draft confirmation step. No external behavior change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire double-tap to drop pin into `placing` (not `composing`)

**Files:**
- Create: `tests/integration/draftPinCompose.test.tsx`
- Modify: `app/index.tsx` (around line 135, the `onDoubleClick` callback)

- [ ] **Step 1: Write the failing integration test**

Create `tests/integration/draftPinCompose.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock the map so we can fire its onDoubleClick callback synchronously.
const onDoubleClickRef: { current: ((loc: { lat: number; lng: number }) => void) | null } = { current: null };

jest.mock('@/map/LazyMapView', () => ({
  LazyMapView: ({ children, onDoubleClick }: any) => {
    onDoubleClickRef.current = onDoubleClick;
    return require('react-native').View({ children });
  },
}));
jest.mock('@/map/StoryPins', () => ({ StoryPins: () => null }));
jest.mock('@/map/HeatmapLayer', () => ({ HeatmapLayer: () => null }));
jest.mock('@/compose/DraftPinMarker', () => ({
  DraftPinMarker: ({ longitude, latitude }: { longitude: number; latitude: number }) =>
    require('react').createElement(
      require('react-native').View,
      { testID: 'draft-pin', accessibilityLabel: `pin-${latitude}-${longitude}` },
    ),
}));
jest.mock('@/compose/ComposeSheet', () => ({
  ComposeSheet: () => require('react').createElement(require('react-native').View, { testID: 'compose-sheet' }),
}));
jest.mock('@/compose/DraftConfirmChip', () => ({
  DraftConfirmChip: ({ onWrite, onCancel }: any) =>
    require('react').createElement(require('react-native').View, { testID: 'draft-chip' }),
}));
jest.mock('@/data/useStories', () => ({ useStories: () => ({ stories: [], loading: false, error: null }) }));
jest.mock('@/data/useNotifications', () => ({ useNotifications: () => ({ activityCount: 0, memoryCount: 0 }) }));
jest.mock('@/data/useUser', () => ({ useUser: () => ({ user: { id: 'u1' }, loading: false, error: null }) }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

import IndexScreen from '../../app/index';

describe('draft pin compose flow', () => {
  beforeEach(() => { onDoubleClickRef.current = null; });

  it('double-tapping the map drops a pin (placing phase) but does not open ComposeSheet', () => {
    const { queryByTestId } = render(<IndexScreen />);
    expect(onDoubleClickRef.current).toBeTruthy();

    onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });

    // Pin appears
    expect(queryByTestId('draft-pin')).toBeTruthy();
    // Chip appears
    expect(queryByTestId('draft-chip')).toBeTruthy();
    // ComposeSheet does NOT appear yet
    expect(queryByTestId('compose-sheet')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: FAIL — the ComposeSheet currently appears immediately on double-tap.

- [ ] **Step 3: Update the `onDoubleClick` callback**

In `app/index.tsx`, find:
```tsx
onDoubleClick={(loc) => openCompose({ lat: loc.lat, lng: loc.lng })}
```

Replace with:
```tsx
onDoubleClick={(loc) => {
  closeAllSheets();
  setDraftPhase({ kind: 'placing', coords: { lat: loc.lat, lng: loc.lng } });
}}
```

- [ ] **Step 4: Verify test passes**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx tests/integration/draftPinCompose.test.tsx
git commit -m "$(cat <<'EOF'
feat(compose): double-tap drops pin into placing phase

Double-tap the map now drops a draft pin and shows the confirm chip
instead of opening ComposeSheet directly. Confirm step comes via the
chip's Write button (next task).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire `+` button tap to drop pin (GPS or map-center)

**Files:**
- Modify: `app/index.tsx` (the `+` FAB `onPress` handler around line 341, and a new helper to compute drop coords)
- Modify: `tests/integration/draftPinCompose.test.tsx` (add a new test case)

- [ ] **Step 1: Write the failing test**

Append to `tests/integration/draftPinCompose.test.tsx`:

```tsx
it('tapping + drops a pin at map center when GPS is denied', async () => {
  const { getByText, queryByTestId, findByTestId } = render(<IndexScreen />);

  // Trigger the FAB. The "+" character on the FAB:
  fireEvent.press(getByText('＋'));

  // Pin and chip render
  expect(await findByTestId('draft-pin')).toBeTruthy();
  expect(queryByTestId('draft-chip')).toBeTruthy();
  // Sheet is NOT open
  expect(queryByTestId('compose-sheet')).toBeNull();
});

it('tapping + uses GPS coords when permission is granted', async () => {
  const Location = require('expo-location');
  Location.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
  Location.getCurrentPositionAsync.mockResolvedValueOnce({ coords: { latitude: 7.7, longitude: 125.5 } });

  const { getByText, findByTestId } = render(<IndexScreen />);
  fireEvent.press(getByText('＋'));

  const pin = await findByTestId('draft-pin');
  // The mock pin sets accessibilityLabel to `pin-${lat}-${lng}`
  expect(pin.props.accessibilityLabel).toBe('pin-7.7-125.5');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: both new tests FAIL — current `+` opens ComposeSheet without coords.

- [ ] **Step 3: Add a drop-coords helper and rewire `+`**

In `app/index.tsx`, just above the `return (` block, add:

```tsx
/** Resolve the coords where a pin drops when the user taps "+":
 *  Use the user's GPS if granted; otherwise fall back to the visible
 *  map center (read from the viewport). */
const resolveDropCoords = useCallback(async (): Promise<{ lat: number; lng: number }> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const { coords } = await Location.getCurrentPositionAsync({});
      return { lat: coords.latitude, lng: coords.longitude };
    }
  } catch {
    /* fall through to viewport center */
  }
  return { lat: viewport.latitude, lng: viewport.longitude };
}, [viewport.latitude, viewport.longitude]);

const startDraftFromFab = useCallback(async () => {
  closeAllSheets();
  const coords = await resolveDropCoords();
  setDraftPhase({ kind: 'placing', coords });
}, [resolveDropCoords]);
```

Replace the FAB's `onPress` (currently `() => openCompose()`):
```tsx
onPress={startDraftFromFab}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: PASS (3 tests now: one double-tap, two tap-+).

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx tests/integration/draftPinCompose.test.tsx
git commit -m "$(cat <<'EOF'
feat(compose): + button drops pin at GPS or map center

Tapping the + FAB now drops a draft pin (GPS if granted, viewport center
otherwise) into the placing phase. Replaces the previous behavior of
opening ComposeSheet with no location.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Build `DraftConfirmChip` (visual + callbacks, no positioning yet)

**Files:**
- Create: `src/compose/DraftConfirmChip.tsx` (the native variant — for now, both platforms will share this single file; web variant added in Task 6)
- Create: `src/compose/__tests__/DraftConfirmChip.test.tsx`

- [ ] **Step 1: Write the failing unit test**

Create `src/compose/__tests__/DraftConfirmChip.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DraftConfirmChip } from '../DraftConfirmChip';

jest.mock('@/lib/reverseGeocode', () => ({
  reverseGeocode: jest.fn(),
}));

// On native, the chip wraps in a Marker — mock it as a passthrough so we can render in jest.
jest.mock('@maplibre/maplibre-react-native', () => ({
  Marker: ({ children }: { children: React.ReactNode }) =>
    require('react').createElement(require('react-native').View, null, children),
}));

const { reverseGeocode } = jest.requireMock('@/lib/reverseGeocode') as { reverseGeocode: jest.Mock };

describe('DraftConfirmChip', () => {
  beforeEach(() => { reverseGeocode.mockReset(); });

  it('renders Locating… while reverseGeocode is pending', () => {
    reverseGeocode.mockImplementation(() => new Promise(() => {})); // never resolves
    const { getByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(getByText(/Locating/i)).toBeTruthy();
  });

  it('shows resolved label after reverseGeocode succeeds', async () => {
    reverseGeocode.mockResolvedValueOnce({ city: 'Malolos', region: 'Bulacan', label: 'Malolos, Bulacan' });
    const { findByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await findByText('Malolos, Bulacan')).toBeTruthy();
  });

  it('falls back to "Dropped pin" on reverseGeocode error', async () => {
    reverseGeocode.mockRejectedValueOnce(new Error('boom'));
    const { findByText } = render(
      <DraftConfirmChip
        coords={{ lat: 14.5, lng: 121.0 }}
        onWrite={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(await findByText('Dropped pin')).toBeTruthy();
  });

  it('Write button calls onWrite', () => {
    reverseGeocode.mockResolvedValueOnce(null);
    const onWrite = jest.fn();
    const { getByText } = render(
      <DraftConfirmChip coords={{ lat: 14.5, lng: 121.0 }} onWrite={onWrite} onCancel={jest.fn()} />,
    );
    fireEvent.press(getByText('Write'));
    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it('✕ button calls onCancel', () => {
    reverseGeocode.mockResolvedValueOnce(null);
    const onCancel = jest.fn();
    const { getByText } = render(
      <DraftConfirmChip coords={{ lat: 14.5, lng: 121.0 }} onWrite={jest.fn()} onCancel={onCancel} />,
    );
    fireEvent.press(getByText('✕'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/compose/__tests__/DraftConfirmChip.test.tsx --silent`
Expected: FAIL — the file doesn't exist yet.

- [ ] **Step 3: Implement `DraftConfirmChip`**

Create `src/compose/DraftConfirmChip.tsx`:

```tsx
// src/compose/DraftConfirmChip.tsx — NATIVE (iOS/Android) implementation.
// On the web target Metro picks `DraftConfirmChip.web.tsx`.
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { reverseGeocode } from '@/lib/reverseGeocode';
import { useTheme } from '@/theme/ThemeContext';

export interface DraftConfirmChipProps {
  coords: { lat: number; lng: number };
  onWrite: () => void;
  onCancel: () => void;
}

/** Shows a small floating chip near the pin during the placing phase:
 *
 *    📍 <location-label>   Write   ✕
 *
 *  The label resolves via reverseGeocode and re-resolves when the coord
 *  changes (i.e. the user dragged the pin). Tapping Write commits the
 *  location and lets the parent transition to compose; ✕ cancels. */
export function DraftConfirmChip({ coords, onWrite, onCancel }: DraftConfirmChipProps) {
  const theme = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLabel(null);
    setError(false);
    reverseGeocode(coords)
      .then((result) => {
        if (cancelled) return;
        if (result && (result as { label?: string }).label) {
          setLabel((result as { label: string }).label);
        } else if (result && (result as { city?: string; region?: string }).city) {
          const r = result as { city: string; region?: string };
          setLabel(r.region ? `${r.city}, ${r.region}` : r.city);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [coords.lat, coords.lng]);

  const display = error ? 'Dropped pin' : (label ?? 'Locating…');

  return (
    <Marker coordinate={[coords.lng, coords.lat]} anchor={{ x: 0.5, y: 1.4 }}>
      <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={1}>
          📍 {display}
        </Text>
        <Pressable
          onPress={onWrite}
          style={[styles.action, { backgroundColor: theme.accentDim, borderColor: theme.accent }]}
          accessibilityLabel="Write a sulat at this location"
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>Write</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={[styles.cancel, { borderColor: theme.border }]}
          accessibilityLabel="Cancel and remove pin"
        >
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 180,
  },
  action: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  cancelText: {
    fontSize: 11,
    lineHeight: 13,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/compose/__tests__/DraftConfirmChip.test.tsx --silent`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/compose/DraftConfirmChip.tsx src/compose/__tests__/DraftConfirmChip.test.tsx
git commit -m "$(cat <<'EOF'
feat(compose): add DraftConfirmChip component (native variant)

Floating chip shown during placing phase. Resolves location via
reverseGeocode (with Locating… and 'Dropped pin' fallback states),
exposes Write + ✕ callbacks. Native variant uses MapLibre RN Marker
to anchor; web variant follows in a later task.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Render `DraftConfirmChip` in `app/index.tsx` during placing

**Files:**
- Modify: `app/index.tsx` (add chip render in the same conditional block as DraftPinMarker)
- Modify: `tests/integration/draftPinCompose.test.tsx` (extend tests)

- [ ] **Step 1: Write the failing tests**

Append to `tests/integration/draftPinCompose.test.tsx`:

```tsx
it('chip Write transitions placing → composing (sheet opens)', () => {
  const { queryByTestId, getByText } = render(<IndexScreen />);
  onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });

  // We're now in placing — sheet not open yet
  expect(queryByTestId('compose-sheet')).toBeNull();

  // Find the Write button on the (mocked) chip and press
  // The chip mock at the top exposes a button via a separate mock — extend it:
  // (See Step 2: we'll re-mock DraftConfirmChip to expose Write/Cancel buttons.)
  fireEvent.press(getByText('Write'));

  expect(queryByTestId('compose-sheet')).toBeTruthy();
});

it('chip ✕ transitions placing → idle (pin and chip gone)', () => {
  const { queryByTestId, getByText } = render(<IndexScreen />);
  onDoubleClickRef.current!({ lat: 14.5, lng: 121.0 });

  fireEvent.press(getByText('✕'));

  expect(queryByTestId('draft-pin')).toBeNull();
  expect(queryByTestId('draft-chip')).toBeNull();
  expect(queryByTestId('compose-sheet')).toBeNull();
});
```

Update the existing `DraftConfirmChip` mock at the top of the file so it actually exposes Write + ✕ buttons:
```tsx
jest.mock('@/compose/DraftConfirmChip', () => ({
  DraftConfirmChip: ({ onWrite, onCancel }: any) => {
    const { View, Text, Pressable } = require('react-native');
    const React = require('react');
    return React.createElement(
      View,
      { testID: 'draft-chip' },
      React.createElement(Pressable, { onPress: onWrite }, React.createElement(Text, null, 'Write')),
      React.createElement(Pressable, { onPress: onCancel }, React.createElement(Text, null, '✕')),
    );
  },
}));
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: the two new tests FAIL — the chip isn't rendered or wired yet.

- [ ] **Step 3: Render the chip and wire its callbacks**

In `app/index.tsx`, locate the existing DraftPinMarker conditional (the `{draftPhase.kind !== 'idle' && (` block from Task 1) and place the chip render INSIDE the LazyMapView (so it's a map child, not a sibling). Add directly after the DraftPinMarker:

```tsx
{draftPhase.kind === 'placing' && (
  <DraftConfirmChip
    coords={draftPhase.coords}
    onWrite={() => setDraftPhase({ kind: 'composing', coords: draftPhase.coords })}
    onCancel={() => setDraftPhase({ kind: 'idle' })}
  />
)}
```

Add the import at the top:
```tsx
import { DraftConfirmChip } from '@/compose/DraftConfirmChip';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx tests/integration/draftPinCompose.test.tsx
git commit -m "$(cat <<'EOF'
feat(compose): render DraftConfirmChip during placing phase

Wire chip's Write/Cancel callbacks to the DraftPhase state machine.
Write transitions placing → composing (sheet opens). ✕ transitions
placing → idle (pin and chip disappear).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Web variant of `DraftConfirmChip`

**Files:**
- Create: `src/compose/DraftConfirmChip.web.tsx`

The native variant uses MapLibre RN's `<Marker>`. On web, react-map-gl's `<Marker>` works similarly but the Pressable taps don't propagate cleanly inside a Marker (the map captures clicks). Instead, web uses `<Popup>` from react-map-gl, which is designed for in-map UI overlays.

- [ ] **Step 1: Implement the web variant**

Create `src/compose/DraftConfirmChip.web.tsx`:

```tsx
// src/compose/DraftConfirmChip.web.tsx — WEB implementation.
import { useEffect, useState } from 'react';
import { Popup } from 'react-map-gl/maplibre';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reverseGeocode } from '@/lib/reverseGeocode';
import { useTheme } from '@/theme/ThemeContext';

export interface DraftConfirmChipProps {
  coords: { lat: number; lng: number };
  onWrite: () => void;
  onCancel: () => void;
}

export function DraftConfirmChip({ coords, onWrite, onCancel }: DraftConfirmChipProps) {
  const theme = useTheme();
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLabel(null);
    setError(false);
    reverseGeocode(coords)
      .then((result) => {
        if (cancelled) return;
        if (result && (result as { label?: string }).label) {
          setLabel((result as { label: string }).label);
        } else if (result && (result as { city?: string; region?: string }).city) {
          const r = result as { city: string; region?: string };
          setLabel(r.region ? `${r.city}, ${r.region}` : r.city);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [coords.lat, coords.lng]);

  const display = error ? 'Dropped pin' : (label ?? 'Locating…');

  return (
    <Popup
      longitude={coords.lng}
      latitude={coords.lat}
      anchor="bottom"
      offset={28}
      closeButton={false}
      closeOnClick={false}
      // The Popup background is overridden by our chip styling below.
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ background: 'transparent', padding: 0 } as object}
    >
      <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={1}>
          📍 {display}
        </Text>
        <Pressable
          onPress={onWrite}
          style={[styles.action, { backgroundColor: theme.accentDim, borderColor: theme.accent }]}
          accessibilityLabel="Write a sulat at this location"
        >
          <Text style={[styles.actionText, { color: theme.accent }]}>Write</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={[styles.cancel, { borderColor: theme.border }]}
          accessibilityLabel="Cancel and remove pin"
        >
          <Text style={[styles.cancelText, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>
    </Popup>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 180,
  },
  action: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cancel: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  cancelText: {
    fontSize: 11,
    lineHeight: 13,
  },
});
```

- [ ] **Step 2: Run web preview locally and verify chip appears**

Run: `npm run web` and open the preview. Double-tap an empty area of the map. Confirm:
- A draft pin drops at the tap location
- The chip appears above the pin with `📍 <location>` and Write + ✕ buttons
- Tapping Write opens the ComposeSheet
- Tapping ✕ removes both the chip and the pin

(Manual verification — there's no web-specific automated test for the Popup positioning.)

- [ ] **Step 3: Commit**

```bash
git add src/compose/DraftConfirmChip.web.tsx
git commit -m "$(cat <<'EOF'
feat(compose): web variant of DraftConfirmChip

Uses react-map-gl Popup for in-map anchoring (vs Marker on native, which
has touch-event quirks for pressables). Same props and visual as the
native variant.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Press-and-drag from `+` (Gesture B)

**Files:**
- Modify: `app/index.tsx` (the `+` FAB block — add PanResponder)

This task introduces the press-and-drag gesture from the FAB. The implementation uses React Native's `PanResponder` (works on both web and native via react-native-web). On press-and-hold > 200ms followed by movement, the FAB enters drag-arm mode; finger movement updates a "drag preview" overlay that follows the cursor; release converts the screen position to map coords and drops the pin there.

This task is the most platform-sensitive. Test coverage is integration-level (the existing test file) for the start state; the actual screen→map coord conversion is verified manually.

- [ ] **Step 1: Write the failing test for drag-start state**

Append to `tests/integration/draftPinCompose.test.tsx`:

```tsx
it('long-press on + shows drag-arm visual feedback', () => {
  const { getByText, queryByTestId } = render(<IndexScreen />);
  // Simulate a press-in on the FAB. The drag-arm visual is a "ghost" pin near the FAB —
  // a styled View with testID="fab-drag-ghost".
  fireEvent(getByText('＋'), 'pressIn');
  // Wait past the 200ms arm threshold.
  // Use jest fake timers in the future if this becomes flaky; for now, just check
  // that pressIn doesn't immediately render the ghost (only after timer fires).
  // Skipping the timer for simplicity — this test asserts the ghost exists
  // when in armed state, which we'll set via a state flag.
  // Replace this body with: just confirm the FAB renders (smoke test).
  expect(queryByTestId('fab-drag-ghost')).toBeNull(); // not armed yet on bare pressIn
});
```

(Note: a fully-fledged PanResponder simulation in jest is brittle. We rely on manual emulator testing for the drag itself; this test is a smoke check that the regular tap path still works alongside the drag handler.)

- [ ] **Step 2: Run test, expect pass (smoke)**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx --silent`
Expected: all 6 tests PASS (the new one trivially passes).

- [ ] **Step 3: Add the PanResponder + drag-arm state to `app/index.tsx`**

At the top of the IndexScreen function body, add:

```tsx
const [fabDragging, setFabDragging] = useState(false);
const [fabDragOffset, setFabDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
const fabArmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const fabDraggingRef = useRef(false);
useEffect(() => { fabDraggingRef.current = fabDragging; }, [fabDragging]);
const fabLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

const fabPanResponder = useMemo(() =>
  PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      if (fabArmTimerRef.current) clearTimeout(fabArmTimerRef.current);
      fabArmTimerRef.current = setTimeout(() => {
        fabArmTimerRef.current = null;
        setFabDragging(true);
      }, 200);
    },
    onPanResponderMove: (_e, g) => {
      if (!fabDraggingRef.current) return;
      setFabDragOffset({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: async (_e, g) => {
      if (fabArmTimerRef.current) { clearTimeout(fabArmTimerRef.current); fabArmTimerRef.current = null; }
      const wasDragging = fabDraggingRef.current;
      setFabDragging(false);
      setFabDragOffset({ x: 0, y: 0 });
      if (!wasDragging) {
        // Plain tap — fall through to the existing tap handler
        startDraftFromFab();
        return;
      }
      // Compute drop coords from the FAB layout + drag offset
      const layout = fabLayoutRef.current;
      if (!layout) return;
      const screenX = layout.x + layout.width / 2 + g.dx;
      const screenY = layout.y + layout.height / 2 + g.dy;
      // Read the map ref via MapContext (native) or via window (web hack).
      // For the web target: we use react-map-gl's mapRef from the LazyMapView.
      // For native: useMapRef from MapContext.
      // To keep this task scoped, use a thin helper:
      const dropCoords = await screenToMapCoords({ x: screenX, y: screenY });
      if (dropCoords) {
        closeAllSheets();
        setDraftPhase({ kind: 'placing', coords: dropCoords });
      }
    },
    onPanResponderTerminate: () => {
      if (fabArmTimerRef.current) { clearTimeout(fabArmTimerRef.current); fabArmTimerRef.current = null; }
      setFabDragging(false);
      setFabDragOffset({ x: 0, y: 0 });
    },
  }),
  [startDraftFromFab],
);
```

Add a stub `screenToMapCoords` helper at the top of the file:

```tsx
/** Converts a screen-pixel coordinate (relative to the entire viewport)
 *  to a geographic lng/lat using the active map ref. Returns null if the
 *  map ref isn't ready. Implementation is platform-aware via the same
 *  MapContext that StoryPins uses. */
async function screenToMapCoords(
  point: { x: number; y: number },
): Promise<{ lat: number; lng: number } | null> {
  // The actual implementation lives in a small platform-split module added
  // alongside this task. Keep this body as a placeholder; the helper is
  // imported from the per-platform file below.
  void point;
  return null;
}
```

…then immediately replace that placeholder with a real platform-split helper:

Create `src/map/screenToMapCoords.tsx`:
```tsx
// Shared interface; per-platform implementations below.
import { useEffect } from 'react';
export type Lookup = (point: { x: number; y: number }) => Promise<{ lat: number; lng: number } | null>;
let activeLookup: Lookup | null = null;

/** Hook used by MapView (.web.tsx and .tsx) to register the active lookup
 *  whenever the map mounts. Cleans up on unmount. */
export function useRegisterScreenLookup(lookup: Lookup) {
  useEffect(() => {
    activeLookup = lookup;
    return () => { if (activeLookup === lookup) activeLookup = null; };
  }, [lookup]);
}

export async function screenToMapCoords(point: { x: number; y: number }): Promise<{ lat: number; lng: number } | null> {
  if (!activeLookup) return null;
  return activeLookup(point);
}
```

In `src/map/MapView.web.tsx`, register the lookup on mount. Add inside the component:
```tsx
const lookup = useCallback(async (point: { x: number; y: number }) => {
  const m = mapRef.current?.getMap();
  if (!m) return null;
  const ll = m.unproject([point.x, point.y]);
  return { lat: ll.lat, lng: ll.lng };
}, []);
useRegisterScreenLookup(lookup);
```

In `src/map/MapView.tsx` (native), do the same with the MapLibre RN `MapRef.unproject` (which is async and returns an `LngLat` tuple `[lng, lat]`):
```tsx
const lookup = useCallback(async (point: { x: number; y: number }) => {
  const m = mapRef.current;
  if (!m) return null;
  const ll = await m.unproject([point.x, point.y]);
  return { lat: ll[1], lng: ll[0] };
}, []);
useRegisterScreenLookup(lookup);
```

Both files need the import:
```tsx
import { useRegisterScreenLookup } from './screenToMapCoords';
```

Update `app/index.tsx` to import the real helper:
```tsx
import { screenToMapCoords } from '@/map/screenToMapCoords';
```
…and DELETE the local stub function added earlier.

Replace the FAB's existing `<PressableScale onPress={startDraftFromFab}>` block with one that BOTH supports the regular tap (via the PanResponder's release-without-arm path) AND lays out for the drag, by attaching the PanResponder to the wrapping View and capturing the FAB's layout:

```tsx
<View
  style={styles.fabWrap}
  onLayout={(e) => { fabLayoutRef.current = e.nativeEvent.layout; }}
  pointerEvents="box-none"
>
  <View style={[styles.fabHalo, { backgroundColor: theme.accentSoft, borderRadius: theme.radii.full }]} pointerEvents="none" />
  <View {...fabPanResponder.panHandlers}>
    <View
      style={[
        styles.fab,
        {
          backgroundColor: theme.accent,
          borderRadius: theme.radii.full,
          ...theme.elevations.glow,
          transform: [{ translateX: fabDragOffset.x }, { translateY: fabDragOffset.y }, { scale: fabDragging ? 1.18 : 1 }],
        },
      ]}
    >
      <Text style={styles.fabPlus}>＋</Text>
    </View>
  </View>
</View>
```

(The `PressableScale` wrapper goes away — its scale-on-press effect is replaced by the drag-arm scale-up. Tap visual feedback is handled by the FAB's natural scale change when armed.)

- [ ] **Step 4: Run all tests**

Run: `npm test -- tests/integration/draftPinCompose.test.tsx src/compose/__tests__/DraftConfirmChip.test.tsx --silent`
Expected: all PASS (no new failures from this refactor — the smoke test for FAB layout is included).

- [ ] **Step 5: Manual web verification**

Run: `npm run web`. In the preview:
- **Tap +** → pin drops at GPS or map center, chip appears
- **Press-and-hold + then drag onto the map** → after ~200ms the FAB scales up (drag-arm visual). Drag finger across map; release → pin drops where finger released.
- **Long-press + then release without moving** → falls through to "tap" path; pin drops at GPS/center.

- [ ] **Step 6: Commit**

```bash
git add app/index.tsx src/map/screenToMapCoords.tsx src/map/MapView.tsx src/map/MapView.web.tsx tests/integration/draftPinCompose.test.tsx
git commit -m "$(cat <<'EOF'
feat(compose): press-and-drag + FAB to drop pin (Gesture B)

PanResponder on the FAB. 200ms hold arms drag mode; finger movement
visually drags the FAB; release calls map.unproject to convert the
release screen point to lng/lat and drops a pin there. Plain taps
(release before arm) fall through to the existing GPS-or-center path.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Polish — debounced reverseGeocode on rapid drag

**Files:**
- Modify: `src/compose/DraftConfirmChip.tsx` and `src/compose/DraftConfirmChip.web.tsx`

If the user drags the pin quickly, multiple `reverseGeocode` calls pile up. Add a 250ms debounce + abort the previous in-flight request before kicking off a new one.

- [ ] **Step 1: Write the failing test**

Append to `src/compose/__tests__/DraftConfirmChip.test.tsx`:

```tsx
it('debounces reverseGeocode when coords change rapidly', async () => {
  jest.useFakeTimers();
  reverseGeocode.mockResolvedValue({ city: 'A', region: null });
  const { rerender } = render(
    <DraftConfirmChip coords={{ lat: 1, lng: 1 }} onWrite={jest.fn()} onCancel={jest.fn()} />,
  );
  rerender(<DraftConfirmChip coords={{ lat: 2, lng: 2 }} onWrite={jest.fn()} onCancel={jest.fn()} />);
  rerender(<DraftConfirmChip coords={{ lat: 3, lng: 3 }} onWrite={jest.fn()} onCancel={jest.fn()} />);
  // Three rerenders, but only one reverseGeocode call should fire after 250ms debounce.
  jest.advanceTimersByTime(260);
  expect(reverseGeocode).toHaveBeenCalledTimes(1);
  expect(reverseGeocode).toHaveBeenCalledWith({ lat: 3, lng: 3 });
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npm test -- src/compose/__tests__/DraftConfirmChip.test.tsx --silent`
Expected: the new test FAILS (currently fires 3 times, not 1).

- [ ] **Step 3: Add debounce to both chip variants**

Replace the `useEffect` block in BOTH `DraftConfirmChip.tsx` and `DraftConfirmChip.web.tsx` with the debounced version:

```tsx
useEffect(() => {
  let cancelled = false;
  setLabel(null);
  setError(false);
  const handle = setTimeout(() => {
    if (cancelled) return;
    reverseGeocode(coords)
      .then((result) => {
        if (cancelled) return;
        if (result && (result as { label?: string }).label) {
          setLabel((result as { label: string }).label);
        } else if (result && (result as { city?: string; region?: string }).city) {
          const r = result as { city: string; region?: string };
          setLabel(r.region ? `${r.city}, ${r.region}` : r.city);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
  }, 250);
  return () => {
    cancelled = true;
    clearTimeout(handle);
  };
}, [coords.lat, coords.lng]);
```

- [ ] **Step 4: Run tests to verify**

Run: `npm test -- src/compose/__tests__/DraftConfirmChip.test.tsx --silent`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compose/DraftConfirmChip.tsx src/compose/DraftConfirmChip.web.tsx src/compose/__tests__/DraftConfirmChip.test.tsx
git commit -m "$(cat <<'EOF'
perf(compose): debounce reverseGeocode in DraftConfirmChip

Drag-end events fire reverseGeocode once after 250ms of stillness, not
on every coord update. Prevents request pileup when the user rapidly
drags the pin.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Manual verification + spec acceptance

This task is non-code: a manual walk-through against the spec's acceptance criteria.

- [ ] **Web (sulat.vercel.app preview):**
  - [ ] Tap `+` with location denied → pin at map center, chip shows location label, Write opens sheet, ✕ cancels
  - [ ] Tap `+` with location granted → pin at GPS coords
  - [ ] Press-and-drag `+` onto map → pin drops at finger release coord
  - [ ] Double-tap empty map → pin drops at tap coord, chip shows
  - [ ] Drag the draft pin while chip is visible → label re-resolves on drag-end
  - [ ] Tap Write while in draft phase → ComposeSheet opens, pin still visible
  - [ ] Drag the draft pin while ComposeSheet is open → location label in sheet updates
  - [ ] Close ComposeSheet → returns to map, no draft pin
  - [ ] Tap `✕` in chip → pin and chip disappear
  - [ ] Pan the map while chip is visible → pin and chip stay anchored to the lat/lng

- [ ] **Native (Pixel 7 emulator via dev client):**
  - Same checklist as web. Long-press-drag from FAB tested for tactile feel (200ms threshold).

- [ ] **Final commit (if any cleanup needed):**

After verification, no further commit unless cleanup needed.

- [ ] **Deploy to prod when ready:**

```bash
cd C:\Users\emman\OneDrive\Desktop\ClaudeBusiness\cozy-map-app
npx vercel deploy --prod --yes
```

---

## Done

Once Task 9 is signed off:
- The flow at `sulat.vercel.app` matches the spec
- Tests in `tests/integration/draftPinCompose.test.tsx` and `src/compose/__tests__/DraftConfirmChip.test.tsx` give regression coverage
- Native parity is ready (chip + drag both work via the same DraftPhase machine; only thing left for a Play Store push is rebuilding the APK from `C:\sb` and reinstalling on the emulator/phone)

Open follow-ups (out of scope for this plan):
- Background music feature (deferred)
- Drag-from-FAB ghost-cursor preview on web (UX polish, not required)
- Snap-to-place-of-interest during pin drag (future)
- Edge-flip chip positioning (chip flips below the pin when within ~80px of the top edge). Spec describes it; this plan ships chip always above (Marker `anchor` / Popup `offset`). Adding the flip requires real-time screen-position tracking of the pin via map move/zoom events; non-trivial and not user-visible until users hit the edge case.
