# Admin Moderation Panel — Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

A standalone Next.js admin dashboard that lets the sulat operator log in, browse all stories and their replies, filter by keyword, and delete content. It is a separate Vercel project that connects to the existing Supabase instance using the service role key.

---

## Goals

- Allow the operator to quickly find and delete stories or replies that violate the Terms of Service
- Show stories and their replies together so moderation decisions can be made in context
- Filter the story list by a keyword (e.g. a slur or spam phrase) to find problematic content fast
- Surface flagged stories (community-reported) so they can be reviewed first

---

## Non-Goals

- Multiple admin users / role management (single operator only)
- Bulk-delete all matching stories in one click (intentional — prevents accidents)
- Editing story or reply content
- Viewing the map
- Managing users / banning devices (out of scope for v1)

---

## Architecture

### Project

| Item | Value |
|---|---|
| Framework | Next.js 14 App Router |
| Deployment | Vercel (new project, same org as main app) |
| Initial URL | `sulat-admin.vercel.app` |
| Custom domain (later) | `admin.sulat.app` |
| Database | Existing Supabase project (shared) |
| Supabase access | Service role key (server-only) |

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS, never exposed to browser |
| `ADMIN_EMAIL` | Only this email can access the admin (e.g. `hello@sulat.app`) |

---

## Auth

1. Operator visits any protected route → Next.js middleware checks for a Supabase session cookie → if missing, redirect to `/login`.
2. `/login` page renders an email + password form.
3. On submit, calls `supabase.auth.signInWithPassword({ email, password })` via a Server Action.
4. On success, middleware reads the session and additionally checks that `session.user.email === process.env.ADMIN_EMAIL`. If email doesn't match, the user is signed out and redirected to `/login` with an error.
5. Session cookie is managed by `@supabase/ssr` (`createServerClient` / `createBrowserClient`).
6. A **Sign out** button in the top bar calls `supabase.auth.signOut()` and redirects to `/login`.

### One-time setup (not in code)

Create the admin Supabase Auth user once via the Supabase dashboard:
- Authentication → Users → Invite user → enter `hello@sulat.app`
- Set a password from the dashboard or via the password reset flow.
- Set `ADMIN_EMAIL=hello@sulat.app` in Vercel env vars.

---

## Routes

| Route | Type | Description |
|---|---|---|
| `/login` | Page (public) | Email + password login form |
| `/` | Redirect | → `/stories` |
| `/stories` | Page (protected) | Main split-pane moderation view |

All routes except `/login` are protected by middleware.

---

## Pages

### `/login`

- Full-screen centered card (sulat. dark theme)
- Fields: Email, Password
- Submit button: "Sign in"
- Error state: inline message below form ("Invalid email or password")
- No "forgot password" link (operator manages their own credentials)
- On success: redirect to `/stories`

### `/stories`

Split-pane layout, full viewport height.

**Top bar** (full width):
- Left: `sulat. admin` wordmark
- Right: logged-in email + Sign out button

**Left panel** (fixed ~340 px width):
- Word filter input at top — text field, placeholder "Filter by word…"
  - Updates URL search param `?q=<word>` on change (debounced 300 ms)
  - Server re-fetches with `body ilike '%word%'`
- Story count line: `"312 stories"` or `"4 stories matching 'hate'"`
- Filter tabs: **All** | **Flagged** (switches `?filter=flagged`)
- Scrollable list of story rows:
  - Story body (truncated at ~80 chars)
  - Location · Date · Reply count
  - Flag badge (red, `"N flags"`) if `flag_count > 0`
  - Selected row: accent left border + subtle background highlight
  - Clicking a row sets `?id=<story_id>` in the URL

**Right panel** (flex 1):
- If no story selected: empty state ("Select a story to review")
- If story selected:
  - Full story body text
  - Metadata row: location, mood emoji, created_at, short ID
  - **Delete story** button (red, top-right of story section)
  - Replies section header: `"REPLIES (N)"`
  - Each reply card:
    - Full reply body
    - Date · short ID
    - **Delete** button (outlined red, right side)
  - If no replies: `"No replies"`

---

## Data Access

All queries run in Server Components or Server Actions using a Supabase client initialised with the service role key. No Supabase queries in browser code.

### Stories list query

Use the Supabase JS client with embedded relations to get flag and reply counts in one request:

