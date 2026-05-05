# Mood filter — design spec

**Date:** 2026-05-06
**Scope:** web + native (per-device, no server changes)

## Why this is happening

Sulat's map currently shows every live story across all 8 moods (Regret, On my mind, Struggling, Hopeful, Memory, Dream, Unsent letter, Forgiveness). A reader who's only in the mood for one tone — say, only "Hopeful" or only "Memory" — has no way to narrow the map to those moods. The recently-shipped "Unread" filter showed there's appetite for client-side filtering. This adds mood as a second, composable filter dimension.

The feature is per-device and persisted via `kvGet/kvSet` (same pattern as the read/starred sets and the unread filter). No Supabase changes.

## Out of scope

- **Saved presets.** No "name this filter combo and save it" surface for v1. YAGNI.
- **Server-side filtering.** Filtering stays client-side; the existing `useStories` query is unchanged.
- **Mood combinations beyond simple multi-select.** No AND-of-moods + NOT-of-moods compound logic. Each mood is independently shown or hidden.
- **Inline mood-emoji preview on the chip.** The chip toggles between two visual states (off / on); the inline-emoji idea ("Moods 🌧️🌱✨") could be a follow-up but isn't required.
- **Cluster-level mood breakdowns.** Clusters re-aggregate naturally over the filtered set; we don't add a "show me the mood mix" overlay.
- **Animating the chip when moods are toggled.** The chip's active/inactive states cross-fade with the same plain transition used by the Unread chip.

## Architecture

Three new modules (one state hook with provider, one chip component, one sheet component). One existing module modified to consume the new state.

| Unit | Responsibility | File |
|---|---|---|
| `useMoodFilter` + `MoodFilterProvider` | Owns the singleton `selectedMoods: Set<Mood>` + `hydrating` + `toggle(mood)` + `reset()`. Persists via `kvGet/kvSet` under `sulat.filters.moods`. | `src/data/useMoodFilter.tsx` |
| `MoodFilterChip` | The lower-right pill chip that opens the sheet. Active state when fewer than 8 moods are selected. | `src/map/MoodFilterChip.tsx` |
| `MoodFilterSheet` | The bottom sheet UI with 8 mood rows + a reset button. Uses the existing `AnimatedSheet` pattern. | `src/map/MoodFilterSheet.tsx` |
| `app/_layout.tsx` | Wraps children in `<MoodFilterProvider>` (alongside the existing read/filter providers). | existing |
| `app/index.tsx` | ANDs the mood filter into `visibleStories`; renders `<MoodFilterChip />` next to the existing `<UnreadFilterChip />`; mounts `<MoodFilterSheet />`; ORs `moodHydrating` into `useLoaderGating`. | existing |

## Component-level boundaries

### `useMoodFilter` (provider + hook)

```ts
interface MoodFilterAPI {
  /** IDs of moods the user wants visible. Default: all 8. */
  selectedMoods: Set<Mood>;
  /** True from mount until persisted state has been read. */
  hydrating: boolean;
  /** Add or remove a single mood from the selection. Persists. */
  toggle: (mood: Mood) => Promise<void>;
  /** Re-select all 8 moods (filter off). Persists. */
  reset: () => Promise<void>;
}
```

State lives in a `Set<Mood>` React state. Provider hydrates once on mount: reads the JSON-encoded array from `sulat.filters.moods` and constructs the Set. Falls back to "all 8 selected" when the key is absent.

A `useRef` mirror is used to avoid stale-closure issues inside `toggle` (same pattern as the read/filter hooks).

### `MoodFilterChip`

```tsx
<MoodFilterChip onOpen={() => setMoodSheetOpen(true)} />
```

The chip itself doesn't manage open state — it fires `onOpen`. The parent (`app/index.tsx`) owns the open/closed boolean and renders `<MoodFilterSheet />` accordingly. This keeps the chip stateless.

Active state: chip border tints to `theme.accent` and label text becomes `theme.accent` when `selectedMoods.size < 8`. Otherwise muted (`theme.textMuted`), matching the Unread chip's pattern.

Label: just `"Moods"` always — no count or emoji preview in v1.

### `MoodFilterSheet`

```tsx
<MoodFilterSheet open={open} onClose={() => setOpen(false)} />
```

When `open` is true, the sheet animates up from the bottom. When false, it dismisses.

Sheet content:

- **Header:** `"Moods"` title + a subtle "Reset" link on the right (active only when at least one mood is unselected).
- **Body:** vertical list of 8 mood rows. Each row pulls from `MOODS` in `src/moods/catalog.ts` and renders: emoji (large) + name (16px) + description (13px muted) + checkbox/toggle on the right.
- **Behavior:** tap a row anywhere → calls `toggle(mood)`. Tap "Reset" → calls `reset()`. Tap outside the sheet (backdrop) → closes via `onClose`. The sheet itself stays open while moods are toggled — the user can adjust multiple moods before dismissing.

