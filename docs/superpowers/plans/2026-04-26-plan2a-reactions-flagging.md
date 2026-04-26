# Plan 2a: Reactions & Flagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 themed emoji reactions and content flagging to story cards, with map pin glow intensity scaling with engagement.

**Architecture:** Edge functions toggle reactions and submit flags; `useStories` joins reaction data per story; `ReactionBar` renders optimistically; `PinMarker` derives its glow tier from `reaction_count`.

**Tech Stack:** Supabase (Postgres + Edge Functions + RLS), React Native / Expo Web, TypeScript, react-map-gl/maplibre.

---

## File Map

**Create:**
- `supabase/migrations/20260426000008_reactions_extend.sql` — extend reaction_emoji enum
- `supabase/functions/react-story/index.ts` — toggle reaction edge function
- `supabase/functions/flag-story/index.ts` — submit flag edge function
- `src/reactions/catalog.ts` — 6 reaction definitions
- `src/reactions/useReact.ts` — optimistic reaction hook
- `src/reactions/useFlag.ts` — flag submission hook
- `src/reactions/ReactionBar.tsx` — 6 emoji chips with counts
- `src/reactions/FlagSheet.tsx` — reason picker overlay

**Modify:**
- `src/data/types.ts` — add `reaction_count`, `my_reactions` to Story
- `src/data/useStories.ts` — join reactions in SELECT
- `src/story/StorySheet.tsx` — add ReactionBar + flag button
- `src/map/PinMarker.tsx` — glow tier from reactionCount prop
- `src/map/StoryPins.tsx` — pass reaction_count to PinMarker

---

### Task 1: Extend reaction_emoji enum + deploy migration

**Files:**
- Create: `supabase/migrations/20260426000008_reactions_extend.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/20260426000008_reactions_extend.sql
alter type reaction_emoji add value if not exists 'thought';
alter type reaction_emoji add value if not exists 'care';
```

- [ ] **Step 2: Apply migration**

```bash
cd cozy-map-app
npx supabase db push
```

Expected: `Applying migration 20260426000008_reactions_extend.sql... done`

- [ ] **Step 3: Verify in Supabase dashboard or run:**

```bash
npx supabase db diff
```

Expected: no pending migrations.

---

### Task 2: Reactions catalog + update Story type

**Files:**
- Create: `src/reactions/catalog.ts`
- Modify: `src/data/types.ts`

- [ ] **Step 1: Create reactions catalog**

```typescript
// src/reactions/catalog.ts
export type ReactionEmoji = 'candle' | 'heart' | 'thought' | 'seed' | 'hug' | 'care';

export interface ReactionEntry {
  emoji: ReactionEmoji;
  icon: string;
  label: string;
}

export const REACTIONS: ReactionEntry[] = [
  { emoji: 'candle',  icon: '🕯️', label: 'Felt this' },
  { emoji: 'heart',   icon: '🤍', label: 'Sending love' },
  { emoji: 'thought', icon: '💭', label: 'Thinking of you' },
  { emoji: 'seed',    icon: '🌱', label: 'Stay hopeful' },
  { emoji: 'hug',     icon: '🫂', label: 'I hear you' },
  { emoji: 'care',    icon: '🤗', label: 'Sending hugs' },
];
```

- [ ] **Step 2: Update Story type**

```typescript
// src/data/types.ts — replace the file with:
export type Mood =
  | 'regret' | 'on_my_mind' | 'struggling' | 'hopeful'
  | 'memory' | 'dream' | 'unsent_letter' | 'forgiveness';

export type PinMode = 'gps' | 'dropped' | 'city';

export type StoryStatus = 'live' | 'hidden' | 'flagged' | 'removed';

export type ReactionEmoji = 'candle' | 'heart' | 'thought' | 'seed' | 'hug' | 'care';

export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  created_at: string;
  reaction_count: number;
  my_reactions: ReactionEmoji[];
}

export interface User {
  id: string;
  device_fingerprint: string;
  email: string | null;
  display_handle: string | null;
  theme_preference: string;
  banned_at: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd cozy-map-app
npx tsc --noEmit
```

Expected: no errors (may see unresolved refs in later tasks — fix those in their respective tasks).

---

### Task 3: react-story edge function

