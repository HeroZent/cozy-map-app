# Sulat — Design Document

**Date:** 2026-04-26
**Status:** Approved design, ready for implementation planning
**Working name:** Sulat (Filipino: "letter / to write")

---

## Vision

Sulat is a cozy, anonymous map-based app where people pin thoughts — regrets, what's on their mind, struggles, hopes, memories, dreams, unsent letters, and forgiveness — to locations on a world map. Centered on the Philippines, zoomable globally. Other people can offer warmth through gentle reactions or short supportive replies. The map becomes a living, glowing record of what humans are quietly carrying.

The aesthetic is intentionally cozy and contemplative — not a feed, not a social network. A late-night map of warm lights.

---

## Decisions Locked In

| # | Decision | Choice |
|---|---|---|
| 1 | Platform | Native iOS + Android + Web (single shared codebase) |
| 2 | Pin location modes | Hybrid: GPS, drop-a-pin, or pick-a-city — user chooses each time |
| 3 | Identity | Anonymous-by-default with optional account upgrade for cross-device + notifications |
| 4 | Replies | Flat (no threading) + emoji reactions |
| 5 | Safety | Cost-conscious AI moderation: keyword tripwire + free OpenAI moderation + paid Anthropic Haiku for crisis confirmation only |
| 6 | Discovery | Map + density heatmap overlay + "Lantern Mode" for guided random hops + Near-me feed |
| 7 | Mood categories | 8: 🌙 Regret, 💭 On my mind, 🌧️ Struggling, 🌱 Hopeful, 🕯️ Memory, ✨ Dream, 💌 Unsent letter, 🤍 Forgiveness |
| 8 | Story length | 1000 chars stories, 500 chars replies |
| 9 | Notifications | Replies on (push), reactions off by default — opt into digest in Settings |
| 10 | Languages | UI in English at launch; posts in any language; Tagalog/Cebuano UI in future phases |
| 11 | Story lifespan | Stories live forever; transition to "Memory" status at 6 months with distinct visual treatment, replies closed |
| 12 | Aesthetic | User-selectable theme system. v1 ships 4 themes; default Lantern Glow. Architected for future themes |
| 13 | Name | Sulat — verified clear via App Store / Play Store / web search |
| 14 | Tech stack | Approach 1 — Expo + Supabase + MapLibre |
| 15 | Build phasing | Web-first (Vercel) → Android (local builds) → iOS (EAS Build, Phase 2) |

---

## Section 1 — System Architecture & Data Model

### High-Level Shape

```
┌──────────────────────────────────────────────────────┐
│   Clients (one Expo codebase, three targets)         │
│                                                      │
│   📱 Android     🍎 iOS (Phase 2)     🌐 Web          │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS (Supabase JS SDK + REST)
                       │ WebSocket (Realtime subscriptions)
                       ▼
┌──────────────────────────────────────────────────────┐
│   Supabase (managed Postgres + edge functions)       │
│   • Postgres + PostGIS (stories, replies, reactions) │
│   • Auth                (anonymous + optional email) │
│   • Realtime            (live reactions, replies)    │
│   • Edge Functions      (moderation pipeline)        │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│   External services (called only by edge functions)  │
│   • OpenAI /moderations  (free first-pass)           │
│   • Anthropic Haiku 4.5  (crisis confirmation only)  │
│   • Expo Push API        (notifications)             │
│   • MapLibre + Protomaps (tile CDN, no backend call) │
└──────────────────────────────────────────────────────┘
```

The clients are intentionally thin. All moderation and notification logic lives in **Supabase Edge Functions** so secrets (OpenAI / Anthropic API keys) never ship in the device bundle.

### Tech Stack

- **Frontend framework:** Expo (React Native + React Native Web). One codebase, three targets.
- **Backend:** Supabase — Postgres + PostGIS + Auth + Realtime + Edge Functions + Storage.
- **Map renderer:** MapLibre GL (open-source Mapbox fork) with Protomaps tiles. No per-load fees.
- **Moderation:** OpenAI `/moderations` (free) + crisis keyword tripwire (client-side) + Anthropic Haiku 4.5 (paid, on-tripwire only).
- **Push notifications:** Expo Push Notifications service (free, unlimited).
- **Web hosting:** Vercel free tier.
- **Build:** Local Android builds via Android Studio for v1; EAS Build planned for iOS in Phase 2.