## Data flow for the filter

```
useMoodFilter returns: selectedMoods (Set<Mood>), hydrating
useStories returns:    stories[]
useReadStories returns: read, starred (existing)
useUnreadFilter returns: unreadOnly (existing)
useUser returns:       me (existing)

const visibleStories = useMemo(() => {
  const meId = me?.id;
  return stories.filter((s) => {
    // Mood filter (always applied — default-all-selected makes this a no-op when filter is off)
    if (!selectedMoods.has(s.mood as Mood)) return false;
    // Unread filter (existing)
    if (!unreadOnly) return true;
    return s.author_id === meId || starred.has(s.id) || !read.has(s.id);
  });
}, [stories, unreadOnly, selectedMoods, read, starred, me?.id]);
```

The mood filter is checked first because it's the cheaper short-circuit. Order isn't user-visible — all conditions must pass.

## Persistence

One key under `sulat.*`:

| Key | Value | Purpose |
|---|---|---|
| `sulat.filters.moods` | JSON array of mood IDs, e.g. `'["regret","hopeful","memory"]'` | Moods the user wants visible |

Absence of the key means "no preference" → default to all 8 selected.

Race condition note: same as the existing filters — overlapping toggles serialize their own snapshot of the Set; second write wins. Not a real concern given the sheet UX.

## Loader integration

`MoodFilterProvider`'s `hydrating` flag is OR'd into `app/index.tsx`'s existing `useLoaderGating` call:

```ts
const loaderGating = useLoaderGating(
  loading || readsHydrating || filterHydrating || moodHydrating
);
```

The cold-start lanterns-rising splash stays visible until all four signals settle. No flash of pre-filtered pins.

## Visual treatments

### Lower-right chip stack

Two chips stacked vertically inside the existing `unreadChipFloat` container, with an 8 px gap. Order top-to-bottom: `Moods` then `Unread`. (The Moods filter is the deeper-dive interaction; placing it on top mirrors typical "more options" stacking.)

```
┌─────────────┐
│ 🎚 Moods    │  ← new
├─────────────┤
│ ✉︎ Unread    │  ← existing
└─────────────┘
```

Both chips inherit the existing pill style (`borderRadius: 999`, frosted background `rgba(20, 26, 58, 0.85)`, 1 px border, `theme.accent` border when active).

### Sheet header

`"Moods"` left-aligned in `theme.textPrimary`, 18 px serif (matches existing sheet headers). "Reset" right-aligned in `theme.accent` 12 px when active, `theme.textFaint` when all moods are already selected (no-op state).

### Mood rows

Each row is a `PressableScale` with the entire row tappable:

```
[ 🌙 ]  Regret                    [✓]
        Things I wish I'd done differently
```

- Emoji: 28 px, 40×40 wrapper.
- Name: 16 px serif, `theme.textPrimary`.
- Description: 13 px sans, `theme.textMuted`, 1-line truncated if needed.
- Checkbox: a small filled-circle (active) / outlined-circle (inactive) on the right, 22 px, in `theme.accent` when active.

### Cluster aggregation

Clusters re-aggregate naturally over `visibleStories`. A cluster pin's count drops as moods are unchecked. If a cluster contains zero pins after filter → not rendered. No special UI.

## Edge cases

| Scenario | Behavior |
|---|---|
| User unchecks all 8 moods | Map shows zero pins. Sheet stays open. Tap "Reset" or any mood to re-show. |
| User taps "Reset" while all are already selected | No-op write. UI feedback: "Reset" label is dimmed/disabled (`theme.textFaint`) so the affordance signals "nothing to reset." |
| New mood added later (e.g. 9th mood) | Stored set has the original 8; the new mood isn't in the persisted set. Mitigation: when checking `selectedMoods.has(mood)`, treat the absence-of-any-key case (cold start) as "all selected" via a `hasUserOverride` flag on the provider — if the user has never toggled, every mood is allowed regardless of what's in the persisted set. Once the user toggles for the first time, only explicitly-selected moods are shown. (See "Defaulting" section below.) |
| Mood filter + Unread filter both active | Composed with AND in `visibleStories`. Author exemption + starred override are part of the Unread branch only — mood is checked first. |
| Cold start | Loader covers hydration. No flash. |
| Sheet open while user navigates | Sheet stays open. State persists. The user can navigate to another route via stack and the sheet still re-opens with the current selection on return (sheet open state is local to `app/index.tsx`; selection is in the provider). |
| User toggles a mood that's part of an open StorySheet's story | `StorySheet` is independent. Closing the sheet returns to the (now-filtered) map. The author of an open story still sees their own pin filtered out if its mood is unchecked — author exemption only applies to the Unread filter, not the Mood filter. (Stated explicitly to avoid surprise.) |

