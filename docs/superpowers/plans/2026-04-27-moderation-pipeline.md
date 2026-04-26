# Sulat — Plan 2: Moderation Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire a three-layer safety system so every story and reply is screened for harmful content and crisis language before it goes live.

**Architecture:** Layer 1 is a client-side keyword tripwire (zero cost, zero latency) that shows a hotline overlay and gates the post. Layers 2a/2b live inside the existing Supabase Edge Functions (`create-story`, `post-reply`) using a shared Deno module that calls OpenAI `/moderations` first, then Anthropic Haiku only for crisis-flagged posts. All verdicts are written to the existing `moderation_events` table. Community flagging (`flag-story`) is already built and is not touched here.

**Tech Stack:** TypeScript (client), Deno (edge functions), OpenAI `/moderations` API, Anthropic Messages API (`claude-haiku-4-5`), Supabase Edge Functions shared module pattern (`_shared/`), React Native `Modal`, `Linking`.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/moderation/crisisTripwire.ts` | **Create** | Phrase list + `checkCrisis(text): boolean` |
| `src/moderation/__tests__/crisisTripwire.test.ts` | **Create** | Unit tests for tripwire |
| `src/moderation/HotlineOverlay.tsx` | **Create** | Modal: "Someone sees you" + two CTA buttons |
| `src/moderation/__tests__/HotlineOverlay.test.tsx` | **Create** | Render + interaction tests |
| `supabase/functions/_shared/moderate.ts` | **Create** | Shared Deno module: Layer 2a (OpenAI) + Layer 2b (Haiku) |
| `supabase/migrations/20260427000003_stories_crisis_note.sql` | **Create** | Add `has_crisis_note` column to stories |
| `supabase/functions/create-story/index.ts` | **Modify** | Call moderateContent before insert; set `has_crisis_note` |
| `supabase/functions/post-reply/index.ts` | **Modify** | Call moderateContent (Layer 2a only) before insert |
| `src/data/useCreateStory.ts` | **Modify** | Add `crisisHint?: boolean` arg; extract 422 message |
| `src/compose/ComposeSheet.tsx` | **Modify** | Run tripwire on post; show HotlineOverlay |
| `src/compose/__tests__/ComposeSheet.test.tsx` | **Modify** | Add crisis overlay test |
| `src/replies/usePostReply.ts` | **Modify** | Extract 422 message from edge function |
| `src/replies/ReplyInput.tsx` | **Modify** | Run tripwire on send; show HotlineOverlay |
| `src/data/types.ts` | **Modify** | Add `has_crisis_note: boolean` to `Story` |
| `src/story/StoryView.tsx` | **Modify** | Show quiet hotline note if `story.has_crisis_note` |

---

## Task 1: Crisis Keyword Tripwire

**Files:**
- Create: `src/moderation/crisisTripwire.ts`
- Create: `src/moderation/__tests__/crisisTripwire.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/moderation/__tests__/crisisTripwire.test.ts
import { checkCrisis } from '../crisisTripwire';

// English — explicit
test('detects "kill myself"', () => expect(checkCrisis('I want to kill myself')).toBe(true));
test('detects "want to die"', () => expect(checkCrisis("I don't want to die")).toBe(true));
test('detects "end it all"', () => expect(checkCrisis('I just want to end it all')).toBe(true));
test('detects "suicidal"', () => expect(checkCrisis("I've been feeling suicidal lately")).toBe(true));
test('detects "better off dead"', () => expect(checkCrisis('everyone would be better off dead')).toBe(true));
test('detects "no reason to live"', () => expect(checkCrisis('there is no reason to live anymore')).toBe(true));
test('detects "take my own life"', () => expect(checkCrisis('thinking about taking my own life')).toBe(true));
// Filipino — explicit
test('detects "magpapakamatay"', () => expect(checkCrisis('magpapakamatay na ako')).toBe(true));
test('detects "ayoko na mabuhay"', () => expect(checkCrisis('ayoko na mabuhay')).toBe(true));
test('detects "tatapusin ko na"', () => expect(checkCrisis('tatapusin ko na ang lahat')).toBe(true));
test('detects "gusto ko nang mamatay"', () => expect(checkCrisis('gusto ko nang mamatay')).toBe(true));
test('detects "patayin ko na ang sarili"', () => expect(checkCrisis('patayin ko na ang sarili ko')).toBe(true));
// Case insensitive
test('is case-insensitive', () => expect(checkCrisis('Kill Myself')).toBe(true));
test('is case-insensitive Filipino', () => expect(checkCrisis('MAGPAPAKAMATAY')).toBe(true));
// Safe phrases — must not fire
test('does not flag safe text', () => expect(checkCrisis('I want to live my best life')).toBe(false));
test('does not flag empty string', () => expect(checkCrisis('')).toBe(false));
test('does not flag normal struggle', () => expect(checkCrisis("I've been having a rough week")).toBe(false));
test('does not flag "die hard fan"', () => expect(checkCrisis('I am a die hard fan')).toBe(false));
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest crisisTripwire --no-coverage
```
Expected: FAIL — "Cannot find module '../crisisTripwire'"

- [ ] **Step 3: Implement `crisisTripwire.ts`**

```ts
// src/moderation/crisisTripwire.ts