**Files:**
- Create: `supabase/functions/react-story/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/react-story/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_EMOJIS = new Set(['candle', 'heart', 'thought', 'seed', 'hug', 'care']);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; emoji: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!payload.story_id || !VALID_EMOJIS.has(payload.emoji)) {
    return new Response('Invalid payload', { status: 400, headers: cors });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const userId = authUser.user.id;

  // Check if this exact reaction already exists
  const { data: existing } = await supa
    .from('reactions')
    .select('id')
    .eq('story_id', payload.story_id)
    .eq('user_id', userId)
    .eq('emoji', payload.emoji)
    .maybeSingle();

  if (existing) {
    // Toggle off — delete
    await supa.from('reactions').delete().eq('id', existing.id);
    return new Response(JSON.stringify({ action: 'removed' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Toggle on — insert
  const { error } = await supa.from('reactions').insert({
    story_id: payload.story_id,
    user_id: userId,
    emoji: payload.emoji,
  });

  if (error) return new Response(error.message, { status: 400, headers: cors });

  return new Response(JSON.stringify({ action: 'added' }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
cd cozy-map-app
npx supabase functions deploy react-story
```

Expected: `Deployed Functions react-story`

---

### Task 4: flag-story edge function

**Files:**
- Create: `supabase/functions/flag-story/index.ts`

- [ ] **Step 1: Create the edge function**

```typescript
// supabase/functions/flag-story/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALID_REASONS = new Set([
  'Harmful or dangerous',
  'Sexual or explicit',
  'Spam',
  'Harassment',
  'Other',
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; reason: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!payload.story_id || !VALID_REASONS.has(payload.reason)) {
    return new Response('Invalid payload', { status: 400, headers: cors });
  }

  const authSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: authUser } = await authSupa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });
  const userId = authUser.user.id;

  // Use service role for admin queries (flag count, status update)
  const adminSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Prevent double-flagging
  const { data: existingFlag } = await adminSupa
    .from('flags')
    .select('id')
    .eq('target_type', 'story')
    .eq('target_id', payload.story_id)
    .eq('flagged_by', userId)
    .maybeSingle();

  if (existingFlag) {
    return new Response(JSON.stringify({ ok: true, already_flagged: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Insert flag
  await adminSupa.from('flags').insert({
    target_type: 'story',
    target_id: payload.story_id,
    flagged_by: userId,
    reason: payload.reason,
  });

  // Auto-threshold: if ≥ 3 flags, mark story as flagged
  const { count } = await adminSupa
    .from('flags')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'story')
    .eq('target_id', payload.story_id);

  if ((count ?? 0) >= 3) {
    await adminSupa
      .from('stories')
      .update({ status: 'flagged' })
      .eq('id', payload.story_id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
cd cozy-map-app
npx supabase functions deploy flag-story
```

Expected: `Deployed Functions flag-story`

---

### Task 5: Update useStories to join reactions

**Files:**
- Modify: `src/data/useStories.ts`

- [ ] **Step 1: Replace useStories.ts**

```typescript
// src/data/useStories.ts
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Story, ReactionEmoji } from './types';

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface UseStoriesResult {
  stories: Story[];
  loading: boolean;
  error: Error | null;
}

type ReactionRow = { emoji: ReactionEmoji; user_id: string };
type StoryRow = Omit<Story, 'location' | 'reaction_count' | 'my_reactions'> & {
  lat: number;
  lng: number;
  reactions: ReactionRow[];
};

function toStory(r: StoryRow, userId: string | null): Story {
  const reactions = r.reactions ?? [];
  return {
    ...r,
    location: { type: 'Point', coordinates: [r.lng, r.lat] },
    reaction_count: reactions.length,
    my_reactions: userId
      ? reactions.filter((rx) => rx.user_id === userId).map((rx) => rx.emoji)
      : [],
  };
}

function inBbox(s: StoryRow, bbox: Bbox): boolean {
  return (
    typeof s.lng === 'number' && typeof s.lat === 'number' &&
    s.lng >= bbox.minLng && s.lng <= bbox.maxLng &&
    s.lat >= bbox.minLat && s.lat <= bbox.maxLat
  );
}

const SELECT = 'id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, reactions(emoji, user_id)';

export function useStories(bbox: Bbox, refreshKey = 0): UseStoriesResult {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (refreshKey === 0) setLoading(true);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user?.id ?? null;

        const { data, error: e } = await supabase
          .from('stories')
          .select(SELECT)
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(500);
        if (e) throw e;

        const rows = (data ?? []) as StoryRow[];
        const filtered = rows.filter((s) => inBbox(s, bbox)).map((r) => toStory(r, userId));

        if (!cancelled) {
          setStories(filtered);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error);
          setLoading(false);
        }
      }
    })();

    const channelName = `stories-live-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'stories' },
          (payload) => {
            const inserted = payload.new as { id: string; status: string };
            if (inserted.status !== 'live') return;
            (async () => {
              const { data: sessionData } = await supabase.auth.getSession();
              const userId = sessionData.session?.user?.id ?? null;
              const { data } = await supabase
                .from('stories')
                .select(SELECT)
                .eq('id', inserted.id)
                .single();
              if (data) {
                const row = data as StoryRow;
                if (inBbox(row, bbox)) {
                  setStories((prev) => [toStory(row, userId), ...prev]);
                }
              }
            })();
          })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat, refreshKey]);

  return { stories, loading, error };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cozy-map-app
