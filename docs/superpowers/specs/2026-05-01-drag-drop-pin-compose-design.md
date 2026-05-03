# Drag-and-Drop Pin Compose

## Goal

Replace the existing "tap + → compose with no location" flow with a unified "drop a pin first, confirm, then compose" pattern. The user drops a draft pin onto the map via any of three gestures, confirms (or refines) its location, then opens the ComposeSheet. The existing ability to keep dragging the pin while the sheet is open is preserved.

## Why now

Today the `+` floating action button opens the ComposeSheet without any location set, and the user has to either type a location or close the sheet and double-tap the map. The double-tap path opens the sheet immediately with coordinates pre-set. Two distinct entry points with different mid-flow behavior is friction. This redesign collapses both into one shape: pick a spot first, write second.

## User-facing flow

```
[trigger]            [draft phase]               [compose phase]
   │                       │                            │
   ▼                       ▼                            ▼
Pin drops    →   Pin draggable + chip   →   Tap "Write" in chip   →  Sheet open + pin
 on map           "📍 Locating… · Write · ✕"                            still draggable
                       │                                                      │
                       └── ✕ cancels ────────────────────────────────────────┘
```

## Three trigger gestures

All three drop a draft pin and enter the draft phase. Downstream behavior is identical.

| Gesture | Pin lands at |
|---|---|
| **Tap `+`** (FAB) | User's GPS coordinate if previously granted; otherwise the center of the visible map viewport |
| **Press-and-drag from `+`** | Wherever the user releases their finger/cursor on the map |
| **Double-tap empty map** | The double-tap coordinate (averaged from the two contacts, as today) |

The `+` FAB therefore supports two gestures: a regular tap (Gesture A) and a press-and-drag (Gesture B). Distinguishing them follows the same pattern as the native draggable draft pin shipped today: a short hold-time threshold disambiguates "tap" from "drag-arm".

## Pin behavior

- The existing `DraftPin` component renders as the visual marker (no design change).
- The pin is draggable throughout the entire flow — both during the draft phase (before Write) and the compose phase (after Write).
  - Web: free drag on mouse/touch via `react-map-gl` `Marker draggable`.
  - Native: long-press-then-drag via `PanResponder` (already shipped).
- The pin is anchored to its lat/lng. Pan/zoom moves the map underneath; the pin appears to stay glued to that geographic point.

## Floating confirm chip

Renders during the draft phase, positioned near the pin.

### Layout

```
┌─────────────────────────────────────────────┐
│  📍 Malolos, Bulacan   Write   ✕           │
└─────────────────────────────────────────────┘
```

- **Left segment** — the resolved location label, fetched via `src/lib/reverseGeocode.ts`. Shows "Locating…" while the request is in flight. Re-resolves on every pin drag-end.
- **Middle segment** — `Write` action. Tapping commits and transitions to the compose phase.
- **Right segment** — `✕` cancel. Tapping clears the draft pin and exits the draft phase.

### Positioning

