# User Handles Implementation Design

## Goal

Allow anonymous sulat users to claim a permanent `display_handle` — a unique, readable name that appears on their replies and their own sulat feed inside a new Profile modal. The Profile modal also serves as the seed for a future personal journal feature where users can revisit their sulats geographically.

## Architecture

### Data Model

No new tables. Two constraints added to the existing `users` table:

```sql
alter table public.users
  add constraint users_display_handle_unique unique (display_handle),
  add constraint users_display_handle_format
    check (display_handle ~ '^[a-zA-Z0-9_]{3,20}$');
```

**Handle rules:**
- Characters: letters, numbers, underscores only (`a-z`, `A-Z`, `0-9`, `_`)
- Length: 3–20 characters
- Uniqueness: enforced at DB level (race-condition-proof)
- Permanence: once set, cannot be changed — no update path after initial claim

**Claiming mechanism:** Direct Supabase client update — `supabase.from('users').update({ display_handle })`. The existing `users_self_update` RLS policy already permits this. No edge function needed.

**Error mapping:**
- Postgres `23505` (unique_violation) → "that handle is already taken"
- Postgres `23514` (check_violation) → "3–20 chars, letters, numbers, and underscores only" (safety net — client validates format before submit)

### Unread Reply Tracking

Stored in AsyncStorage. Key: `reply_seen_${storyId}`, value: the `reply_count` integer the user last saw when they opened the reply thread.

- `isUnread(storyId, currentCount)` → `true` if `currentCount > seenCount` (or no entry)
- `markSeen(storyId, count)` → writes current count to AsyncStorage

Called from `StorySheet` when `threadOpen` flips to `true`. Because only the user's own stories appear in the profile feed, the badge only ever shows on authored sulats.

### Components

| Unit | Path | Purpose |
|------|------|---------|
| Hook | `src/profile/useMyStories.ts` | Fetches stories where `author_id = auth.uid()`, `created_at DESC`. SELECT must include `replies(count)` join (same pattern as `useStories`) to derive `reply_count` — it is not a real column. |
| Hook | `src/profile/useUnreadReplies.ts` | AsyncStorage read/write for unread reply counts |
| Component | `src/profile/HandleClaim.tsx` | Text input + confirm button; client-side format validation; maps DB errors to friendly messages |
| Component | `src/profile/MySulatRow.tsx` | One row: body (2 lines) · location · date · reaction count · unread reply dot |
| Component | `src/profile/ProfileModal.tsx` | Sheet card (position absolute, same pattern as other sheets). Top: handle section. Below: scrollable sulat feed. |

**Modified files:**

| File | Change |
|------|--------|
| `supabase/migrations/20260427000001_handle_constraints.sql` | Unique + format constraints on `display_handle` |
| `app/index.tsx` | Profile button in `headerRight`; `profileOpen` state; `ProfileModal` above nav; `onNavigate` closes modal + sets `flyTarget` |
| `src/story/StorySheet.tsx` | Calls `markSeen(story.id, replyCount)` when `threadOpen` flips to `true` |

## Data Flow

```
App loads
  └─ useUser() → current anon user (id, display_handle)

User taps profile button (header, next to ⚙)
  └─ profileOpen = true
       └─ ProfileModal mounts
            └─ useMyStories() → SELECT id, body, location_label,
                                        created_at, reaction_count,
                                        replies(count)          ← derived reply_count
                                 WHERE author_id = auth.uid()
                                 ORDER BY created_at DESC
            └─ useUnreadReplies() reads AsyncStorage
            ├─ display_handle null → HandleClaim form
            └─ display_handle set  → read-only handle + sulat feed

User claims handle
  └─ client validates: regex '^[a-zA-Z0-9_]{3,20}$'
  └─ supabase.from('users').update({ display_handle })
       ├─ success  → handle stored; UI flips to read-only
       ├─ 23505    → "that handle is already taken"
       └─ 23514    → "3–20 chars, letters/numbers/underscores only"

User taps sulat row in feed
  └─ ProfileModal closes
  └─ setFlyTarget({ lat, lng, zoom: 14 })
  └─ map flies to pin

User opens ReplyThread on their own story
  └─ markSeen(story.id, replyCount) → AsyncStorage updated
  └─ next ProfileModal open: isUnread = false → badge gone
```

## UX States

| State | What the user sees |
|-------|-------------------|
| No handle | Input field + "Claim your handle" button |
| Submitting | Button spinner, input disabled |
| Handle taken | Red hint: "that handle is already taken" — draft preserved |
| Handle claimed | Handle shown read-only with `🔒` — no edit affordance |
| Feed loading | Spinner in place of list |
| Feed empty | "you haven't posted any sulats yet" |
| Feed with sulats | Scrollable `MySulatRow` list |
| Unread replies | Gold `●` dot on that sulat row |
| Tap sulat row | Modal closes, map flies to pin |

## Profile Button Placement

Sits in the existing `headerRight` row in `app/index.tsx` — to the left of the ⚙ settings button. Same rounded surface style (`36×36`, `borderRadius: 20`, `theme.surface` background). Glyph: `◉`.

## Forward Compatibility

- **Replies:** `display_handle ?? 'anon'` resolution already in place in `ReplyBubble` — no changes needed when a handle is claimed, all past replies automatically show the new name.
- **Personal journal (future):** `MySulatRow` + `useMyStories` are the foundation. Future plans can add map thumbnail per sulat, filtering by mood, date range navigation, or a full-screen journal view.
- **Email linking (Plan 4):** Supabase preserves the anonymous user UUID when an account links an email. The `display_handle` on the `users` row remains intact.

## What This Is Not

- No handle editing after claim
- No handle search or discovery (handles are display-only, not profile pages)
- No push notifications for new replies
- No full journal view (feed is a preview — tap to navigate to map)