### Data Model

| Table | Purpose | Key fields |
|---|---|---|
| `users` | Anonymous device identities + optional accounts | `id`, `device_fingerprint`, `email` (nullable), `display_handle` (nullable), `theme_preference`, `banned_at` (nullable), `created_at` |
| `stories` | A pinned post | `id`, `author_id`, `mood`, `body` (≤ 1000 chars), `location` (PostGIS Point), `location_label`, `pin_mode` (gps/dropped/city), `language`, `status` (live/hidden/flagged/removed), `is_memory`, `created_at` |
| `replies` | A flat reply on a story | `id`, `story_id`, `author_id`, `body` (≤ 500 chars), `status`, `created_at` |
| `reactions` | An emoji reaction on a story | `id`, `story_id`, `user_id`, `emoji`, `created_at`, unique(story_id, user_id, emoji) |
| `flags` | User reports of bad content | `id`, `target_type`, `target_id`, `flagged_by`, `reason`, `created_at` |
| `moderation_events` | Audit log of moderation pipeline outcomes | `id`, `target_type`, `target_id`, `verdict`, `service`, `crisis_score`, `metadata`, `created_at` |
| `notification_tokens` | Expo push tokens for users with accounts | `user_id`, `token`, `platform`, `updated_at` |

### Why This Model

- **PostGIS `Point` for location** enables fast "stories near me" queries, density heatmap rendering, and bounding-box queries when the user pans the map.
- **`status` field** on stories/replies lets moderation hide or remove without deleting (preserves audit trail).
- **`pin_mode`** records *how* the location was set so we can treat dropped pins differently from GPS pins.
- **Anonymous users get rows in `users`** keyed by a device fingerprint — not a real account. Upgrading to an account adds an email but keeps the same `users.id`, so all existing stories/replies/reactions follow them seamlessly.
- **`moderation_events` audit log** is critical: when crisis detection fires, we want a record without exposing user-identifying data unnecessarily.

### Row-Level Security (RLS)

Supabase enforces these on every query:

- Anyone can read `stories` / `replies` / `reactions` where `status = 'live'`.
- Authors can read their own non-live stories.
- Only the author can update/delete their own story.
- Reactions require a valid user (anonymous or account) and are unique per (story, user, emoji).
- `moderation_events` and `flags` are server-side only — no direct client access.

---

## Section 2 — Map & Posting Experience

### Map Browsing

- **Default center:** First launch opens centered on Philippines (zoomed to show the full archipelago). Subsequent launches remember the last viewed location.
- **Pins:** Each pin shows the story's mood emoji inside a glowing circle. Color/intensity follows the active theme.
- **Memory pins:** Stories ≥ 6 months old get distinct treatment per theme (cooler glow + small star mark for Lantern Glow).
- **Clustering:** At low zoom, overlapping pins collapse into a "+N" badge using Supercluster. Tap to zoom in.
- **Heatmap overlay:** Toggleable. MapLibre's built-in heatmap layer colors regions by story density. Hue subtly shifts based on the dominant mood mix in that area.
- **Tapping a pin:** Opens the story page (full text + reactions + replies).
- **Near-me feed:** Bottom card; swipe up to see a list of stories near current viewport, sorted by recency.

### Posting Flow (3-step composer)

1. **Pick a mood** — grid of 8 moods. Required first. Composer placeholder text adapts ("What's been on your mind?" vs "Who is this letter for?").
2. **Write the story** — text area with 1000-char counter, soft warning at 950. Quiet typography. Local autosave every few seconds.
3. **Pin the location** — bottom sheet with three tabs:
   - **📍 Use my location** (GPS, browser geolocation API on web)
   - **🗺️ Drop a pin** (small map; pan + tap to place)
   - **🏙️ Pick a city** (search input → free geocoder, e.g., Photon over OpenStreetMap)

Submit triggers the moderation pipeline. If clean, the post appears within ~1s via Supabase Realtime. Crisis tripwire path is described in Section 4.

### Lantern Mode

