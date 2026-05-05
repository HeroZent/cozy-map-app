# Hide-read filter + starred sulat — design spec

**Date:** 2026-05-06
**Scope:** web + native (per-device, no server changes)

## Why this is happening

The map gets crowded as more sulat accumulate in popular areas (Manila / Cebu clusters already show 20+ per region). A reader who's already opened a sulat rarely needs to see its pin again — it's just visual noise. Adding an opt-in "Unread only" filter chip lets readers de-clutter the map to focus on what they haven't seen yet, while a star affordance lets them keep the few sulat they want to revisit always visible.

The feature mirrors the existing `useUnreadReplies` pattern — per-device AsyncStorage tracking, no server changes — so it fits the anonymous-first model without forcing user accounts.

## Out of scope

- **Cross-device sync.** Read/starred state is per-device. A user who reads a sulat on their phone will see it as unread on their desktop. This matches Sulat's anonymous-first identity model. Server-side per-user `read_at` tracking is deferred.
- **"Mark all as read" / "Mark unread" bulk actions.** YAGNI for v1. The filter toggle covers the "show all" need; if a user really wants to reset, they can clear browser localStorage.
- **A "Starred sulat" list view in Profile.** Could be a follow-up but isn't required for the core experience.
- **Visual treatment changes for pins beyond the star glyph and filter-out behavior.** No new pin colors, sizes, or animation states.
- **Edit-detection for stories.** If an author edits a sulat after a reader has marked it read, the read flag stays. Sulat doesn't currently support edits, so this isn't an active concern.

## Architecture

Three new modules in `src/data/` (state hooks) and `src/story/` / `src/map/` (UI). No changes to Supabase schema. The filter is a pure client-side `Array.filter` over the stories returned by the existing `useStories` hook.

| Unit | Responsibility | File |
|---|---|---|
| `useReadStories` | Manages `read` set + `starred` set; persists via `kvGet/kvSet`. Exposes `isRead(id)`, `markRead(id)`, `isStarred(id)`, `toggleStarred(id)`, plus the underlying `Set<string>` instances for filtering. | `src/data/useReadStories.ts` |
| `useUnreadFilter` | Owns the on/off boolean for the filter chip. Persists state. | `src/data/useUnreadFilter.ts` |
| `UnreadFilterChip` | Bottom-row toggle UI; consumes `useUnreadFilter`. | `src/map/UnreadFilterChip.tsx` |
| `StarToggle` | Small star icon inside `StorySheet`; consumes `useReadStories`. | `src/story/StarToggle.tsx` |

Existing files modified:

| File | Change |
|---|---|
| `app/index.tsx` | Hosts the new filter chip in the bottom row; filters the `stories` array before passing to map and clusters. |
| `src/story/StorySheet.tsx` | Calls `markRead(story.id)` on mount; renders `<StarToggle />` in the header. |
| `src/map/PinMarker.tsx` (or wherever pins render) | Renders a small ✦ star glyph overlay when `isStarred(story.id)` is true. |

## Component-level boundaries

### `useReadStories`

```ts
interface ReadStoriesAPI {
  read: Set<string>;
  starred: Set<string>;
  isRead: (id: string) => boolean;
  isStarred: (id: string) => boolean;
  markRead: (id: string) => Promise<void>;
  toggleStarred: (id: string) => Promise<void>;
}
```

State lives in two `Set<string>` React state pieces. On mount, the hook scans AsyncStorage for keys matching the `sulat.read.*` and `sulat.starred.*` namespaces and rehydrates the sets. Writes go through `kvSet` and update the in-memory set immediately (optimistic).

A pure-set return shape (rather than a `(id) => boolean` callback) lets the consumer build a memoized filter without re-creating it on every keystroke.

### `useUnreadFilter`

```ts
interface UnreadFilterAPI {
  unreadOnly: boolean;
  toggle: () => Promise<void>;
}
```

Single boolean piece of state, persisted under `sulat.filters.unreadOnly`. Defaults to `false` (filter off).

### `UnreadFilterChip`

Mirrors the existing "Near me" / "Lantern" chip styling. Active = amber-filled background; inactive = frosted glass.

```tsx
<UnreadFilterChip />
```

No props — it reads its state from `useUnreadFilter` directly.

### `StarToggle`

```tsx
<StarToggle storyId={story.id} />
```

Renders a small star glyph button. Filled when starred, outline when not. Tap calls `toggleStarred(storyId)`.

## Data flow for the filter

```
useStories returns: stories[]
useReadStories returns: read, starred sets
useUnreadFilter returns: unreadOnly
useUser returns: me (for author exemption)

const visibleStories = useMemo(
  () => unreadOnly
    ? stories.filter(s =>
        s.author_id === me?.id ||
        starred.has(s.id) ||
        !read.has(s.id)
      )
    : stories,
  [stories, unreadOnly, read, starred, me?.id]
);
```

`visibleStories` is the array passed to the map and to clusters. Clusters re-aggregate naturally because they're given the filtered set.

## Read-marking trigger

`StorySheet` calls `markRead(story.id)` in a `useEffect(() => { markRead(story.id); }, [story.id])` on mount. Subsequent re-renders for the same story don't re-call (stable id). The async write to AsyncStorage doesn't block render.

## Persistence

AsyncStorage keys, all under the existing `sulat.*` namespace:

| Key | Value | Purpose |
|---|---|---|
| `sulat.read.<storyId>` | `"1"` | Story has been opened by this device |
| `sulat.starred.<storyId>` | `"1"` | Story is starred for this device |
| `sulat.filters.unreadOnly` | `"true"` or `"false"` | Filter chip state |

Absence of a `sulat.read.*` key means unread. Absence of a `sulat.starred.*` key means not starred. Storing `"1"` (rather than `"true"`) keeps the value short — a heavy reader could accumulate thousands of read keys.