- Default: anchored above the pin with a small vertical offset.
- Flip below the pin when the pin is within ~80px of the top edge of the screen (so the chip doesn't render off-screen).
- Stays visually attached during pin drag — re-positions on every drag tick.

### Loading + error states

- During reverseGeocode: chip shows `📍 Locating…` with the action buttons still active. Tapping Write before resolution succeeds is allowed; the location label populates later from the same hook.
- On reverseGeocode failure: chip shows `📍 Dropped pin` (generic fallback). Tapping Write still works; the ComposeSheet handles label resolution independently.

## ComposeSheet integration (compose phase)

- The ComposeSheet opens at the same partial height as today, leaving the pin visible above.
- The pin remains rendered and draggable. Dragging the pin while the sheet is open updates the location label inside the sheet — this is the existing behavior, intentionally preserved.
- The chip is hidden once the sheet opens (the sheet's own location field replaces it).
- Closing the sheet without posting drops the user back to the map with no draft pin (full cancel).

## Cancellation rules

| Action | Effect |
|---|---|
| Tap `✕` in chip | Full cancel — pin disappears, no compose, no entry in any history |
| Pan or zoom the map | No cancel — pin stays anchored at its lat/lng |
| Tap somewhere on the map (not the pin, not the chip) | No cancel — avoids accidental loss while pinching/panning on mobile |
| Drop a new draft pin via any trigger while one is already live | Replace — the previous draft pin is discarded, new one takes its place |
| Close ComposeSheet after Write was tapped | Same as today (Cancel). Pin disappears. |

## State model

A new `draftPhase` state in `app/index.tsx` describes which step of the flow is active.

```ts
type DraftPhase =
  | { kind: 'idle' }
  | { kind: 'placing'; coords: { lat: number; lng: number } } // chip showing
  | { kind: 'composing'; coords: { lat: number; lng: number } }; // sheet open, pin still draggable
```

Transitions:

- `idle → placing` — any of the three triggers fire
- `placing → composing` — user taps Write in the chip
- `placing → idle` — user taps ✕ in the chip
- `composing → idle` — user posts successfully OR closes the sheet
- Drag the pin in any non-idle phase: `coords` updates; phase otherwise unchanged

The existing `composeOpen` + `composeCoords` pair is replaced by deriving the boolean and coords from `draftPhase.kind === 'composing'`.

## File map

| File | Change |
|---|---|
| `app/index.tsx` | Replace `composeOpen`/`composeCoords` with the `draftPhase` state machine. Re-wire the `+` FAB to support tap and press-and-drag. Wire double-tap to drop a pin into `placing` (not `composing`). Render `<DraftConfirmChip>` when `placing`. |
| `src/compose/DraftConfirmChip.tsx` | **New.** Renders the chip near the pin, calls `reverseGeocode`, exposes `onWrite` and `onCancel`. Handles edge-flip positioning. |
| `src/compose/DraftConfirmChip.web.tsx` | **New if needed.** Web-specific positioning if the native vs web Marker anchoring differs. |
| `src/map/MapView.web.tsx` | No change to the gesture detector itself — but the parent's `onDoubleClick` callback now drops a draft pin instead of opening compose directly. |
| `src/map/MapView.tsx` | Same — parent's callback semantics change, MapView's interface is unchanged. |
| `src/compose/DraftPinMarker.tsx` / `.web.tsx` | No change. Already draggable. |
| `src/lib/reverseGeocode.ts` | No change. |

## Test coverage

| Test | Layer |
|---|---|
| `app/index.tsx` — tap `+` with location previously granted → `placing` phase, coords from GPS | Integration (mock Location module) |
| `app/index.tsx` — tap `+` with no location permission → `placing` phase, coords from viewport center | Integration |
| `app/index.tsx` — double-tap map → `placing` phase, coords from tap location | Integration |
| `app/index.tsx` — chip Write button → transitions `placing → composing` | Integration |
| `app/index.tsx` — chip ✕ button → transitions `placing → idle`, pin gone | Integration |
| `DraftConfirmChip` — renders "Locating…" while reverseGeocode pending, then label | Unit |
| `DraftConfirmChip` — renders fallback label on reverseGeocode error | Unit |
| `DraftConfirmChip` — Write button calls `onWrite`; ✕ calls `onCancel` | Unit |
| Replace draft pin while one is already live → previous coords discarded | Integration |

Native-only behaviors (long-press-drag from FAB) are exercised via the existing native test patterns; the chip's positioning logic is platform-agnostic and tested via the unit tests above.

## Out of scope

- **Drag-from-FAB on web with mouse hover preview** — i.e., showing a ghost pin trailing the cursor before the user clicks down. Possibly a future polish; not required for v1.
- **Snap-to-road or place-of-interest snapping** during pin drag. Stays purely lat/lng-based for now.
- **Undo after posting.** Cancel only applies before submit.
- **Multi-pin compose** — only one draft pin live at a time. Dropping another replaces it.

## Risks and edge cases

- **Reverse geocode rate limits.** The chip re-fetches on every drag-end. If a user drags rapidly, multiple in-flight requests may pile up. Mitigation: debounce drag-end → reverseGeocode call by 250ms, abort previous in-flight request.
- **Press-and-drag from FAB conflicting with the FAB's PressableScale animation.** The FAB shrinks on press today (`scaleAmount={0.92}`). Long-press before drag-arm could feel sluggish. Mitigation: shorten the press-to-drag-arm threshold on the FAB (e.g. 200ms vs the 400ms used by the native draft pin).
- **Web double-tap zoom.** MapLibre web defaults to double-tap-zoom; the existing code already disables that when `onDoubleClick` is provided. Behavior is unchanged.
- **Map pan during chip-visible state.** The chip must reposition smoothly as the map moves the pin's screen coordinate. If repositioning lags, the chip will visibly "snap" to catch up. Mitigation: track the pin's screen position via `map.project(lngLat)` on every map move event, not just on drag.