- Tap the **🏮 Lantern** button → screen dims, camera flies to a random pin worldwide.
- Picked pin opens with subtle ambient effect (gentle particle drift in Lantern Glow).
- "Next lantern →" cycles. "Stay here" returns to map.
- **Anti-doomscroll guard:** After 5 consecutive lanterns, soft prompt: *"Take a breath. Want to write your own?"*

### Geographic Privacy

- **Dropped pins** stored at full PostGIS precision but **rounded to ~500m** when shown to other users. Original kept only for analytics.
- **City-picked pins** snap to city centroid plus ~1km random jitter so multiple posts in the same city don't visually stack.
- **GPS pins** also get the 500m rounding before display.

This guarantees an anonymous poster in a small barangay can't be triangulated.

---

## Section 3 — Identity, Replies & Engagement

### Anonymous Identity

On first launch, the app creates a `users` row keyed by a **device fingerprint** — no signup, no prompt:

- Generated client-side: UUID stored in `expo-secure-store` (encrypted on iOS/Android), `localStorage` for web.
- Sent to Supabase as part of an anonymous auth exchange — Supabase issues a JWT bound to that user row.
- Reinstall = new identity (old stories remain on the map but the user loses ability to manage them). Expected trade-off of anonymous-by-design.

### Optional Account Upgrade