const CRISIS_PHRASES: readonly string[] = [
  // English — explicit
  'kill myself', 'killing myself',
  'want to die', 'wanting to die',
  'end my life', 'ending my life',
  'end it all',
  'no reason to live', 'nothing to live for',
  'better off dead', 'better off without me',
  'take my own life', 'taking my own life',
  'commit suicide', 'committing suicide',
  'suicidal',
  // English — metaphorical / code-switched
  'permanent solution to a temporary',
  'final goodbye',
  'saying goodbye forever',
  // Filipino — explicit
  'magpapakamatay', 'magpapatiwakal',
  'ayoko na mabuhay', 'ayaw ko na mabuhay',
  'wala nang silbi ang buhay', 'walang silbi ang buhay',
  'tatapusin ko na ang', 'tapusin ko na ang',
  'gusto ko nang mamatay',
  'hindi na ako mahalaga',
  'patayin ko na ang sarili',
  // Code-switched
  'mag-suicide na', 'mag suicide na',
];

export function checkCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest crisisTripwire --no-coverage
```
Expected: 18 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/moderation/crisisTripwire.ts src/moderation/__tests__/crisisTripwire.test.ts
git commit -m "feat: crisis keyword tripwire — Layer 1 client-side safety check"
```

---

## Task 2: HotlineOverlay Component

**Files:**
- Create: `src/moderation/HotlineOverlay.tsx`
- Create: `src/moderation/__tests__/HotlineOverlay.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/moderation/__tests__/HotlineOverlay.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HotlineOverlay } from '../HotlineOverlay';

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    surface: '#1c1910',
    textPrimary: '#f0dfa8',
    textMuted: 'rgba(240,223,168,0.4)',
    accent: '#f4c97a',
    background: '#0d0b09',
  }),
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return { ...actual, Linking: { openURL: jest.fn().mockResolvedValue(undefined) } };
});

test('renders title and both buttons when visible', () => {
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  expect(getByText('Someone sees you 🕯️')).toBeTruthy();
  expect(getByText('Get help now')).toBeTruthy();
  expect(getByText('Continue posting')).toBeTruthy();
  expect(getByText('Hopeline PH')).toBeTruthy();
  expect(getByText('0917-558-4673')).toBeTruthy();
});

test('returns null when not visible', () => {
  const { queryByText } = render(
    <HotlineOverlay visible={false} onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  expect(queryByText('Someone sees you 🕯️')).toBeNull();
});

test('calls onContinue when Continue posting pressed', () => {
  const onContinue = jest.fn();
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={onContinue} />,
  );
  fireEvent.press(getByText('Continue posting'));
  expect(onContinue).toHaveBeenCalledTimes(1);
});

test('calls onGetHelp when Get help now pressed', () => {
  const onGetHelp = jest.fn();
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={onGetHelp} onContinue={jest.fn()} />,
  );
  fireEvent.press(getByText('Get help now'));
  expect(onGetHelp).toHaveBeenCalledTimes(1);
});

test('opens Hopeline tel link when Get help now pressed', () => {
  const { Linking } = require('react-native');
  const { getByText } = render(
    <HotlineOverlay visible onGetHelp={jest.fn()} onContinue={jest.fn()} />,
  );
  fireEvent.press(getByText('Get help now'));
  expect(Linking.openURL).toHaveBeenCalledWith('tel:09175584673');
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest HotlineOverlay --no-coverage
```
Expected: FAIL — "Cannot find module '../HotlineOverlay'"

- [ ] **Step 3: Implement `HotlineOverlay.tsx`**