npx tsc --noEmit
```

Expected: no errors.

---

### Task 6: useReact hook

**Files:**
- Create: `src/reactions/useReact.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/reactions/useReact.ts
import { supabase } from '@/data/supabase';

export interface ReactResult {
  action: 'added' | 'removed';
}

export function useReact() {
  return async function react(storyId: string, emoji: string): Promise<ReactResult> {
    const { data, error } = await supabase.functions.invoke('react-story', {
      body: { story_id: storyId, emoji },
    });
    if (error) throw new Error(error.message);
    return data as ReactResult;
  };
}
```

---

### Task 7: useFlag hook

**Files:**
- Create: `src/reactions/useFlag.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/reactions/useFlag.ts
import { supabase } from '@/data/supabase';

export function useFlag() {
  return async function flag(storyId: string, reason: string): Promise<void> {
    const { error } = await supabase.functions.invoke('flag-story', {
      body: { story_id: storyId, reason },
    });
    if (error) throw new Error(error.message);
  };
}
```

---

### Task 8: ReactionBar component

**Files:**
- Create: `src/reactions/ReactionBar.tsx`

- [ ] **Step 1: Create ReactionBar**

```typescript
// src/reactions/ReactionBar.tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { REACTIONS } from './catalog';
import { useReact } from './useReact';
import type { Story, ReactionEmoji } from '@/data/types';

export interface ReactionBarProps {
  story: Story;
  onReacted?: () => void;
}