Discreet prompt appears in two places:
1. After their **3rd post** (once they're invested).
2. Permanently in Settings.

Upgrade flow:
- Pick: **Continue with Apple**, **Continue with Google**, or **Email magic link** (Supabase Auth).
- Existing anonymous `users.id` is **kept** — we just attach an email and a chosen `display_handle` to it. No data loss, no merge step.
- `display_handle` is generated soft and themed ("Wandering Lantern", "Quiet Tide", "Paper Boat") — user picks from 5 random options or regenerates. Renameable later.
- **Display handle is never shown publicly.** Posts stay anonymous to other users; the handle is only visible to the user themselves.

### Replies

- Tap a story → full view. Below the body: replies (chronological), reaction bar, reply composer.
- **Single-level only.** No threading.
- 500-char limit. Same moderation pipeline as stories.
- Reply authors are anonymous to readers. A user sees only "Anonymous" labels — but sees their *own* reply with a small "you" tag.
- Story authors get push notifications when someone replies (per Q9; gated on having an account + push permission).
- Replies can be flagged the same way stories can.

### Reactions

Four reactions, fixed for v1:

| Emoji | Meaning |
|---|---|
| 🫂 Hug | "I see you" |
| ❤️ Heart | "This moved me" |
| 🌱 Seed | "Hope for you" |
| 🕯️ Candle | "Holding space" |

- Tap to add, tap again to remove.
- Each user can leave **one of each** per story (unique constraint on `(story_id, user_id, emoji)`).
- Reaction counts visible on the story page and as small numbers near pins on the map (when zoomed close).
- **No reaction notifications** by default. Optional weekly digest in Settings.

### Out of Scope for v1

- ❌ Private DMs between users (anonymous DMs are an abuse vector)
- ❌ Follow/follower system
- ❌ Karma, points, or visible reaction leaderboards
- ❌ Reposts / quotes / external sharing of someone's story
- ❌ Editing a story after posting (deliberately permanent — like sending a letter). Author *can* delete (sets `status = 'removed'`).

### App-Level Sharing

Stories cannot be shared as links to other platforms in v1. The **app itself** has a "Share Sulat" button in Settings producing a generic invite link.

---

## Section 4 — Safety & Moderation Pipeline

Three layers, ordered cheapest-first.

### Layer 1: Crisis Keyword Tripwire (free, on-device)

A small list (~50 phrases) covering English + Filipino + code-switched variants of self-harm/suicide ideation:
- English: "kill myself", "want to die", "end it all", "no reason to live", "better off dead"
- Filipino: "magpapakamatay", "ayoko na mabuhay", "wala nang silbi", "tatapusin ko na"
- Metaphors: "checking out", "saying goodbye", "permanent solution"

Runs **client-side** before submit. Zero API cost, zero latency. If matched, post takes Layer 2b instead of 2a.

### Layer 2a: Standard Content Moderation (free)

For posts that *don't* hit the crisis tripwire:

- Submit → Supabase Edge Function → OpenAI `/moderations` endpoint.
- Categories: hate, harassment, sexual content involving minors, violence, self-harm, doxxing.
- If any category exceeds threshold → post rejected with soft message:
  > *"This story didn't pass our quiet-space check. If you think this was a mistake, you can edit and try again."*
- Audit row written to `moderation_events`.

### Layer 2b: Crisis Confirmation (cheap paid)

For posts that *did* hit the tripwire:

- OpenAI `/moderations` first (catches outright unsafe).
- Then Anthropic Haiku 4.5 with focused prompt: *"Is this person currently in crisis or distress where they need immediate support? Reply with `crisis`, `processing`, or `metaphor`."*
- Cost: ~$0.0003 per call. ~1% of posts hit this path.
- Outcomes:
  - **`crisis`** → Post is held briefly. User sees hotline overlay (region-aware: Hopeline PH 0917-558-4673 for PH; Befrienders Worldwide otherwise) with two buttons: "Get help now" and "Continue posting anyway". If they continue, post goes live with soft note appended.
  - **`processing`** → Post goes live normally; same hotline note appended quietly at bottom of story page.
  - **`metaphor`** → Post goes live normally with no extra UI.

### Layer 3: Community Flagging

- Every story/reply has "..." menu → "Flag this".
- Flag reasons: harmful, harassment, spam, doxxing, off-topic.
- A story with **3+ flags** is auto-hidden (`status = 'flagged'`) until reviewed.
- Reviewer queue surfaced in a Supabase admin dashboard. v1 = solo moderator (the developer). RLS policies grant moderator role to volunteers later.

### Rate Limiting

Enforced by Supabase Edge Function before insert:

| Action | Limit |
|---|---|
| Stories per user | 5/hour, 20/day |
| Replies per user | 30/hour, 100/day |
| Reactions toggled | 200/hour |
| Flags submitted | 20/day |

Friendly message on hit limit.

### Reply Moderation

Same Layer 1 + 2a pipeline. Layer 2b not typically needed for replies — but mocking-a-struggle replies caught by OpenAI's harassment category.

### Self-Harm to Others (rare but critical)

OpenAI `/moderations` flags `violence/threatening` separately. Posts in that category are **not just hidden** — elevated to a separate audit table; developer gets an email (Resend free tier) for urgent review.

### Cost Summary at Scale

| Posts/month | Tripwire | OpenAI mod | Anthropic crisis | **Total** |
|---|---|---|---|---|
| 1,000 | $0 | $0 | ~$0.03 | **< $0.10** |
| 10,000 | $0 | $0 | ~$0.30 | **< $1** |
| 100,000 | $0 | $0 | ~$3 | **< $10** |

### Out of Scope for v1

- ❌ Automated identity verification (KYC) — would break anonymity.
- ❌ Image/photo posts — moderating images at zero cost is hard; text-only keeps us safe and cheap.
- ❌ Location-based blocking ("ban this region from posting") — adds politics, not safety.

---

## Section 5 — Theming, Memories & Polish

### Theme System

Themes are **config-driven**, not code:

```ts
interface SulatTheme {
  id: string;
  name: string;
  description: string;

  // Map base
  mapStyle: string;          // MapLibre style URL or local style JSON
  landFill: string;
  waterFill: string;

  // UI
  background: string;
  surface: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  fontFamily: string;

  // Pin appearance
  pin: { glow: string; body: string; pulseDuration: number };
  pinMemory: { glow: string; body: string; decoration: string };

  // Heatmap gradient stops
  heatmap: { offset: number; color: string }[];

  // Reactions tint
  reactionTint: string;
}
```

- All 4 themes ship in v1 (`assets/themes/*.json`): **🏮 Lantern Glow** (default), **🌸 Pastel Dawn**, **✨ Stargazer**, **📜 Forest Journal**.
- User picks in Settings → Appearance. Selection stored on `users.theme_preference` (synced for account users) and `secure-store` (for anonymous).
- Adding new themes later = config update, no app store release required.
- "Match system" option auto-picks Lantern Glow at night, Pastel Dawn during the day.

### Memory Transition (6-month threshold)

When a story crosses **180 days old**:

1. Nightly Supabase scheduled function flips `stories.is_memory = true`.
2. Pin renders with theme's `pinMemory` style — different glow + decoration mark.
3. Story page shows soft label: *"This is now a memory · 8 months old"*.
4. **Replies are closed on memories.** Existing reactions/replies stay; new ones can't be added.
5. Memories can still be flagged.

### First-Launch Onboarding

Three soft-tone screens, swipeable, skippable:

1. **"A quiet place on the map"** — small animation, pins lighting up around the world.
2. **"You're anonymous. Always."** — explains no-signup; mentions optional account later.
3. **"Be kind. Some stories are heavy."** — kindness pledge.

After onboarding, lands on map centered on Philippines.

### Empty / Quiet States

- **First time on map:** ambient pins worldwide so it never feels empty.
- **No replies yet on your story:** *"Your lantern is lit. Sometimes the warmth comes later."*
- **Offline:** read-only mode; last-cached stories near last viewport browsable. Posting queues locally and syncs when online.
- **Lantern with low post volume:** if < 50 live stories, rotates through what's there.

### Cozy Animations

- **Pin pulse:** 3–4s breathing pulse, randomized phase per pin.
- **Reaction add:** emoji "lifts" off the bar with soft fade and bloom.
- **Posting confirmation:** new pin fades in slowly with bloom (~1.5s); camera pans to it.
- **Lantern transition:** fade to dim before camera flies. Never abrupt.
- **Sound:** completely silent by default. Future setting can add ambient mode.
- **Haptics:** tiny tap on reaction add, soft tick when pin pulses on tap. iOS-only initially.

### Accessibility

Non-negotiable for v1:

- Screen reader labels on every interactive element (`accessibilityLabel`).
- Mood emoji always paired with text label ("Hopeful — Looking forward").
- Min text size honors OS font scale.
- Dynamic Type support up to 200% (text reflows; map UI stays usable).
- Color contrast meets WCAG AA in all 4 themes.
- Motion-reduce preference: pin pulse and lantern transitions disabled when OS reports reduced-motion.

### Out of Scope for v1

- ❌ Custom theme creation (just the 4 fixed)
- ❌ Paid premium themes
- ❌ Audio posts
- ❌ GIFs or stickers in posts

---

## Section 6 — Phasing, Testing & Future Plans

### Phase 0 — Web-First MVP

**Target:** Fully functional web app at `sulat.app` (or local URL), all core flows working.

**Includes:**
- Map (MapLibre + Protomaps), pin rendering, clustering, heatmap.
- Posting flow with all 8 moods + 3 location modes.
- Reading, replies, reactions.
- Anonymous identity + optional email account upgrade.
- All 4 themes + theme switcher.
- Crisis tripwire + OpenAI moderation + Anthropic Haiku confirmation.
- Community flagging.
- Memory transition logic.
- Lantern mode.
- English UI; posts in any language.

**Deploys to:** Vercel free tier.

**Excluded from Phase 0:**
- Push notifications (no-op on web for v1).
- Haptics.
- App store submissions.

### Phase 1 — Android Port

**Target:** Same app, packaged as `.aab` for Google Play Store.

**Work:**
- Install Android Studio + JDK locally.
- `npx expo prebuild` to generate native Android project.
- Wire `expo-notifications` with Expo Push Service + Supabase Edge Function for push delivery on replies.
- Wire `expo-haptics` for tap feedback.
- Generate Android signing keys.
- Test on real device + emulator.
- Build release `.aab` locally.
- Submit to Google Play Console ($25 one-time).
- Internal Testing → Closed Testing → Production rollout.

### Phase 2 — iOS Port

**Target:** App Store release.

**Work:**
- Apple Developer Program ($99/year).
- Set up EAS Build (free tier).
- `eas build --platform ios` → `.ipa`.
- `eas submit -p ios`.
- App Store review (1–7 days typical).

iOS-specific tweaks: native iOS haptics, safe-area handling, light/dark system theme integration, iOS-style modal sheets for the post composer.

### Testing Strategy

**Unit + component tests** (Jest + React Native Testing Library):
- Mood picker renders all 8 options.
- Composer enforces 1000-char (story) / 500-char (reply) limits.
- Crisis keyword tripwire correctly identifies seeded test phrases.
- Moderation pipeline returns expected verdict for fixture inputs (mocked OpenAI/Anthropic).
- Theme switcher applies new color tokens.

**Integration tests** (against a Supabase test project):
- Anonymous user can post a story end-to-end.
- Account upgrade preserves user identity.
- Rate limits enforce.
- RLS prevents reading non-live stories you don't own.

**E2E tests** (Playwright on web):
- First-launch onboarding flow.
- Compose + submit + see pin on map.
- Lantern mode hops to a random pin.
- Reply + reaction flows.
- Theme switching.

Per existing project convention, every Playwright E2E test wires up the **JourneyTracker overlay** so a live checklist ticks off in the top-right during the run.

**Manual QA checklist:**
- Crisis flow: post text matching tripwire → see hotline overlay → confirm post lifecycle.
- Moderation reject flow: post slur → see soft rejection.
- Each theme verified visually in light + dark system mode.
- Accessibility: VoiceOver/TalkBack walkthroughs of critical paths.

### Hardening Before Production

- Sentry wired for error tracking (free tier).
- Daily Supabase database backups (built-in).
- Privacy policy + terms of service pages — required for App/Play Store.
- "Delete my data" button in Settings that wipes user's stories, replies, reactions, and the user row itself (GDPR / PH Data Privacy Act compliance).
- Hotline links region-aware: PH first (Hopeline, Natasha Goulbourn Foundation); Befrienders Worldwide as global fallback.

### Costs Summary

| Phase | One-time | Monthly |
|---|---|---|
| Phase 0 (Web only) | ~$20 (domain, optional) | $0–$5 |
| Phase 1 (+ Android) | +$25 (Google Play) | $0–$5 |
| Phase 2 (+ iOS) | +$99/year (Apple) | $0–$5 |

Monthly running cost stays in the $0–$5 range until the app outgrows Supabase free tier (~50K monthly active users), at which point it rises to ~$30–50/mo.

### Future Plans (not v1, tracked here)

- EAS Build adoption for streamlined Android + iOS releases.
- Tagalog UI translation as first localization target.
- Cebuano UI translation as Visayas/Mindanao userbase emerges.
- Web push notifications.
- Seasonal themes (Cherry Blossom, Winter Hearth) shipped as theme JSON updates.
- Image posts with on-device or moderated image classification.
- Voice notes as posts.
- Audio ambience setting (rain, hum, etc.).
- Volunteer moderator program with proper moderator role + RLS.
- Anniversary nudges — when a Memory hits 1 year, gentle prompt to author.
- Region-targeted crisis hotlines beyond PH.
- Companion garden view — alternative visualization where each story is a plant.

### Explicitly Not Designing For

- Monetization. No ads, no subscriptions in v1. If costs grow, a small "Light a candle" tip jar (one-time donation) is the philosophical fit, not subscription tiers or ads.
- Virality features (reposts, share-this-story-to-Instagram). The app gains nothing from being loud.
- Influencer / creator features. There are no creators here.

---

## Appendix A — Mood Catalog

| Emoji | Name | Description |
|---|---|---|
| 🌙 | Regret | Things I wish I'd done differently |
| 💭 | On my mind | Whatever I'm thinking right now |
| 🌧️ | Struggling | Going through something hard |
| 🌱 | Hopeful | Looking forward, feeling lighter |
| 🕯️ | Memory | Honoring someone or something I miss |
| ✨ | Dream | Something I want for my life |
| 💌 | Unsent letter | Something I never said to someone |
| 🤍 | Forgiveness | Letting go of something that hurt |

## Appendix B — Crisis Hotlines (region-aware)

**Philippines (priority):**
- Hopeline PH: 0917-558-HOPE (4673), 02-8804-4673
- Natasha Goulbourn Foundation: (02) 8804-4673
- In Touch Crisis Line: (02) 8893-7603

**Global fallback:**
- Befrienders Worldwide: https://www.befrienders.org

## Appendix C — Reaction Set (v1)

| Emoji | Slug | Meaning |
|---|---|---|
| 🫂 | `hug` | I see you |
| ❤️ | `heart` | This moved me |
| 🌱 | `seed` | Hope for you |
| 🕯️ | `candle` | Holding space |