```tsx
// src/moderation/HotlineOverlay.tsx
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

const PH_HOTLINE = {
  name: 'Hopeline PH',
  number: '0917-558-4673',
  tel: 'tel:09175584673',
};

const GLOBAL_FALLBACK_URL = 'https://www.befrienders.org';

export interface HotlineOverlayProps {
  visible: boolean;
  onGetHelp: () => void;
  onContinue: () => void;
}

export function HotlineOverlay({ visible, onGetHelp, onContinue }: HotlineOverlayProps) {
  const theme = useTheme();

  if (!visible) return null;

  const handleGetHelp = () => {
    Linking.openURL(PH_HOTLINE.tel).catch(() => {
      Linking.openURL(GLOBAL_FALLBACK_URL);
    });
    onGetHelp();
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Someone sees you 🕯️
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            It sounds like you might be going through something heavy. You
            don't have to carry it alone.
          </Text>
          <View style={[styles.hotlineBox, { borderColor: theme.accent }]}>
            <Text style={[styles.hotlineName, { color: theme.accent }]}>
              {PH_HOTLINE.name}
            </Text>
            <Text style={[styles.hotlineNumber, { color: theme.textPrimary }]}>
              {PH_HOTLINE.number}
            </Text>
          </View>
          <Pressable
            style={[styles.btn, { backgroundColor: theme.accent }]}
            onPress={handleGetHelp}
          >
            <Text style={[styles.btnPrimaryTxt, { color: theme.background }]}>
              Get help now
            </Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={onContinue}>
            <Text style={[styles.btnSecondaryTxt, { color: theme.textMuted }]}>
              Continue posting
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  btnPrimaryTxt: { fontSize: 15, fontWeight: '600' },
  btnSecondary: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
  },
  btnSecondaryTxt: { fontSize: 13 },
  card: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  hotlineBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hotlineName: { fontSize: 11, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase' },
  hotlineNumber: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest HotlineOverlay --no-coverage
```
Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/moderation/HotlineOverlay.tsx src/moderation/__tests__/HotlineOverlay.test.tsx
git commit -m "feat: HotlineOverlay — crisis support modal with Hopeline PH"
```

---

## Task 3: Shared Deno Moderation Module

**Files:**
- Create: `supabase/functions/_shared/moderate.ts`

> Note: This is Deno code used by edge functions. It is not covered by Jest. Verification is done via the edge function smoke test in Tasks 4 & 5.

- [ ] **Step 1: Create the `_shared` directory and write `moderate.ts`**

```ts
// supabase/functions/_shared/moderate.ts

export type ModerationVerdict =
  | 'pass'       // clean content, post it
  | 'reject'     // OpenAI flagged it — do not post
  | 'crisis'     // Anthropic: person in immediate crisis
  | 'processing' // Anthropic: person struggling but not in immediate crisis
  | 'metaphor';  // Anthropic: figurative language, safe

export interface ModerationResult {
  verdict: ModerationVerdict;
  service: string;
  crisisScore: number | null;
}

/** Layer 2a: OpenAI /moderations */
async function runOpenAIMod(
  text: string,
  openaiKey: string,
): Promise<{ flagged: boolean }> {
  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ input: text }),
  });
  if (!res.ok) throw new Error(`OpenAI moderation error: ${res.status}`);
  const json = (await res.json()) as { results: { flagged: boolean }[] };
  return { flagged: json.results[0]?.flagged ?? false };
}

/** Layer 2b: Anthropic Haiku crisis classification */
async function runHaikuCrisis(
  text: string,
  anthropicKey: string,
): Promise<'crisis' | 'processing' | 'metaphor'> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content:
            'Is this person currently in crisis or distress where they need immediate support? ' +
            'Reply with exactly one word: "crisis", "processing", or "metaphor".\n\nText: ' +
            text,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const json = (await res.json()) as { content: { text: string }[] };
  const raw = json.content[0]?.text?.toLowerCase().trim() ?? '';
  if (raw.includes('crisis')) return 'crisis';
  if (raw.includes('processing')) return 'processing';
  return 'metaphor';
}

/**
 * Run the moderation pipeline.
 *
 * crisisHint = false → Layer 2a only (OpenAI).
 * crisisHint = true  → Layer 2b (OpenAI then Anthropic Haiku).
 *
 * Fails open: if an API call throws, returns verdict:'pass' so a
 * temporary third-party outage never blocks legitimate posts.
 */
