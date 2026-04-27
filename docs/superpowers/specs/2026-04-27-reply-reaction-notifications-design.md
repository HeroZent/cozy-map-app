# Reply & Reaction Notification Delivery Design

## Goal

Notify story authors when someone replies to or reacts to their sulat. Deliver awareness via a brief app-open summary banner and a persistent profile button badge. Mark notifications read when the author opens their profile.

## Architecture

**Three layers:**
1. **Delivery** — `post-reply` and `react-story` edge functions insert `new_reply` / `new_reaction` rows (service-role, fire-and-forget, same pattern as audit log)
2. **Client hook** — `useNotifications` gains two new derived values: `activityCount` and `activityNotificationIds`
3. **UI** — `ActivityBanner` (top, auto-dismiss, informational only) + badge dot on the ◉ profile button (clears when ProfileModal opens)

## Tech Stack

Supabase Edge Functions (Deno), Supabase JS v2, React Native Web, Expo Router

---

## Section 1 — Delivery

### `post-reply` changes

After the reply row is successfully inserted, look up the story's `author_id`. If the replier is not the author, insert a `new_reply` notification using a service-role client (non-blocking — a failed notification never blocks the reply response).

```typescript
// After successful reply insert — append to post-reply/index.ts
const serviceSupa = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const { data: storyRow } = await serviceSupa
  .from('stories')
  .select('author_id')
  .eq('id', payload.story_id)
  .single();

if (storyRow && storyRow.author_id !== authUser.user.id) {
  await serviceSupa.from('notifications').insert({
    user_id: storyRow.author_id,
    type: 'new_reply',
    story_id: payload.story_id,
    payload: {},
  });
}
// errors are logged and ignored — reply is already live
```

Note: `post-reply` already creates a `serviceSupa` client for the audit log — reuse that instance rather than creating a second one.

### `react-story` changes

After a reaction is **added** (not removed), look up the story's `author_id`. If the reactor is not the author, insert a `new_reaction` notification. Include the emoji in the payload for future UI use.

```typescript
// Only on action === 'added'
if (action === 'added') {
  const { data: storyRow } = await serviceSupa
    .from('stories')
    .select('author_id')
    .eq('id', payload.story_id)
    .single();

  if (storyRow && storyRow.author_id !== authUser.user.id) {
    await serviceSupa.from('notifications').insert({
      user_id: storyRow.author_id,
      type: 'new_reaction',
      story_id: payload.story_id,
      payload: { emoji: payload.emoji },
    });
  }
}
```

`react-story` currently uses only the anon-key client — add a service-role client creation (same pattern as `post-reply`'s audit log client).

### Non-self-notification rule

Both functions skip the notification insert if `author_id === authUser.user.id`. No notification for reacting to or replying to your own sulat.

### Error handling

Both inserts are fire-and-forget. Errors are `console.error`'d but do not affect the response to the caller. The reply/reaction is already committed.

---

## Section 2 — `useNotifications` Hook Updates

Add two derived values to `UseNotificationsResult`:

```typescript
interface UseNotificationsResult {
  notifications: Notification[];
  memoryCount: number;           // existing
  activityCount: number;         // NEW — count of unread new_reply + new_reaction
  activityNotificationIds: string[];  // NEW — their IDs, ready for markRead
  markRead: (ids: string[]) => Promise<void>;
  loading: boolean;
}
```

Computed in the same place as `memoryCount`:

```typescript
const activityNotifs = notifications.filter(
  (n) => n.type === 'new_reply' || n.type === 'new_reaction',
);
const activityCount = activityNotifs.length;
const activityNotificationIds = activityNotifs.map((n) => n.id);
```

No new fetching — derived from the existing `notifications` array already fetched on mount.

---

## Section 3 — UI

### ActivityBanner (`src/notifications/ActivityBanner.tsx`)

Shown at the **top** of the screen (just below the floating header) on app load when `activityCount > 0`.

- Position: `absolute`, `top: HEADER_BOTTOM` (below the header — approximately `top: 100`), full width
- Text:
  - Both: `"💬 3 new replies · 2 reactions"`
  - Replies only: `"💬 2 new replies"`
  - Reactions only: `"💬 1 new reaction"`
  - Counts pluralise correctly (`1 reply` / `2 replies`, `1 reaction` / `2 reactions`)
- **Auto-dismisses after 4 seconds** — no user interaction required
- Does NOT call `markRead` — informational only
- Renders `null` when `activityCount === 0` or after auto-dismiss

Props:
```typescript
interface ActivityBannerProps {
  activityCount: number;
  replyCount: number;       // derived from notifications for label construction
  reactionCount: number;    // derived from notifications for label construction
  topOffset?: number;
}
```

`replyCount` and `reactionCount` are computed in `app/index.tsx` from the `notifications` array and passed as props.

Auto-dismiss implementation: `useEffect` with `setTimeout(dismiss, 4000)` — clears on unmount.

### Profile button badge dot

In `app/index.tsx`, overlay a small `●` on the ◉ profile button when `activityCount > 0`:

```tsx
<Pressable
  onPress={() => { closeAllSheets(); setProfileOpen(true); }}
  style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
>
  <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
  {activityCount > 0 && (
    <Text style={[styles.profileBadge, { color: theme.accent }]}>●</Text>
  )}
</Pressable>
```

`profileBadge` style: `position: 'absolute'`, `top: -2`, `right: -2`, `fontSize: 8`

### markRead on ProfileModal open

In `app/index.tsx`, when `setProfileOpen(true)` is called, immediately call `markRead(activityNotificationIds)`:

```typescript
const openProfile = () => {
  closeAllSheets();
  if (activityNotificationIds.length > 0) {
    markRead(activityNotificationIds);
  }
  setProfileOpen(true);
};
```

Badge disappears optimistically (markRead already removes from local state immediately). `ProfileModal` itself requires no changes.

---

## Error Handling

- Notification delivery failures (edge functions): logged, non-blocking
- `useNotifications` fetch error: fails open — `activityCount` stays 0, no banner, no badge
- `ActivityBanner` auto-dismiss: cleanup via `useEffect` return to prevent state update on unmount
- `markRead` on profile open: optimistic, same pattern as MemoryBanner dismiss

---

## What This Spec Does NOT Cover

- Web push notifications (VAPID / service worker) — next spec
- Notification inbox / history UI — next spec
- Per-story activity breakdown inside ProfileModal — no row highlighting (by design)
- Notification deduplication (multiple reactions from different users = multiple rows) — acceptable for now
