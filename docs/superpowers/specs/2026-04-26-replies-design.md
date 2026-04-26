# Replies Implementation Design

## Goal

Allow anonymous users to reply to stories on the map. Replies are flat (one level deep), expand inline inside the StorySheet on tap, and display the author's `display_handle` if claimed — falling back to "anon". Designed to be forward-compatible with email account linking and Google Play purchase validation.

## Architecture

### Data Model

New table: `replies`

| column | type | notes |
|--------|------|-------|
| `id` | uuid PK | gen_random_uuid() |
| `story_id` | uuid FK → stories.id | ON DELETE CASCADE |
| `author_id` | uuid FK → auth.users.id | |
| `body` | text | 1–300 chars, trimmed |
| `status` | enum `reply_status` (`live`, `flagged`) | default `live` |
| `created_at` | timestamptz | default now() |

RLS policies:
- **SELECT**: authenticated users can read replies where `status = 'live'`
- **INSERT**: denied to all clients — only the `post-reply` edge function (service role) may insert
- **UPDATE/DELETE**: denied to all clients

Migration also:
- Creates `reply_status` enum (`live`, `flagged`)
- Adds index on `(story_id, created_at)` for thread fetch performance

### Story reply_count

`useStories` SELECT gains `replies(count)` PostgREST join so `reply_count` is available in the collapsed StorySheet footer without loading reply bodies. `toStory()` extracts this as `reply_count: number`. The `Story` type gains `reply_count: number`.

### Components

| unit | path | purpose |
|------|------|---------|
| Edge function | `supabase/functions/post-reply/index.ts` | Validates + inserts reply |
| Hook | `src/replies/useReplies.ts` | Lazy-fetches replies for a story |
| Hook | `src/replies/usePostReply.ts` | Calls post-reply edge function |
| Component | `src/replies/ReplyThread.tsx` | Scrollable list of reply bubbles |
| Component | `src/replies/ReplyInput.tsx` | Text input + send button (300 char limit) |
| Component | `src/replies/ReplyBubble.tsx` | Single reply row: handle · body · time |

Modified files:
- `src/data/types.ts` — add `reply_count: number` to Story
- `src/data/useStories.ts` — add `replies(count)` to SELECT, extract in toStory()
- `src/story/StorySheet.tsx` — footer gains tappable `💬 N` toggle, maxHeight 280 → 480

## Data Flow

```
Map loads
  └─ useStories SELECT: replies(count) included
       └─ story.reply_count available in collapsed footer

User taps "💬 3 replies"
  └─ threadOpen = true
       └─ useReplies(story.id) fires (first time only)
            └─ SELECT id, body, created_at, author_id,
                      users(display_handle)
               WHERE story_id = ? AND status = 'live'
               ORDER BY created_at ASC
            └─ ReplyBubble list rendered inside StorySheet

User submits reply
  └─ usePostReply → post-reply edge function
       └─ validates body (1–300 chars), story_id (UUID), auth
       └─ checks story exists and status = 'live'
       └─ inserts reply, returns { id }
  └─ optimistic: bubble appended immediately, count +1 locally
  └─ onPosted() → re-fetches useReplies to confirm server state
  └─ on error: revert optimistic bubble, show inline error
```

## Edge Function: post-reply

- Method: POST only; OPTIONS returns CORS 204
- Auth: requires Authorization header; 401 if missing or invalid
- Validation:
  - `story_id`: valid UUID format — 400 if not
  - `body`: string, 1–300 chars after trim — 400 if not
- Story check: must exist with `status = 'live'` — 404 if not
- Insert: `{ story_id, author_id, body: body.trim(), status: 'live' }`
- Response: `{ id }` with status 201
- All error responses include CORS headers

## UX States

| state | what user sees |
|-------|---------------|
| Collapsed, 0 replies | footer: `💬 Reply` label (tappable) |
| Collapsed, N replies | footer: `💬 3 replies` (tappable) |
| Thread loading | spinner in place of reply list |
| Thread open, no replies | "be the first to reply" hint |
| Thread open, has replies | scrollable ReplyBubble list + ReplyInput below |
| Submitting | send button spinner, input disabled |
| Submit error | red hint below input, draft text preserved |
| After submit | bubble appears, input clears, count +1 |

## Reply Display Name

Resolved at render time: `display_handle ?? 'anon'`

This is forward-compatible with:
- **Handle claiming (Plan 3)**: when a user claims a handle, all their replies automatically show the new name — no migration
- **Email account linking**: Supabase preserves the UUID when an anonymous session links an email, so `author_id` remains valid and the handle resolves correctly

## Prerequisites

The `users` table must have an RLS SELECT policy that allows authenticated users to read at minimum the `id` and `display_handle` columns. This enables the `users(display_handle)` PostgREST join in `useReplies`. If no such policy exists, add one in the migration:

```sql
create policy "users: authenticated can read handle"
  on public.users for select
  to authenticated
  using (true);
```

## What This Is Not

- No nested replies (flat thread only)
- No reply reactions
- No edit or delete for replies (moderation handled via flagging in a future plan)
- No real-time reply subscription (pull-to-refresh or re-fetch on re-open is sufficient for v1)