export async function moderateContent(
  text: string,
  crisisHint: boolean,
): Promise<ModerationResult> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

  try {
    const { flagged } = await runOpenAIMod(text, openaiKey);
    if (flagged) return { verdict: 'reject', service: 'openai', crisisScore: null };
  } catch {
    // Fail open on OpenAI outage
    return { verdict: 'pass', service: 'openai_error', crisisScore: null };
  }

  if (!crisisHint) {
    return { verdict: 'pass', service: 'openai', crisisScore: null };
  }

  try {
    const haiku = await runHaikuCrisis(text, anthropicKey);
    const score = haiku === 'crisis' ? 1 : haiku === 'processing' ? 0.5 : 0;
    return { verdict: haiku, service: 'anthropic', crisisScore: score };
  } catch {
    // Fail open on Anthropic outage — post goes through without note
    return { verdict: 'pass', service: 'anthropic_error', crisisScore: null };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/_shared/moderate.ts
git commit -m "feat: shared Deno moderation module — Layer 2a (OpenAI) + Layer 2b (Anthropic Haiku)"
```

---

## Task 4: Wire Moderation into `create-story` Edge Function

**Files:**
- Create: `supabase/migrations/20260427000003_stories_crisis_note.sql`
- Modify: `supabase/functions/create-story/index.ts`

The `has_crisis_note` column lets `StoryView` know to show a quiet hotline footnote when the Anthropic verdict was `crisis` or `processing`.

- [ ] **Step 1: Write and apply the migration**

Create the file:

```sql
-- supabase/migrations/20260427000003_stories_crisis_note.sql
alter table public.stories
  add column has_crisis_note boolean not null default false;
```

Apply it:
```bash
npx supabase db push
```
Expected output includes: `Applying migration 20260427000003_stories_crisis_note.sql`

- [ ] **Step 2: Rewrite `create-story/index.ts`**

Replace the entire file with:

```ts
// supabase/functions/create-story/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { moderateContent } from '../_shared/moderate.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateStoryBody {
  mood: string;
  body: string;
  lat: number;
  lng: number;
  pin_mode: 'gps' | 'dropped' | 'city';
  location_label?: string | null;
  language?: string | null;
  card_style?: string | null;
  crisis_hint?: boolean;
}

const VALID_MOODS = new Set([
  'regret', 'on_my_mind', 'struggling', 'hopeful',
  'memory', 'dream', 'unsent_letter', 'forgiveness',
]);
const VALID_PIN_MODES = new Set(['gps', 'dropped', 'city']);
const VALID_CARD_STYLE_RE = /^[a-z0-9_]{1,32}$/;

const GRID = 0.0045;
function round500m(n: number) { return Math.round(n / GRID) * GRID; }