export function ReactionBar({ story, onReacted }: ReactionBarProps) {
  const theme = useTheme();
  const react = useReact();

  const [localCount, setLocalCount] = useState(story.reaction_count);
  const [localMine, setLocalMine] = useState<ReactionEmoji[]>(story.my_reactions);

  // Compute per-emoji counts from story data (simplified: show total divided indicator)
  // Full per-emoji counts would require joining emoji-level aggregates — use total for now
  const totalPerEmoji = (emoji: ReactionEmoji) => {
    // We only have total reaction_count, not per-emoji breakdown.
    // Show count only on active chips (ones the user has reacted with).
    return localMine.includes(emoji) ? 1 : 0;
  };

  const handleReact = async (emoji: ReactionEmoji) => {
    const hadIt = localMine.includes(emoji);
    // Optimistic update
    if (hadIt) {
      setLocalMine((prev) => prev.filter((e) => e !== emoji));
      setLocalCount((prev) => prev - 1);
    } else {
      setLocalMine((prev) => [...prev, emoji]);
      setLocalCount((prev) => prev + 1);
    }
    try {
      await react(story.id, emoji);
      onReacted?.();
    } catch {
      // Revert on error
      if (hadIt) {
        setLocalMine((prev) => [...prev, emoji]);
        setLocalCount((prev) => prev + 1);
      } else {
        setLocalMine((prev) => prev.filter((e) => e !== emoji));
        setLocalCount((prev) => prev - 1);
      }
    }
  };

  return (
    <View style={styles.wrap}>
      {REACTIONS.map((r) => {
        const active = localMine.includes(r.emoji);
        return (
          <Pressable
            key={r.emoji}
            onPress={() => handleReact(r.emoji)}
            style={[
              styles.chip,
              { backgroundColor: active ? theme.accent : 'rgba(245,230,200,0.08)' },
            ]}
          >
            <Text style={styles.icon}>{r.icon}</Text>
            {active && (
              <Text style={[styles.count, { color: '#2a1f0a' }]}>·</Text>
            )}
          </Pressable>
        );
      })}
      {localCount > 0 && (
        <Text style={[styles.total, { color: theme.textMuted }]}>{localCount}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  count: { fontSize: 11, fontWeight: '600' },
  icon: { fontSize: 14 },
  total: { fontSize: 12, marginLeft: 4, alignSelf: 'center' },
  wrap: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});
```

---

### Task 9: FlagSheet component

**Files:**
- Create: `src/reactions/FlagSheet.tsx`

- [ ] **Step 1: Create FlagSheet**

```typescript
// src/reactions/FlagSheet.tsx
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useFlag } from './useFlag';

const REASONS = [
  'Harmful or dangerous',
  'Sexual or explicit',
  'Spam',
  'Harassment',
  'Other',
];

export interface FlagSheetProps {
  storyId: string;
  onClose: () => void;
}

export function FlagSheet({ storyId, onClose }: FlagSheetProps) {
  const theme = useTheme();
  const flag = useFlag();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFlag = async (reason: string) => {
    setLoading(true);
    try {
      await flag(storyId, reason);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface }]}>
      {done ? (
        <Text style={[styles.thanks, { color: theme.textPrimary }]}>
          Thanks for letting us know.
        </Text>
      ) : loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Report this sulat</Text>
            <Pressable onPress={onClose} style={styles.closeHitbox}>
              <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>
          {REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => handleFlag(reason)}
              style={[styles.row, { borderBottomColor: 'rgba(245,230,200,0.08)' }]}
            >
              <Text style={[styles.reason, { color: theme.textPrimary }]}>{reason}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  reason: { fontSize: 14, paddingVertical: 12 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth },
  thanks: { fontSize: 15, paddingVertical: 16, textAlign: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  wrap: { borderRadius: 14, padding: 14 },
});
```

---

### Task 10: Update StorySheet — add ReactionBar + flag button + FlagSheet

**Files:**
- Modify: `src/story/StorySheet.tsx`

- [ ] **Step 1: Replace StorySheet.tsx**

```typescript
// src/story/StorySheet.tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { ReactionBar } from '@/reactions/ReactionBar';
import { FlagSheet } from '@/reactions/FlagSheet';
import type { Story } from '@/data/types';

export interface StorySheetProps {
  story: Story;
  onClose: () => void;
  onReacted?: () => void;
  bottomOffset?: number;
}

export function StorySheet({ story, onClose, onReacted, bottomOffset = 0 }: StorySheetProps) {
  const theme = useTheme();
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  const [flagOpen, setFlagOpen] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Location header */}
      <View style={styles.locationRow}>
        <Text style={[styles.locationPin, { color: theme.accent }]}>📍</Text>
        <Text style={[styles.locationLabel, { color: theme.textMuted }]}>
          {story.location_label ? story.location_label.toUpperCase() : 'SOMEWHERE'}
        </Text>
        <Pressable onPress={() => setFlagOpen((v) => !v)} style={styles.flagHitbox}>
          <Text style={[styles.flagTxt, { color: flagOpen ? theme.accent : theme.textMuted }]}>⚑</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {flagOpen ? (
        <FlagSheet storyId={story.id} onClose={() => setFlagOpen(false)} />
      ) : (
        <>
          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyWrap}
          >
            <Text
              style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}
              numberOfLines={4}
            >
              {story.body}
            </Text>
          </ScrollView>

          {/* Reactions */}
          <ReactionBar story={story} onReacted={onReacted} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTxt, { color: theme.textMuted }]}>
              {mood?.emoji}  {mood?.name}  ·  {timeLabel}
            </Text>
            {story.is_memory && (
              <Text style={[styles.memoryBadge, { color: theme.pinMemory.body }]}>✦ memory</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  bodyWrap: { paddingBottom: 4 },
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    maxHeight: 280,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  closeHitbox: { padding: 4 },
  closeTxt: { fontSize: 14 },
  flagHitbox: { marginLeft: 'auto', padding: 4 },
  flagTxt: { fontSize: 13 },
  footer: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  footerTxt: { fontSize: 12 },
  locationLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  locationPin: { fontSize: 11, marginRight: 4 },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 10 },
  memoryBadge: { fontSize: 11, fontStyle: 'italic', marginLeft: 10 },
});
```

- [ ] **Step 2: Wire onReacted in app/index.tsx**

In `app/index.tsx`, update the `StorySheet` usage to pass `onReacted`:

```typescript
{selectedStory && (
  <StorySheet
    story={selectedStory}
    onClose={() => setSelectedStory(null)}
    onReacted={() => setRefreshKey((k) => k + 1)}
    bottomOffset={NAV_HEIGHT + 10}
  />
)}
```

---

### Task 11: Update PinMarker — dynamic glow tiers

**Files:**
- Modify: `src/map/PinMarker.tsx`

- [ ] **Step 1: Add reactionCount prop and glow tier logic**

```typescript
// src/map/PinMarker.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
  reactionCount?: number;
}