```typescript
let query = supabase
  .from('stories')
  .select('id, body, location, mood, created_at, flags(id), replies(id)')
  .order('created_at', { ascending: false })
  .limit(100);

if (q) query = query.ilike('body', `%${q}%`);
```

In the Server Component, derive counts from the returned arrays:
- `flag_count = story.flags.length`
- `reply_count = story.replies.length`

For the **Flagged** tab (`?filter=flagged`), filter in the Server Component after fetching:
```typescript
const visible = filter === 'flagged'
  ? stories.filter((s) => s.flags.length > 0)
  : stories;
```

This keeps the query simple and avoids PostgREST aggregate-filter limitations. At ≤100 stories the in-memory filter is negligible.

### Replies query (for selected story)

```sql
SELECT id, body, created_at
FROM replies
WHERE story_id = $story_id
ORDER BY created_at ASC;
```

### Delete story Server Action

```typescript
// Deletes story; replies cascade via FK
await supabase.from('stories').delete().eq('id', storyId);
revalidatePath('/stories');
```

### Delete reply Server Action

```typescript
await supabase.from('replies').delete().eq('id', replyId);
revalidatePath('/stories');
```

After deletion the page re-fetches from the server (Server Component revalidation) — no optimistic UI needed.

---

## Components

| Component | Type | Responsibility |
|---|---|---|
| `middleware.ts` | Next.js middleware | Session check + email whitelist on every request |
| `app/login/page.tsx` | Server Component + form | Login form, Server Action for sign-in |
| `app/stories/page.tsx` | Server Component | Fetches stories list + selected story replies, renders split pane |
| `StoriesList` | Server Component | Left panel — story rows |
| `StoryDetail` | Server Component | Right panel — full text + replies |
| `WordFilterInput` | Client Component | Controlled input that updates `?q=` URL param (debounced) |
| `StoryRow` | Client Component | Single story row, handles click → sets `?id=` param |
| `DeleteStoryButton` | Client Component | Wraps `deleteStory` Server Action, shows confirm dialog |
| `DeleteReplyButton` | Client Component | Wraps `deleteReply` Server Action, shows confirm dialog |

### Confirm-before-delete

Both delete buttons show a browser `confirm()` dialog before firing the Server Action:
- Story: `"Delete this story and all its replies? This cannot be undone."`
- Reply: `"Delete this reply? This cannot be undone."`

This prevents accidental deletions with a single extra click.

---

## Styling

- Dark theme matching sulat's palette: `#0a0e22` background, `#141a3a` surface, `#f4c97a` accent, `rgba(245,230,200,…)` text
- Tailwind CSS for styling
- No animations needed — this is a utility tool

---

## File Structure

```
sulat-admin/                        ← new Next.js project (separate repo or /apps/admin monorepo subfolder)
├── app/
│   ├── layout.tsx                  ← root layout, dark background
│   ├── page.tsx                    ← redirect to /stories
│   ├── login/
│   │   └── page.tsx                ← login form
│   └── stories/
│       ├── page.tsx                ← main split-pane server component
│       ├── StoriesList.tsx         ← left panel
│       ├── StoryDetail.tsx         ← right panel
│       ├── StoryRow.tsx            ← client: row click handler
│       ├── WordFilterInput.tsx     ← client: debounced input
│       ├── DeleteStoryButton.tsx   ← client: confirm + server action
│       └── DeleteReplyButton.tsx   ← client: confirm + server action
├── lib/
│   ├── supabase-server.ts          ← createServerClient() helper (service role)
│   ├── supabase-browser.ts         ← createBrowserClient() helper (anon key, auth only)
│   └── actions.ts                  ← deleteStory, deleteReply server actions
├── middleware.ts                   ← session check + email whitelist
├── .env.local                      ← NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is only ever imported in `lib/supabase-server.ts` which is a server-only module. It is never passed to Client Components or included in the browser bundle.
- The email whitelist check in middleware means that even a valid Supabase session from a non-admin email is rejected.
- No public API routes — all mutations go through Server Actions (POST, same-origin only).

---

## Out of Scope (v1)

- Supabase Edge Function for delete (not needed — Server Actions are sufficient)
- Audit log of admin deletions
- Email notifications to flagging users
- Pagination beyond 100 stories (LIMIT 100 is sufficient for now)
- Dark/light theme toggle
- Mobile layout (desktop admin tool only)