const REJECTION_MSG =
  "This story didn't pass our quiet-space check. If you think this was a mistake, revise your story and try again.";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: CreateStoryBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!VALID_MOODS.has(payload.mood))
    return new Response('Invalid mood', { status: 400, headers: cors });
  if (!VALID_PIN_MODES.has(payload.pin_mode))
    return new Response('Invalid pin_mode', { status: 400, headers: cors });
  if (typeof payload.body !== 'string' || payload.body.length < 1 || payload.body.length > 1000)
    return new Response('Body length must be 1..1000 chars', { status: 400, headers: cors });
  if (typeof payload.lat !== 'number' || typeof payload.lng !== 'number')
    return new Response('Invalid coordinates', { status: 400, headers: cors });

  const cardStyle =
    typeof payload.card_style === 'string' && VALID_CARD_STYLE_RE.test(payload.card_style)
      ? payload.card_style
      : 'a';

  const crisisHint = payload.crisis_hint === true;

  // ── Moderation ───────────────────────────────────────────────────────────
  const modResult = await moderateContent(payload.body, crisisHint);

  if (modResult.verdict === 'reject') {
    return new Response(JSON.stringify({ error: REJECTION_MSG }), {
      status: 422,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // has_crisis_note = true when Anthropic classified as crisis or processing
  const hasCrisisNote = modResult.verdict === 'crisis' || modResult.verdict === 'processing';

  // ── Auth ─────────────────────────────────────────────────────────────────
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const lat = round500m(payload.lat);
  const lng = round500m(payload.lng);

  // ── Insert ────────────────────────────────────────────────────────────────
  const insert = await supa.from('stories').insert({
    author_id: authUser.user.id,
    mood: payload.mood,
    body: payload.body,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    location_label: payload.location_label ?? null,
    pin_mode: payload.pin_mode,
    language: payload.language ?? 'en',
    card_style: cardStyle,
    status: 'live',
    has_crisis_note: hasCrisisNote,
  }).select('id').single();

  if (insert.error) return new Response(insert.error.message, { status: 400, headers: cors });

  // ── Audit log ─────────────────────────────────────────────────────────────
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  await serviceSupa.from('moderation_events').insert({
    target_type: 'story',
    target_id: insert.data.id,
    verdict: modResult.verdict,
    service: modResult.service,
    crisis_score: modResult.crisisScore,
    metadata: { crisis_hint: crisisHint },
  });

  return new Response(JSON.stringify({ id: insert.data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Add required secrets to Supabase (do this once)**

```bash
npx supabase secrets set OPENAI_API_KEY=<your-key>
npx supabase secrets set ANTHROPIC_API_KEY=<your-key>
```

- [ ] **Step 4: Deploy edge function**

```bash
npx supabase functions deploy create-story
```
Expected: `Deployed create-story`

- [ ] **Step 5: Smoke test — clean post passes**

```bash
# Get your anon JWT first from the Supabase dashboard → API → anon key
curl -X POST https://<your-project>.supabase.co/functions/v1/create-story \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"mood":"hopeful","body":"Today felt a little lighter.","lat":14.6,"lng":120.9,"pin_mode":"gps"}'
```
Expected: `{"id":"<uuid>"}` with HTTP 201.

- [ ] **Step 6: Smoke test — harmful content is rejected**

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/create-story \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"mood":"on_my_mind","body":"I hate [slur]","lat":14.6,"lng":120.9,"pin_mode":"gps"}'
```
Expected: HTTP 422 with `{"error":"This story didn't pass our quiet-space check..."}`

- [ ] **Step 7: Smoke test — crisis hint triggers Layer 2b**

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/create-story \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"mood":"struggling","body":"I have been feeling very low lately, processing grief","lat":14.6,"lng":120.9,"pin_mode":"gps","crisis_hint":true}'
```
Expected: HTTP 201 with an id. Verify in Supabase dashboard → `moderation_events` table: a row exists with `service = 'anthropic'` and `verdict = 'processing'` or `'metaphor'`.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260427000003_stories_crisis_note.sql \
        supabase/functions/create-story/index.ts
git commit -m "feat: moderation pipeline wired into create-story — Layer 2a + 2b + audit log"
```

---

## Task 5: Wire Moderation into `post-reply` Edge Function

**Files:**
- Modify: `supabase/functions/post-reply/index.ts`

Replies use Layer 1 + 2a only (no Anthropic Haiku — the spec says Layer 2b is not typically needed for replies).

- [ ] **Step 1: Rewrite `post-reply/index.ts`**

Replace the entire file:

```ts
// supabase/functions/post-reply/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { moderateContent } from '../_shared/moderate.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REJECTION_MSG =
  "This reply didn't pass our quiet-space check. If you think this was a mistake, revise it and try again.";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  let payload: { story_id: string; body: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400, headers: cors });
  }

  if (!payload.story_id || !UUID_RE.test(payload.story_id))
    return new Response('Invalid story_id', { status: 400, headers: cors });

  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!body || body.length > 300)
    return new Response('body must be 1–300 chars', { status: 400, headers: cors });

  // ── Moderation (Layer 2a only for replies) ───────────────────────────────
  const modResult = await moderateContent(body, false);

  if (modResult.verdict === 'reject') {
    return new Response(JSON.stringify({ error: REJECTION_MSG }), {
      status: 422,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: authUser } = await supa.auth.getUser();
  if (!authUser?.user) return new Response('Unauthorized', { status: 401, headers: cors });

  const { data: story } = await supa
    .from('stories')
    .select('id')
    .eq('id', payload.story_id)
    .eq('status', 'live')
    .maybeSingle();

  if (!story) return new Response('Story not found', { status: 404, headers: cors });

  // ── Insert ────────────────────────────────────────────────────────────────
  const { data, error } = await supa
    .from('replies')
    .insert({ story_id: payload.story_id, author_id: authUser.user.id, body, status: 'live' })
    .select('id')
    .single();

  if (error) return new Response(error.message, { status: 500, headers: cors });

  // ── Audit log ─────────────────────────────────────────────────────────────
  const serviceSupa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  await serviceSupa.from('moderation_events').insert({
    target_type: 'reply',
    target_id: data.id,
    verdict: modResult.verdict,
    service: modResult.service,
    crisis_score: null,
    metadata: {},
  });

  return new Response(JSON.stringify({ id: data.id }), {
    status: 201,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy post-reply
```
Expected: `Deployed post-reply`

- [ ] **Step 3: Smoke test — clean reply passes**

```bash
curl -X POST https://<your-project>.supabase.co/functions/v1/post-reply \
  -H "Authorization: Bearer <anon-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"story_id":"<existing-live-story-uuid>","body":"Sending warmth your way 🕯️"}'
```
Expected: HTTP 201 with `{"id":"<uuid>"}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/post-reply/index.ts
git commit -m "feat: moderation pipeline wired into post-reply — Layer 2a + audit log"
```

---

## Task 6: Update `useCreateStory` + Wire Tripwire into `ComposeSheet`

**Files:**
- Modify: `src/data/useCreateStory.ts`
- Modify: `src/compose/ComposeSheet.tsx`
- Modify: `src/compose/__tests__/ComposeSheet.test.tsx`

- [ ] **Step 1: Add the new crisis overlay test to `ComposeSheet.test.tsx`**

Add these mocks and test at the bottom of the existing `src/compose/__tests__/ComposeSheet.test.tsx`:

```tsx
// Add near the top with other jest.mock calls:
jest.mock('@/moderation/crisisTripwire', () => ({
  checkCrisis: jest.fn(),
}));

jest.mock('@/moderation/HotlineOverlay', () => ({
  HotlineOverlay: ({
    visible,
    onContinue,
  }: {
    visible: boolean;
    onGetHelp: () => void;
    onContinue: () => void;
  }) => {
    const React = require('react');
    const { Text, Pressable } = require('react-native');
    if (!visible) return null;
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Text, null, 'HOTLINE_VISIBLE'),
      React.createElement(Pressable, { onPress: onContinue, testID: 'hotline-continue' },
        React.createElement(Text, null, 'Continue posting'),
      ),
    );
  },
}));
```

Add at the bottom of the test file:

```tsx
test('shows hotline overlay when crisis phrase detected', async () => {
  const { checkCrisis } = require('@/moderation/crisisTripwire');
  (checkCrisis as jest.Mock).mockReturnValue(true);

  const { getByText, getAllByRole, queryByText, UNSAFE_getAllByType } = render(
    <ComposeSheet onClose={jest.fn()} coords={{ lat: 14.6, lng: 120.9 }} />,
  );

  // Fill body via the TextInput inside ComposeCard
  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], 'I want to kill myself');

  // Press Post sulat
  fireEvent.press(getByText('Post sulat'));

  await waitFor(() => {
    expect(getByText('HOTLINE_VISIBLE')).toBeTruthy();
  });
});

test('does not show hotline overlay when no crisis phrase', async () => {
  const { checkCrisis } = require('@/moderation/crisisTripwire');
  (checkCrisis as jest.Mock).mockReturnValue(false);

  const mockCreate = jest.fn().mockResolvedValue('story-xyz');
  jest.mock('@/data/useCreateStory', () => ({ useCreateStory: () => mockCreate }));

  const { queryByText, getByText, UNSAFE_getAllByType } = render(
    <ComposeSheet onClose={jest.fn()} coords={{ lat: 14.6, lng: 120.9 }} />,
  );

  const { TextInput } = require('react-native');
  const inputs = UNSAFE_getAllByType(TextInput);
  fireEvent.changeText(inputs[0], 'feeling hopeful today');

  fireEvent.press(getByText('Post sulat'));

  await waitFor(() => {
    expect(queryByText('HOTLINE_VISIBLE')).toBeNull();
  });
});
```

- [ ] **Step 2: Run new tests to verify they fail**

```bash
npx jest ComposeSheet --no-coverage
```
Expected: existing 2 pass, the 2 new tests FAIL — `checkCrisis is not a function` or similar.

- [ ] **Step 3: Update `useCreateStory.ts`**

Replace the entire file:

```ts
// src/data/useCreateStory.ts
import { supabase } from './supabase';
import type { Mood, PinMode } from './types';
import type { CardStyleId } from '@/story/cardStyles';

export interface CreateStoryArgs {
  mood: Mood;
  body: string;
  coords: { lat: number; lng: number };
  pinMode: PinMode;
  label?: string;
  cardStyle: CardStyleId;
  crisisHint?: boolean;
}

export function useCreateStory() {
  return async function create({
    mood,
    body,
    coords,
    pinMode,
    label,
    cardStyle,
    crisisHint,
  }: CreateStoryArgs): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-story', {
      body: {
        mood,
        body,
        lat: coords.lat,
        lng: coords.lng,
        pin_mode: pinMode,
        location_label: label ?? null,
        card_style: cardStyle,
        crisis_hint: crisisHint ?? false,
      },
    });
    if (error) {
      // Extract the friendly message from the 422 response body
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const json = await ctx.json().catch(() => null);
        if (json?.error) throw new Error(json.error);
      }
      throw new Error(error.message);
    }
    return (data as { id: string }).id;
  };
}
```

- [ ] **Step 4: Update `ComposeSheet.tsx`**

Add these imports after the existing imports:

```tsx
import { checkCrisis } from '@/moderation/crisisTripwire';
import { HotlineOverlay } from '@/moderation/HotlineOverlay';
```

Add `showHotline` state inside the component (after the existing state declarations):

```tsx
const [showHotline, setShowHotline] = useState(false);
```

Replace the existing `handlePost` function with:

```tsx
const handlePost = async (crisisHint = false) => {
  if (!location || !body.trim()) return;

  // Layer 1: client-side crisis tripwire
  if (!crisisHint && checkCrisis(body)) {
    setShowHotline(true);
    return;
  }

  setPosting(true);
  setError(null);
  try {
    await create({
      mood: selectedMood,
      body: body.trim(),
      coords: location,
      pinMode: coords ? 'dropped' : 'gps',
      label: placeLabel ?? undefined,
      cardStyle: selectedStyle,
      crisisHint,
    });
    onClose();
    onPosted?.();
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : 'Something went wrong');
    setPosting(false);
  }
};
```

Add `HotlineOverlay` to the JSX, immediately before the closing `</AnimatedSheet>` tag:

```tsx
<HotlineOverlay
  visible={showHotline}
  onGetHelp={() => setShowHotline(false)}
  onContinue={() => {
    setShowHotline(false);
    handlePost(true);
  }}
