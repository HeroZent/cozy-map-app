# Notification Inbox Design

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

Add a notification inbox to the map screen so users can see and dismiss activity on their sulats (replies, reactions, memory promotions). A dedicated bell icon lives beside the profile button on the map; tapping it opens a bottom sheet listing all notifications. Opening the sheet immediately marks everything as read and clears the badge.

---

## Decision Log

| Question | Choice | Rationale |
|---|---|---|
| Where does the inbox live? | Separate bell sheet (Option A) | Keeps profile and notifications cleanly separated; dedicated entry point |
| Row detail level | Excerpt + location + time (Option C) | Users need enough context to recall which sulat triggered the notification without tapping |
| Mark-read behaviour | Mark all on open (Option B) | Simpler UX — the act of opening the inbox signals intent to clear; no per-item state to manage |

---

## Units

### 1. `NotificationRow` — `src/notifications/NotificationRow.tsx`

A single notification row. Stateless — receives all data as props.

**Props:**
```typescript
interface NotificationRowProps {
  notification: Notification;          // from useNotifications
  isUnread: boolean;                   // true until markRead fires
  onPress: () => void;                 // close sheet + fly map
}
```

**Visual spec:**
- **Icon:** 💬 for `new_reply`; ✦ for `new_reaction` and `memory_promoted`
- **Label:** "Someone replied to your sulat" / "Someone reacted with heart" / "Your sulat became a memory"
- **Excerpt:** first ~40 chars of `story_body`, italic, dimmed
- **Location + post date:** `📍 {story_location_label} · {relative date of sulat}`, small, gold-tinted
- **Timestamp:** relative time of the notification itself, aligned right on the label row
- **Unread indicator:** 4 px gold left-border on the row background (`#f4c97a`); fades away once read
- **Read state:** row background drops to `theme.surface` (same as sheet background), all text at reduced opacity (~0.45)
- `testID="notification-row-{id}"`

**Behaviour:**
- Entire row is a `Pressable`; `onPress` calls the provided handler
- `accessibilityRole="button"`, `accessibilityLabel` derived from label text

---

### 2. `NotificationSheet` — `src/notifications/NotificationSheet.tsx`

The bottom sheet container. Follows the same `AnimatedSheet` pattern as `ProfileModal`.

**Props:**
```typescript
interface NotificationSheetProps {
  onClose: () => void;
  onNavigate: (lat: number, lng: number) => void;
  bottomOffset?: number;
}
```

**Behaviour:**
- Uses the snapshot pattern (see Data Contract section): on first load, snapshots the notifications list and calls `markRead` for all IDs. Rows are rendered from the snapshot, not the live array.
- `isUnread={true}` for every row in the snapshot (all were unread when the sheet opened)
- Loading state: `ActivityIndicator` while `loading` is true and snapshot is empty
- Empty state: centred text *"nothing new yet"* in `theme.textMuted` (shown when snapshot is empty after load)
- Shows last 20 notifications (limit enforced by `useNotifications` hook query)
- Row tap: calls `onClose()` then `onNavigate(story.lat, story.lng)` — guard against `stories === null` (deleted story): skip navigation if null, just close
- Error handling: if `markRead` throws, log and swallow — badge re-appears next open, acceptable

**Structure:**
```
AnimatedSheet
  Header ("notifications" title + close ✕)
  ScrollView
    NotificationRow × N   ← all rows rendered; each passes isUnread={true}
  [empty state | loading]
```

**Note:** `DeleteConfirmSheet` pattern (outside ScrollView) is not needed here — no overlay confirmation required.

---

### 3. Bell button — `app/index.tsx`

The map screen (`app/index.tsx`) already calls `useNotifications()` and uses `activityCount`, `memoryCount`, and `markRead`. A new bell button is added to the existing `headerRight` group alongside the profile and settings buttons.

**Badge:** gold dot (8 px, `#f4c97a`) visible when `activityCount + memoryCount > 0`. Same dot style as the profile button's existing badge.

**Placement:** between the existing profile button (◉) and settings button (⚙) in the top-right header.

**State:** add `notifSheetOpen: boolean` state. Bell tap → `closeAllSheets()` then `setNotifSheetOpen(true)`. `onClose` → `setNotifSheetOpen(false)`.

**Remove** the `markRead(activityNotificationIds)` call from `openProfile` — the bell sheet is now the canonical place to clear notifications. The profile button badge dot (currently tied to `activityCount`) should remain as a visual cue pointing users to the bell.