The hook hydrates by scanning all AsyncStorage keys once on mount via `AsyncStorage.getAllKeys()` filtered to the two prefixes. This is O(total-key-count) but happens once per app load and the `getAllKeys` call is fast even at thousands of keys.

## Visual treatments

### Filter chip (bottom row)

Same shape and frosted-glass treatment as "Near me" / "Lantern." Label: `"Unread only"`. Icon: a tiny mail/envelope or eye-slash glyph (final pick during implementation; spec leaves the exact icon flexible).

When ON: chip background fills with `theme.accentDim`, text in `theme.accent` — matches the active state of the existing chips.

When OFF: chip stays frosted-glass with muted text.

### Starred pin overlay

A small ✦ glyph (consistent with the memory-pin `decoration: '✦'` from `lanternGlow.theme`). Position: top-right of the pin. Color: `theme.accentSoft`. Size: ~40% of the pin diameter. Render only when `starred.has(story.id) === true`.

### Star toggle inside `StorySheet`

Position: top-right of the sheet header, near the close button. Filled state: solid amber star. Empty state: outline only. Tap area: 44×44 minimum (touch target).

## Edge cases

| Scenario | Behavior |
|---|---|
| User stars a story they haven't read | Allowed. `starred` is independent of `read`. |
| Story is deleted (Supabase row gone) | Orphan `sulat.read.<id>` / `sulat.starred.<id>` keys remain. Harmless — they just sit unused. No cleanup pass in v1. |
| New sulat posted after the user enabled the filter | Auto-shows (unread by default). |
| Cluster contains only read pins (filter on) | Cluster has zero pins after filter → not rendered. |
| User's own sulat | Always visible regardless of filter or read state (`s.author_id === me?.id` exemption). Star/unstar still works on them but doesn't affect visibility. |
| User toggles filter off after marking many sulat read | All pins reappear instantly. The `read` set is preserved — toggling back on hides them again. |
| AsyncStorage write fails (quota / private-mode) | The in-memory set was already updated optimistically, so the UI behaves correctly for this session. On next reload, the unwritten state is lost. Acceptable. Surface no error to the user. |
| `markRead` called while `read` set already contains the id | No-op (set semantics). |

## Testing

### Unit tests

- **`useReadStories`**
  - On mount, hydrates `read` and `starred` sets from existing AsyncStorage keys.
  - `markRead(id)` adds id to `read` set and writes the key.
  - `markRead(id)` is idempotent (calling twice doesn't cause an extra write).
  - `toggleStarred(id)` adds and removes the id (round-trip).
  - `isRead(id)` and `isStarred(id)` return the correct booleans.

- **`useUnreadFilter`**
  - Defaults to `false` when no persisted state.
  - Hydrates from `sulat.filters.unreadOnly === "true"`.
  - `toggle()` flips state and persists.

- **`UnreadFilterChip`**
  - Renders chip with correct active/inactive styling based on `useUnreadFilter` state.
  - Tap fires `toggle()`.

- **`StarToggle`**
  - Renders filled state when story is starred.
  - Renders outline state when not.
  - Tap fires `toggleStarred(storyId)`.

### Integration test

A test in `app/__tests__/` (or `tests/integration/`) that:

- Mocks `useStories`, `useReadStories`, `useUnreadFilter`, `useUser` with controlled values.
- Renders a stripped-down version of the index route with the filter chip + a virtual map list.
- Asserts: when `unreadOnly=true`, only unread+starred+own stories are passed to the map.
- Asserts: tapping the chip flips the filter and the visible-stories list updates.

### Visual verification (in-browser preview)

- Open `sulat.vercel.app`, observe the new chip in the bottom row.
- Open a sulat (StorySheet shows). Close it. Toggle filter ON. The pin for that sulat should disappear.
- Star a sulat in StorySheet. Toggle filter ON. Pin should still show with a ✦ overlay.
- Toggle filter OFF. All pins reappear.

## Risks and mitigations

- **`AsyncStorage.getAllKeys()` performance at scale.** A user who reads 10,000 sulat over a year would have 10k keys with the `sulat.read.` prefix. `getAllKeys` is fast (~10ms for 10k keys on web; native is comparable). Mitigation: not needed for v1; if it becomes an issue, switch to a single JSON-encoded set under `sulat.read` (one key holding an array).
- **Initial hydration delay.** While `useReadStories` is loading on cold start, the filter would briefly show all stories. Mitigation: the filter chip itself stays in sync (`useUnreadFilter` resolves quickly); read/starred sets resolve within ~50ms. Acceptable flicker for v1.
- **Filter chip + author exemption together.** A user who has authored many sulat will see "Unread only" still showing many pins (their own). This is intended — they wrote those, they're not "noise." Surface no warning.
- **`markRead` race with `StorySheet` close-then-reopen.** Set semantics make this a no-op.

## Files-to-touch summary

**New:**

- `src/data/useReadStories.ts`
- `src/data/__tests__/useReadStories.test.ts`
- `src/data/useUnreadFilter.ts`
- `src/data/__tests__/useUnreadFilter.test.ts`
- `src/map/UnreadFilterChip.tsx`
- `src/map/__tests__/UnreadFilterChip.test.tsx`
- `src/story/StarToggle.tsx`
- `src/story/__tests__/StarToggle.test.tsx`
- `tests/integration/hideReadFilter.test.tsx`

**Modified:**

- `app/index.tsx` — filter the stories array; render the new chip
- `src/story/StorySheet.tsx` — call `markRead` on mount; render `<StarToggle />`
- `src/map/PinMarker.tsx` — overlay ✦ when starred

Native pass not required — same behavior on web and native (AsyncStorage works on both, no platform-gated code).
