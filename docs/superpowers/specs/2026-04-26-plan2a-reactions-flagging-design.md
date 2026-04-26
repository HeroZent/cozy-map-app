# Plan 2a: Reactions & Flagging Design

## Goal
Add anonymous emoji reactions and content flagging to sulat stories, with pin glow intensity on the map that scales with engagement.

## Architecture

### Data layer
- `reactions` table already exists with unique constraint on `(story_id, user_id, emoji)` — each emoji is a toggle per user per story. Multiple emojis from the same user on the same story are allowed.
- `flags` table already exists with `target_type`, `target_id`, `flagged_by`, `reason` columns.
- `useStories` extended to include `reaction_count` (total across all emojis) and `my_reactions: string[]` (emojis the current user has toggled on) per story.
- Two new Supabase edge functions: `react-story` and `flag-story`.

### Edge functions

**`react-story`** (POST, authenticated)
- Body: `{ story_id: string, emoji: string }`
- Toggles: if `(story_id, user_id, emoji)` exists → DELETE (un-react). If not → INSERT.
- Returns: `{ reaction_count: number, my_reactions: string[] }`

**`flag-story`** (POST, authenticated)
- Body: `{ story_id: string, reason: string }`
- Enforces one flag per user per story (upsert on `(target_id, flagged_by)` where `target_type = 'story'`).
- On success: sets story `status = 'flagged'` if flag count ≥ 3 (auto-threshold).
- Returns: `{ ok: true }`

### useStories changes
The Supabase query adds a joined aggregate: `reactions(emoji, user_id)` per story. Client computes `reaction_count` and `my_reactions` by filtering to current user's `auth.uid`.

## Reaction UI

### Reactions (6 themed)
| Emoji | Label |
|-------|-------|
| 🕯️ | Felt this |
| 🤍 | Sending love |
| 💭 | Thinking of you |
| 🌱 | Stay hopeful |
| 🫂 | I hear you |
| 🤗 | Sending hugs |

### StorySheet changes
- Reaction row added below the body ScrollView, above the footer.
- Each reaction is a pill chip: `{emoji} {count}`.
- Chips the current user has active are highlighted amber (`theme.accent` background, dark text).
- Inactive chips are muted (`rgba(245,230,200,0.08)` background).
- Tapping a chip calls `react-story` and optimistically toggles the chip + count.
- Flag button (⚑) appears at the right end of the location row — small, `theme.textMuted` color.

### Flag flow
1. Tap ⚑ → bottom sheet opens with reason list.
2. Reasons: **Harmful or dangerous**, **Sexual or explicit**, **Spam**, **Harassment**, **Other**.
3. Tap a reason → calls `flag-story` → shows inline confirmation: "Thanks for letting us know." → auto-closes after 1.5s.
4. Once flagged by current user, ⚑ turns amber and is non-interactive (can't flag twice).

## Dynamic pin glow

`PinMarker` receives `reactionCount: number` prop. Glow tier drives animation parameters:

| Tier | Condition | Opacity range | Scale range | Cycle duration |
|------|-----------|---------------|-------------|----------------|
| Quiet | 0 reactions | 0.22 → 0.52 | 0.88 → 1.14 | 5600ms |
| Warm | 5–19 reactions | 0.35 → 0.65 | 0.92 → 1.28 | 4000ms |
| Bright | 20+ reactions | 0.50 → 0.85 | 1.00 → 1.45 | 2800ms |

`StoryPins` passes `story.reaction_count` down to `PinMarker`. `PinMarker` derives tier from count. `ClusterMarker` is unaffected.

## New files
- `src/reactions/ReactionBar.tsx` — row of 6 reaction chips
- `src/reactions/FlagSheet.tsx` — reason picker sheet
- `src/reactions/useReact.ts` — optimistic react-story hook
- `src/reactions/useFlag.ts` — flag-story hook
- `supabase/functions/react-story/index.ts` — edge function
- `supabase/functions/flag-story/index.ts` — edge function

## Modified files
- `src/story/StorySheet.tsx` — add ReactionBar + flag button
- `src/map/PinMarker.tsx` — add reactionCount prop + glow tier logic
- `src/map/StoryPins.tsx` — pass reaction_count to PinMarker
- `src/data/useStories.ts` — join reactions, compute reaction_count + my_reactions
- `src/data/types.ts` — add reaction_count, my_reactions to Story type

## Out of scope (Plan 2b, 2c)
- Replies / comment threads
- Admin moderation UI
- Push notifications for reactions