/>
```

- [ ] **Step 5: Run all tests to verify they pass**

```bash
npx jest --no-coverage
```
Expected: all tests pass including the 2 new ComposeSheet crisis tests.

- [ ] **Step 6: Commit**

```bash
git add src/data/useCreateStory.ts src/compose/ComposeSheet.tsx \
        src/compose/__tests__/ComposeSheet.test.tsx
git commit -m "feat: wire crisis tripwire + HotlineOverlay into ComposeSheet"
```

---

## Task 7: Wire Tripwire into `ReplyInput` + Update `usePostReply`

**Files:**
- Modify: `src/replies/usePostReply.ts`
- Modify: `src/replies/ReplyInput.tsx`

- [ ] **Step 1: Update `usePostReply.ts`**

Replace the entire file:

```ts
// src/replies/usePostReply.ts
import { supabase } from '@/data/supabase';

export interface PostReplyResult {
  id: string;
}

export function usePostReply() {
  return async function postReply(storyId: string, body: string): Promise<PostReplyResult> {
    const { data, error } = await supabase.functions.invoke('post-reply', {
      body: { story_id: storyId, body },
    });
    if (error) {
      // Extract friendly message from 422 response body
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const json = await ctx.json().catch(() => null);
        if (json?.error) throw new Error(json.error);
      }
      throw new Error(error.message);
    }
    return data as PostReplyResult;
  };
}
```

- [ ] **Step 2: Update `ReplyInput.tsx`**

Replace the entire file:

```tsx
// src/replies/ReplyInput.tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { checkCrisis } from '@/moderation/crisisTripwire';
import { HotlineOverlay } from '@/moderation/HotlineOverlay';