**Existing banners stay:** `ActivityBanner` and `MemoryBanner` remain as real-time toasts. The bell sheet is the persistent inbox; the banners are ephemeral alerts. They coexist.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/data/useNotifications.ts` | Modify | Add stories JOIN to SELECT; update `Notification` type with `stories` field |
| `src/data/__tests__/useNotifications.test.tsx` | Modify | Add test for stories join shape |
| `src/notifications/NotificationRow.tsx` | Create | Single notification row, all visual variants |
| `src/notifications/NotificationSheet.tsx` | Create | Sheet container, snapshot pattern, mark-read, empty/loading states |
| `src/notifications/__tests__/NotificationRow.test.tsx` | Create | Unit tests for row variants and tap |
| `src/notifications/__tests__/NotificationSheet.test.tsx` | Create | Integration tests for mount behaviour, empty state, navigation |
| `app/index.tsx` | Modify | Add bell button, badge, `notifSheetOpen` state, `NotificationSheet` render; remove `markRead` from `openProfile` |

`useNotifications` is called inside `NotificationSheet` (same pattern as `useMyStories` inside `ProfileModal`) — no prop drilling.

---

## Data Contract

### `useNotifications` — extended in this feature

The existing hook at `src/data/useNotifications.ts` returns `Notification` with only `id, type, story_id, payload, created_at`. The `payload` field is always `{}` (edge functions insert empty payload). This feature extends the hook to JOIN stories so rows can show the excerpt and location.

**Change to `useNotifications`:** extend the `SELECT` to join the stories table:

```typescript
const SELECT = `
  id, type, story_id, payload, created_at,
  stories ( body, location_label, lat, lng )
`;
```

**Updated `Notification` type:**

```typescript
export interface Notification {
  id: string;
  type: 'memory_promoted' | 'new_reply' | 'new_reaction';
  story_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  // Joined from stories (null if story was deleted):
  stories: {
    body: string;
    location_label: string | null;
    lat: number;
    lng: number;
  } | null;
}
```

**No change** to `UseNotificationsResult` — `memoryCount`, `activityCount`, `activityNotificationIds`, `markRead`, `loading` remain identical.

The bell badge uses `activityCount + memoryCount`. The map screen imports `useNotifications` only for the badge count; `NotificationSheet` calls its own instance for the list + `markRead`.

### Snapshot pattern in `NotificationSheet`

`markRead` is optimistic — it removes IDs from the hook's `notifications` array immediately. If `NotificationSheet` renders from the live array, rows would vanish the moment `markRead` fires. Instead, the sheet **snapshots** the list once on load and displays the snapshot throughout its lifetime:

```typescript
const { notifications, activityNotificationIds, markRead, loading } = useNotifications();
const [snapshot, setSnapshot] = useState<Notification[]>([]);
const markedRef = useRef(false);

useEffect(() => {
  if (loading || markedRef.current) return;
  markedRef.current = true;
  setSnapshot(notifications);
  const memoryIds = notifications
    .filter((n) => n.type === 'memory_promoted')
    .map((n) => n.id);
  markRead([...activityNotificationIds, ...memoryIds]);
}, [loading]);
```

- Rows are rendered from `snapshot`, not `notifications`
- All rows in the snapshot were unread when the sheet opened → `isUnread={true}` for every row
- `markRead` clears the badge and DB state in the background
- Next time the sheet opens, `notifications` contains only new unread ones

---

## Error Handling

- `markRead` failure: log to console, swallow — non-critical, badge re-appears next session open
- `loading` true: show `ActivityIndicator` centred in sheet
- No explicit error UI for notification fetch failures — empty state is shown instead

---

## Testing

### `NotificationRow`
- Renders 💬 icon for `new_reply`
- Renders ✦ icon for `new_reaction`
- Renders ✦ icon for `memory_promoted`
- Shows gold left-border when `isUnread=true`
- No gold border when `isUnread=false`
- Calls `onPress` when pressed
- Excerpt truncated to ~40 chars

### `NotificationSheet`
- Calls `markRead` on mount with all notification IDs (activity + memory)
- Shows `ActivityIndicator` while loading
- Shows empty state when snapshot is empty after loading
- Renders a row per notification in the snapshot
- Tapping a row calls `onClose` and `onNavigate` with correct lat/lng
- Tapping a row whose `stories` is null calls `onClose` but does NOT call `onNavigate`

---

## Out of Scope

- Pagination beyond last 20 notifications
- Per-notification dismiss / swipe-to-delete
- Push notification deep-linking (separate feature)
- Notification preferences / mute