### Defaulting (concrete behavior)

The provider stores two pieces of state:

```ts
selectedMoods: Set<Mood>     // empty if no override yet
hasUserOverride: boolean     // false if user has never toggled
```

When checking `isMoodVisible(mood)`:

```ts
function isMoodVisible(mood: Mood): boolean {
  if (!hasUserOverride) return true;     // cold start: everything visible
  return selectedMoods.has(mood);
}
```

The provider exposes a derived computed Set:

```ts
selectedMoods = hasUserOverride ? userSelectedMoods : new Set(MOODS.map(m => m.id));
```

…so consumers can use `selectedMoods.has(mood)` uniformly without thinking about the override flag.

The override flag is set when the user first invokes `toggle()` or `reset()`. Persisted under `sulat.filters.moodsOverride` as `"true"` once set; absence means false. (One extra key, but it makes the new-mood case clean: if a 9th mood is added later, users who haven't overridden continue to see all 9 with no migration; users who have overridden will need to manually toggle the new mood — acceptable.)

## Testing

### Unit tests

- **`useMoodFilter`** — hydrates from kv on mount; default = all moods selected; `toggle(mood)` adds/removes from set + sets override flag; `reset()` re-selects all + sets override flag; persists round-trip; `selectedMoods.size` reflects the override-aware computed Set.

- **`MoodFilterChip`** — renders inactive (8 selected = no override OR all 8 selected explicitly); renders active when `< 8` selected; tap fires `onOpen`.

- **`MoodFilterSheet`** — renders 8 rows with correct emoji + name + description; tap row calls `toggle(mood)`; tap reset calls `reset()`; reset is dimmed when nothing to reset.

### Integration test

A test in `app/__tests__/` (or `tests/integration/`) that:

- Mocks the four hooks (`useStories`, `useReadStories`, `useUnreadFilter`, `useMoodFilter`, `useUser`) with controlled values.
- Renders a stripped-down version of the index route.
- Asserts: with all moods selected and no unread filter, all stories are passed to the map.
- Asserts: with one mood unselected, stories of that mood are filtered out.
- Asserts: with both filters active, the AND is correct.

### Visual verification (in-browser preview)

- Open `sulat.vercel.app`, tap the "Moods" chip → sheet opens with 8 rows.
- Toggle two moods off → close sheet → those mood pins disappear.
- Tap "Reset" inside sheet → all pins return.
- Toggle one mood off + activate Unread filter → only unread + non-toggled-off moods show.
- Cold-start with persisted state: pins should already be filtered when first paint lands (loader covered the hydration).

## Risks and mitigations

- **Override flag adds storage complexity.** Two keys (`sulat.filters.moods` + `sulat.filters.moodsOverride`) instead of one. Mitigation: the override flag avoids the worse alternative of "hidden new moods after a code update." Acceptable trade-off.
- **Sheet height on small mobile viewports.** 8 mood rows + header + reset = roughly 8 × 64 px + 56 px ≈ 568 px, which fits 360-wide × 780-tall designs (the spec target). On very short screens (e.g., landscape orientation) the body should scroll. Mitigation: wrap the row list in a `ScrollView` inside the sheet.
- **AnimatedSheet pattern compatibility.** The existing `AnimatedSheet` may not support multiple sheets stacked (StorySheet + MoodFilterSheet at once). Mitigation: the existing `closeAllSheets()` helper in `app/index.tsx` should also dismiss the mood sheet — wire it through. If multi-sheet stacking ever becomes an issue, fall back to closing other sheets when the mood sheet opens.

## Files-to-touch summary

**New:**

- `src/data/useMoodFilter.tsx`
- `src/data/__tests__/useMoodFilter.test.tsx`
- `src/map/MoodFilterChip.tsx`
- `src/map/__tests__/MoodFilterChip.test.tsx`
- `src/map/MoodFilterSheet.tsx`
- `src/map/__tests__/MoodFilterSheet.test.tsx`

**Modified:**

- `app/_layout.tsx` — wrap children in `<MoodFilterProvider>`
- `app/index.tsx` — render the chip + sheet, AND mood into `visibleStories`, OR `moodHydrating` into `useLoaderGating`, ensure `closeAllSheets` dismisses the mood sheet