function getGlowTier(count: number): { opacityRange: [number, number]; scaleRange: [number, number]; duration: number } {
  if (count >= 20) return { opacityRange: [0.50, 0.85], scaleRange: [1.00, 1.45], duration: 2800 };
  if (count >= 5)  return { opacityRange: [0.35, 0.65], scaleRange: [0.92, 1.28], duration: 4000 };
  return                  { opacityRange: [0.22, 0.52], scaleRange: [0.88, 1.14], duration: 5600 };
}

export function PinMarker({ mood, isMemory, reactionCount = 0 }: PinMarkerProps) {
  const theme = useTheme();
  const moodEntry = getMoodById(mood);
  const tokens = isMemory ? theme.pinMemory : theme.pin;
  const tier = getGlowTier(reactionCount);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: tier.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: tier.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, tier.duration]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: tier.opacityRange });
  const glowScale  = pulse.interpolate({ inputRange: [0, 1], outputRange: tier.scaleRange });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: tokens.glow,
            shadowColor: tokens.glow,
            opacity: glowOpacity,
            transform: [{ scaleX: glowScale }, { scaleY: glowScale }],
          },
        ]}
      />
      <View style={[styles.pin, { backgroundColor: theme.background, borderColor: tokens.body, shadowColor: tokens.glow }]}>
        <Text style={styles.emoji}>{moodEntry?.emoji ?? '·'}</Text>
      </View>
      {isMemory && <Text style={styles.decoration}>{theme.pinMemory.decoration}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  decoration: { color: '#d0b8ff', fontSize: 10, position: 'absolute', right: -4, top: -4 },
  emoji: { fontSize: 13 },
  glow: {
    borderRadius: 40,
    bottom: -14,
    height: 56,
    left: -22,
    position: 'absolute',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    width: 72,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 2,
    elevation: 4,
    height: 26,
    justifyContent: 'center',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 26,
  },
  wrap: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
});
```

---

### Task 12: Update StoryPins — pass reactionCount to PinMarker

**Files:**
- Modify: `src/map/StoryPins.tsx`

- [ ] **Step 1: Add reactionCount prop to PinMarker call**

In `src/map/StoryPins.tsx`, find the PinMarker usage and add `reactionCount`:

```typescript
// Replace the existing PinMarker line (around line 57-58):
<Pressable onPress={() => onSelect(story)}>
  <PinMarker
    mood={story.mood}
    isMemory={story.is_memory}
    reactionCount={story.reaction_count}
  />
</Pressable>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cozy-map-app
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and smoke test**

```bash
cd cozy-map-app
npm run web
```

1. Open `http://localhost:8081`
2. Tap a story pin → StorySheet opens showing 6 reaction chips
3. Tap 🕯️ → chip highlights amber, total count increments
4. Tap 🕯️ again → chip dims, count decrements (toggle off)
5. Tap ⚑ → FlagSheet opens with 5 reason options
6. Tap "Spam" → "Thanks for letting us know." appears, sheet closes after 1.5s
7. Open Supabase dashboard → reactions table shows new row, flags table shows new row

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: plan 2a — reactions, flagging, dynamic pin glow"
```