const MAX_CHARS = 300;

export interface ReplyInputProps {
  onSubmit: (body: string) => Promise<void>;
}

export function ReplyInput({ onSubmit }: ReplyInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHotline, setShowHotline] = useState(false);
  const [pendingBody, setPendingBody] = useState('');

  const isEmpty = draft.trim().length === 0;

  const submitBody = async (body: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(body);
      setDraft('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message :
        typeof e === 'string' ? e :
        'Something went wrong. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = () => {
    if (isEmpty || submitting) return;
    const trimmed = draft.trim();
    // Layer 1: crisis tripwire — show overlay, hold submission
    if (checkCrisis(trimmed)) {
      setPendingBody(trimmed);
      setShowHotline(true);
      return;
    }
    submitBody(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <HotlineOverlay
        visible={showHotline}
        onGetHelp={() => setShowHotline(false)}
        onContinue={() => {
          setShowHotline(false);
          // Replies always use Layer 2a — no crisis_hint needed in edge function
          submitBody(pendingBody);
        }}
      />
      {error ? (
        <Text style={[styles.errorTxt, { color: theme.accent }]}>{error}</Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.background, borderColor: theme.surface, color: theme.textPrimary },
          ]}
          placeholder="leave a reply…"
          placeholderTextColor={theme.textMuted}
          value={draft}
          onChangeText={(t) => {
            setDraft(t.slice(0, MAX_CHARS));
            setError(null);
          }}
          editable={!submitting}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: (isEmpty || submitting) ? 0.4 : 1 }]}
          onPress={handleSend}
          disabled={submitting || isEmpty}
        >
          {submitting ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <Text style={[styles.sendTxt, { color: theme.background }]}>{'↑'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorTxt: { fontSize: 12, marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  sendBtn: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sendTxt: { fontSize: 16, fontWeight: '700' },
  wrap: { marginTop: 8 },
});
```

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass, 0 fail.

- [ ] **Step 4: Commit**

```bash
git add src/replies/usePostReply.ts src/replies/ReplyInput.tsx
git commit -m "feat: wire crisis tripwire + HotlineOverlay into ReplyInput"
```

---

## Task 8: `Story` Type + `StoryView` Crisis Note UI

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/story/StoryView.tsx`

- [ ] **Step 1: Add `has_crisis_note` to `Story` type**

In `src/data/types.ts`, add `has_crisis_note` to the `Story` interface after `is_memory`:

```ts
export interface Story {
  id: string;
  author_id: string;
  mood: Mood;
  body: string;
  card_style: CardStyleId;
  location: { type: 'Point'; coordinates: [number, number] };
  location_label: string | null;
  pin_mode: PinMode;
  language: string;
  status: StoryStatus;
  is_memory: boolean;
  has_crisis_note: boolean;    // ← add this line
  created_at: string;
  reaction_count: number;
  reaction_counts: Partial<Record<ReactionEmoji, number>>;
  my_reactions: ReactionEmoji[];
  reply_count: number;
}
```

- [ ] **Step 2: Read the current `StoryView.tsx` to find where to add the note**

Run: `cat -n src/story/StoryView.tsx`

Find the bottom of the story body display area (below the `<StoryCard>` render and before the reactions/replies section).

- [ ] **Step 3: Add the crisis note to `StoryView.tsx`**

Import `Linking` at the top if not already present:

```tsx
import { ..., Linking } from 'react-native';
```

Add this component inline in `StoryView.tsx` (or as a local const before the return):

```tsx
{story.has_crisis_note && (
  <View style={styles.crisisNote}>
    <Text style={[styles.crisisNoteText, { color: theme.textMuted }]}>
      💙 If you're going through something heavy, support is available.
    </Text>
    <Pressable onPress={() => Linking.openURL('tel:09175584673')}>
      <Text style={[styles.crisisNoteLink, { color: theme.accent }]}>
        Hopeline PH · 0917-558-4673
      </Text>
    </Pressable>
  </View>
)}
```

Add these styles to the StyleSheet in `StoryView.tsx`:

```tsx
crisisNote: {
  borderTopColor: 'rgba(244,201,122,0.08)',
  borderTopWidth: 1,
  marginTop: 12,
  paddingTop: 12,
},
crisisNoteText: {
  fontSize: 12,
  lineHeight: 18,
  marginBottom: 4,
},
crisisNoteLink: {
  fontSize: 12,
  fontWeight: '600',
},
```

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass.

- [ ] **Step 5: Push migration and deploy**

```bash
npx supabase db push
git add src/data/types.ts src/story/StoryView.tsx
git commit -m "feat: show quiet hotline note on stories with has_crisis_note flag"
```

- [ ] **Step 6: Push to GitHub and verify Vercel redeploys**

```bash
git push origin main
```

Open https://sulat.vercel.app — the app should load. Post a test story with a normal phrase: no overlay. Post a story containing "ayoko na mabuhay": HotlineOverlay appears. Press "Continue posting" — story posts. Open it in StoryView — the crisis note appears at the bottom.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Layer 1: client-side crisis keyword tripwire | Task 1, 6, 7 |
| Tripwire: English + Filipino phrases | Task 1 |
| If matched → post takes Layer 2b instead of 2a | Task 6 (`crisisHint` flag) |
| Layer 2a: OpenAI /moderations for standard posts | Task 3, 4, 5 |
| Reject → "didn't pass quiet-space check" message | Task 4, 5 |
| Audit row in `moderation_events` | Task 4, 5 |
| Layer 2b: OpenAI + Anthropic Haiku for crisis | Task 3, 4 |
| Anthropic returns crisis/processing/metaphor | Task 3 |
| crisis/processing → post goes live with soft note | Task 4 (`has_crisis_note`), Task 8 |
| HotlineOverlay: two buttons (get help / continue) | Task 2 |
| "Get help now" opens Hopeline PH tel link | Task 2 |
| Layer 3: community flagging | Already built — not touched |
| Fails open on API error | Task 3 |

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `ModerationVerdict` defined in Task 3 and only used within `_shared/moderate.ts`. `crisisHint: boolean` flows from Task 6 → `useCreateStory` → edge function. `has_crisis_note: boolean` defined in Task 8 types and set in Task 4 edge function — consistent.
