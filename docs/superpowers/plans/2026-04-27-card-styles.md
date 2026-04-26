# Sulat Card Styles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each sulat carry a chosen handwritten-paper style (A–E) stored in the DB and rendered for every viewer, with a per-user default in profile and per-sulat override in compose.

**Architecture:** Config-driven — a `CARD_STYLES` array drives all rendering; `StoryCard` replaces the plain body text block in `StorySheet`; `StylePicker` is a shared swatch row reused in both `ComposeSheet` and `ProfileModal`. Two DB columns: `stories.card_style` and `users.preferred_card_style`.

**Tech Stack:** Expo SDK 54, React Native Web, `expo-linear-gradient`, `expo-font` + `@expo-google-fonts/*`, Supabase (Postgres + Edge Functions), `@testing-library/react-native`.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Create | `src/story/cardStyles.ts` | `CardStyleDef` type, `CARD_STYLES` data, `getCardStyle` helper |
| Create | `src/story/StoryCard.tsx` | Styled card body renderer (gradient bg + handwriting font + decorations) |
| Create | `src/story/StylePicker.tsx` | Horizontal swatch row — reused in Compose + Profile |
| Create | `src/story/__tests__/cardStyles.test.ts` | Unit tests for registry + helper |
| Create | `src/story/__tests__/StoryCard.test.tsx` | Render tests for each style |
| Create | `src/story/__tests__/StylePicker.test.tsx` | Interaction tests for swatch picker |
| Create | `supabase/migrations/20260427000001_stories_card_style.sql` | Add `card_style` column to stories |
| Create | `supabase/migrations/20260427000002_users_preferred_card_style.sql` | Add `preferred_card_style` column to users |
| Modify | `src/data/types.ts` | Add `card_style` to `Story`, `preferred_card_style` to `User` |
| Modify | `src/data/useStories.ts` | Add `card_style` to SELECT |
| Modify | `src/data/useCreateStory.ts` | Add `cardStyle` to `CreateStoryArgs` + invoke body |
| Modify | `supabase/functions/create-story/index.ts` | Accept, validate, insert `card_style` |
| Modify | `src/story/StorySheet.tsx` | Replace body ScrollView with `<StoryCard>` |
| Modify | `src/compose/ComposeSheet.tsx` | Add `StylePicker` + read user preference |
| Modify | `src/profile/ProfileModal.tsx` | Add "your paper style" section for claimed-handle users |
| Modify | `app/_layout.tsx` | Load five handwriting fonts via `useFonts` |

---

## Task 1: Install new packages

**Files:**
- No code files — installs new packages

- [ ] **Step 1: Install packages**

```bash
cd cozy-map-app
npx expo install expo-linear-gradient expo-font \
  @expo-google-fonts/kalam \
  @expo-google-fonts/caveat \
  @expo-google-fonts/dancing-script \
  @expo-google-fonts/patrick-hand \
  @expo-google-fonts/reenie-beanie
```

- [ ] **Step 2: Verify packages appear in package.json**

```bash
grep -E "expo-linear-gradient|expo-font|kalam|caveat|dancing|patrick|reenie" package.json
```

Expected: 7 matching lines.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-linear-gradient, expo-font, and five google handwriting fonts"
```

---

## Task 2: DB migrations

**Files:**
- Create: `supabase/migrations/20260427000001_stories_card_style.sql`
- Create: `supabase/migrations/20260427000002_users_preferred_card_style.sql`

- [ ] **Step 1: Write migration for stories**

Create `supabase/migrations/20260427000001_stories_card_style.sql`:

```sql
ALTER TABLE stories
  ADD COLUMN card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (card_style ~ '^[a-z0-9_]{1,32}$');
```

- [ ] **Step 2: Write migration for users**

Create `supabase/migrations/20260427000002_users_preferred_card_style.sql`:

```sql
ALTER TABLE users
  ADD COLUMN preferred_card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (preferred_card_style ~ '^[a-z0-9_]{1,32}$');
```

- [ ] **Step 3: Apply migrations**

```bash
npx supabase db push
```

Expected: both migrations apply cleanly with no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add card_style to stories and preferred_card_style to users"
```

---

## Task 3: `src/story/cardStyles.ts`

**Files:**
- Create: `src/story/cardStyles.ts`
- Create: `src/story/__tests__/cardStyles.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/story/__tests__/cardStyles.test.ts`:

```ts
import { getCardStyle, CARD_STYLES, DEFAULT_CARD_STYLE } from '../cardStyles';

test('DEFAULT_CARD_STYLE is a', () => {
  expect(DEFAULT_CARD_STYLE).toBe('a');
});

test('getCardStyle returns correct def for known id', () => {
  const def = getCardStyle('b');
  expect(def.id).toBe('b');
  expect(def.label).toBe('Dark Candlelight');
});

test('getCardStyle falls back to style a for unknown id', () => {
  const def = getCardStyle('unknown_xyz');
  expect(def.id).toBe('a');
});

test('CARD_STYLES has exactly 5 entries', () => {
  expect(CARD_STYLES).toHaveLength(5);
});

test('all 5 styles are free tier', () => {
  expect(CARD_STYLES.every((s) => s.tier === 'free')).toBe(true);
});

test('each style has required visual fields', () => {
  for (const style of CARD_STYLES) {
    expect(style.id).toBeTruthy();
    expect(style.label).toBeTruthy();
    expect(style.fontFamily).toBeTruthy();
    expect(style.backgroundColors.length).toBeGreaterThanOrEqual(1);
    expect(typeof style.textColor).toBe('string');
    expect(typeof style.fontSize).toBe('number');
    expect(typeof style.lineHeight).toBe('number');
  }
});

test('getCardStyle(a) has ruledLines true', () => {
  expect(getCardStyle('a').ruledLines).toBe(true);
});

test('getCardStyle(c) has tornTopEdge true', () => {
  expect(getCardStyle('c').tornTopEdge).toBe(true);
});

test('getCardStyle(d) has leftMarginStripe true', () => {
  expect(getCardStyle('d').leftMarginStripe).toBe(true);
});

test('getCardStyle(e) has foldCorner true', () => {
  expect(getCardStyle('e').foldCorner).toBe(true);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest src/story/__tests__/cardStyles.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../cardStyles'"

- [ ] **Step 3: Create `src/story/cardStyles.ts`**

```ts
export type CardStyleId = 'a' | 'b' | 'c' | 'd' | 'e';

export interface CardStyleDef {
  id: CardStyleId;
  label: string;
  tier: 'free' | 'premium';
  backgroundColors: string[];         // 1 item = solid, 2+ = LinearGradient colors
  gradientStart: { x: number; y: number };
  gradientEnd: { x: number; y: number };
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  locationColor: string;
  footerColor: string;
  ruledLines: boolean;
  ruledLineColor: string;
  foldCorner: boolean;
  foldColor: string;
  tornTopEdge: boolean;
  leftMarginStripe: boolean;
  leftMarginColor: string;
  pillFooter: boolean;                // Style B: pill around reply count
  sealFooter: boolean;                // Style C: wax-seal icon
  borderColor: string;                // 'transparent' = no border
  shadowColor: string;
}

export const CARD_STYLES: CardStyleDef[] = [
  {
    id: 'a',
    label: 'Warm Parchment',
    tier: 'free',
    backgroundColors: ['#f7edcc', '#ecddb0', '#f2e5bc'],
    gradientStart: { x: 0.3, y: 0 },
    gradientEnd: { x: 0.7, y: 1 },
    textColor: '#1e1206',
    fontFamily: 'Kalam_400Regular',
    fontSize: 17,
    lineHeight: 32,
    locationColor: '#7a5a1a',
    footerColor: '#7a5a1a',
    ruledLines: true,
    ruledLineColor: 'rgba(160,130,60,0.15)',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.25)',
  },
  {
    id: 'b',
    label: 'Dark Candlelight',
    tier: 'free',
    backgroundColors: ['#1e1508', '#26190c', '#1c1308'],
    gradientStart: { x: 0.25, y: 0 },
    gradientEnd: { x: 0.75, y: 1 },
    textColor: '#f0dfa8',
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    lineHeight: 30,
    locationColor: 'rgba(244,201,122,0.45)',
    footerColor: 'rgba(244,201,122,0.5)',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: true,
    sealFooter: false,
    borderColor: 'rgba(244,201,122,0.12)',
    shadowColor: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'c',
    label: 'Torn Letter',
    tier: 'free',
    backgroundColors: ['#f7edcc', '#ecddb0'],
    gradientStart: { x: 0.3, y: 0 },
    gradientEnd: { x: 0.7, y: 1 },
    textColor: '#1a0e04',
    fontFamily: 'DancingScript_400Regular',
    fontSize: 19,
    lineHeight: 30,
    locationColor: '#8a6820',
    footerColor: '#8a6820',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: true,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: true,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.3)',
  },
  {
    id: 'd',
    label: 'Midnight Journal',
    tier: 'free',
    backgroundColors: ['#0f0c1a', '#0f0c1a'],
    gradientStart: { x: 0, y: 0 },
    gradientEnd: { x: 0, y: 1 },
    textColor: '#e8deff',
    fontFamily: 'PatrickHand_400Regular',
    fontSize: 16,
    lineHeight: 32,
    locationColor: 'rgba(208,184,255,0.5)',
    footerColor: 'rgba(208,184,255,0.5)',
    ruledLines: true,
    ruledLineColor: 'rgba(208,184,255,0.05)',
    foldCorner: false,
    foldColor: 'transparent',
    tornTopEdge: false,
    leftMarginStripe: true,
    leftMarginColor: 'rgba(208,184,255,0.3)',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'rgba(208,184,255,0.15)',
    shadowColor: 'rgba(0,0,0,0.5)',
  },
  {
    id: 'e',
    label: 'Folded Corner',
    tier: 'free',
    backgroundColors: ['#fdf6e4', '#f5e8c4'],
    gradientStart: { x: 0.4, y: 0 },
    gradientEnd: { x: 0.6, y: 1 },
    textColor: '#18100a',
    fontFamily: 'ReenieBeanie_400Regular',
    fontSize: 21,
    lineHeight: 30,
    locationColor: '#9a7030',
    footerColor: '#9a7030',
    ruledLines: false,
    ruledLineColor: 'transparent',
    foldCorner: true,
    foldColor: '#d4b96a',
    tornTopEdge: false,
    leftMarginStripe: false,
    leftMarginColor: 'transparent',
    pillFooter: false,
    sealFooter: false,
    borderColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.2)',
  },
];

export const DEFAULT_CARD_STYLE: CardStyleId = 'a';

export function getCardStyle(id: string): CardStyleDef {
  return CARD_STYLES.find((s) => s.id === id) ?? CARD_STYLES[0];
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest src/story/__tests__/cardStyles.test.ts --no-coverage
```

Expected: PASS — 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/story/cardStyles.ts src/story/__tests__/cardStyles.test.ts
git commit -m "feat: add CARD_STYLES registry with 5 free styles and getCardStyle helper"
```

---

## Task 4: Update types + SELECT strings

**Files:**
- Modify: `src/data/types.ts`
- Modify: `src/data/useStories.ts`

- [ ] **Step 1: Update `src/data/types.ts`**

Current file content at lines 12–38:
```ts
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
  reaction_counts: Partial<Record<ReactionEmoji, number>>;
  my_reactions: ReactionEmoji[];
  reply_count: number;
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

Replace with:
```ts
import type { CardStyleId } from '@/story/cardStyles';

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
  created_at: string;
  reaction_count: number;
  reaction_counts: Partial<Record<ReactionEmoji, number>>;
  my_reactions: ReactionEmoji[];
  reply_count: number;
}

export interface User {
  id: string;
  device_fingerprint: string;
  email: string | null;
  display_handle: string | null;
  preferred_card_style: CardStyleId;
  theme_preference: string;
  banned_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Update SELECT in `src/data/useStories.ts`**

Current line 54:
```ts
const SELECT = 'id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, reactions(emoji, user_id), replies(count)';
```

Replace with:
```ts
const SELECT = 'id, author_id, mood, body, card_style, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, reactions(emoji, user_id), replies(count)';
```

- [ ] **Step 3: TypeScript check — verify no new errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors (Story now has card_style, User has preferred_card_style).

- [ ] **Step 4: Run full test suite to verify no regressions**

```bash
npx jest --no-coverage
```

Expected: all previously passing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/types.ts src/data/useStories.ts
git commit -m "feat: add card_style to Story type and preferred_card_style to User type"
```

---

## Task 5: Update create-story edge function

**Files:**
- Modify: `supabase/functions/create-story/index.ts`

- [ ] **Step 1: Update the edge function**

Current file at `supabase/functions/create-story/index.ts`. Make these changes:

Replace the `CreateStoryBody` interface (lines 11–18):
```ts
interface CreateStoryBody {
  mood: string;
  body: string;
  lat: number;
  lng: number;
  pin_mode: 'gps' | 'dropped' | 'city';
  location_label?: string | null;
  language?: string | null;
  card_style?: string | null;
}
```

Add a `VALID_CARD_STYLES` set and style validation after `VALID_PIN_MODES` (after line 24):
```ts
const VALID_CARD_STYLE_RE = /^[a-z0-9_]{1,32}$/;
```

Add validation after the body length check (after the existing `payload.body` check block):
```ts
  const cardStyle = payload.card_style && VALID_CARD_STYLE_RE.test(payload.card_style)
    ? payload.card_style
    : 'a';
```

Update the INSERT (replace the `supa.from('stories').insert({...})` block):
```ts
  const insert = await supa.from('stories').insert({
    author_id: authUser.user.id,
    mood: payload.mood,
    body: payload.body,
    card_style: cardStyle,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    location_label: payload.location_label ?? null,
    pin_mode: payload.pin_mode,
    language: payload.language ?? 'en',
    status: 'live',
  }).select('id').single();
```

- [ ] **Step 2: Deploy the updated edge function**

```bash
npx supabase functions deploy create-story
```

Expected: deployment succeeds.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/create-story/index.ts
git commit -m "feat: accept card_style in create-story edge function"
```

---

## Task 6: Update `useCreateStory.ts`

**Files:**
- Modify: `src/data/useCreateStory.ts`

- [ ] **Step 1: Write a failing test**

Look for the existing `useCreateStory` test file. If it exists at `src/data/__tests__/useCreateStory.test.ts`, add this test. If the file doesn't exist, create it:

```ts
import { useCreateStory } from '../useCreateStory';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { id: 'story-1' }, error: null }),
    },
  },
}));

test('passes card_style to invoke body', async () => {
  const create = useCreateStory();
  await create({
    mood: 'on_my_mind',
    body: 'test',
    coords: { lat: 14.5, lng: 121.0 },
    pinMode: 'gps',
    cardStyle: 'c',
  });

  expect(supabase.functions.invoke).toHaveBeenCalledWith(
    'create-story',
    expect.objectContaining({
      body: expect.objectContaining({ card_style: 'c' }),
    }),
  );
});
```

- [ ] **Step 2: Run — verify it fails**

```bash
npx jest src/data/__tests__/useCreateStory.test.ts --no-coverage
```

Expected: FAIL — `cardStyle` not in `CreateStoryArgs`

- [ ] **Step 3: Update `src/data/useCreateStory.ts`**

Replace the entire file with:

```ts
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
}

export function useCreateStory() {
  return async function create({ mood, body, coords, pinMode, label, cardStyle }: CreateStoryArgs): Promise<string> {
    const { data, error } = await supabase.functions.invoke('create-story', {
      body: {
        mood,
        body,
        lat: coords.lat,
        lng: coords.lng,
        pin_mode: pinMode,
        location_label: label ?? null,
        card_style: cardStyle,
      },
    });
    if (error) throw new Error(error.message);
    return (data as { id: string }).id;
  };
}

- [ ] **Step 4: Run — verify it passes**

```bash
npx jest src/data/__tests__/useCreateStory.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: TypeScript will now complain that `ComposeSheet` calls `create(...)` without `cardStyle`. That is intentional — Task 10 fixes it.

- [ ] **Step 6: Commit**

```bash
git add src/data/useCreateStory.ts src/data/__tests__/useCreateStory.test.ts
git commit -m "feat: add cardStyle param to useCreateStory"
```

---

## Task 7: `src/story/StoryCard.tsx`

**Files:**
- Create: `src/story/StoryCard.tsx`
- Create: `src/story/__tests__/StoryCard.test.tsx`

`StoryCard` renders the styled paper body (gradient background + decorative elements + body text). It replaces the plain `<ScrollView><Text>` block inside `StorySheet`. It is a pure presentational component — no hooks, no context dependencies.

- [ ] **Step 1: Write failing tests**

Create `src/story/__tests__/StoryCard.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { StoryCard } from '../StoryCard';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      React.createElement(View, { style }, children),
  };
});

test('renders body text for style a', () => {
  const { getByText } = render(<StoryCard body="Hello world" cardStyle="a" />);
  expect(getByText('Hello world')).toBeTruthy();
});

test('renders body text for style b', () => {
  const { getByText } = render(<StoryCard body="candlelight note" cardStyle="b" />);
  expect(getByText('candlelight note')).toBeTruthy();
});

test('renders body text for style c', () => {
  const { getByText } = render(<StoryCard body="torn letter" cardStyle="c" />);
  expect(getByText('torn letter')).toBeTruthy();
});

test('renders body text for style d', () => {
  const { getByText } = render(<StoryCard body="midnight entry" cardStyle="d" />);
  expect(getByText('midnight entry')).toBeTruthy();
});

test('renders body text for style e', () => {
  const { getByText } = render(<StoryCard body="folded note" cardStyle="e" />);
  expect(getByText('folded note')).toBeTruthy();
});

test('applies Kalam font for style a', () => {
  const { getByText } = render(<StoryCard body="hello" cardStyle="a" />);
  const el = getByText('hello');
  const style = Array.isArray(el.props.style)
    ? Object.assign({}, ...el.props.style.flat(Infinity).filter(Boolean))
    : el.props.style;
  expect(style.fontFamily).toBe('Kalam_400Regular');
});

test('applies Caveat font for style b', () => {
  const { getByText } = render(<StoryCard body="hello" cardStyle="b" />);
  const el = getByText('hello');
  const style = Array.isArray(el.props.style)
    ? Object.assign({}, ...el.props.style.flat(Infinity).filter(Boolean))
    : el.props.style;
  expect(style.fontFamily).toBe('Caveat_400Regular');
});

test('falls back to style a for unknown cardStyle', () => {
  // @ts-expect-error — intentionally wrong type
  const { getByText } = render(<StoryCard body="fallback" cardStyle="z" />);
  expect(getByText('fallback')).toBeTruthy();
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
npx jest src/story/__tests__/StoryCard.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../StoryCard'"

- [ ] **Step 3: Create `src/story/StoryCard.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardStyle, type CardStyleId } from './cardStyles';

export interface StoryCardProps {
  body: string;
  cardStyle: CardStyleId;
}

// ── Private decorative helpers ──────────────────────────────────────────────

function RuledLineOverlay({ lineColor, lineHeight: lh }: { lineColor: string; lineHeight: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 20 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: lh * (i + 1),
            height: StyleSheet.hairlineWidth,
            backgroundColor: lineColor,
          }}
        />
      ))}
    </View>
  );
}

function MarginStripe({ color }: { color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 3,
        backgroundColor: color,
      }}
    />
  );
}

function FoldCornerTriangle({ color }: { color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderTopWidth: 28,
        borderRightWidth: 28,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      }}
    />
  );
}

function TornEdgeStrip({ color }: { color: string }) {
  return (
    <View style={{ height: 22, overflow: 'hidden' }}>
      <View
        // @ts-ignore — clipPath is CSS-only, passed through on React Native Web
        style={{
          position: 'absolute',
          bottom: 0,
          left: -4,
          right: -4,
          height: 36,
          backgroundColor: color,
          clipPath:
            'polygon(0% 70%,2% 20%,5% 65%,8% 10%,11% 58%,14% 8%,18% 52%,21% 18%,25% 62%,28% 5%,32% 48%,36% 22%,40% 68%,44% 12%,48% 55%,52% 8%,56% 50%,60% 18%,64% 60%,68% 8%,72% 52%,76% 22%,80% 65%,84% 10%,88% 55%,92% 20%,96% 62%,98% 30%,100% 70%,100% 100%,0% 100%)',
        }}
      />
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function StoryCard({ body, cardStyle }: StoryCardProps) {
  const def = getCardStyle(cardStyle);

  // LinearGradient requires at least 2 colors
  const gradColors =
    def.backgroundColors.length >= 2
      ? (def.backgroundColors as [string, string, ...string[]])
      : ([def.backgroundColors[0], def.backgroundColors[0]] as [string, string]);

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: def.borderColor,
          borderWidth: def.borderColor !== 'transparent' ? 1 : 0,
          shadowColor: def.shadowColor,
        },
      ]}
    >
      {def.tornTopEdge && <TornEdgeStrip color={def.backgroundColors[0]} />}
      <LinearGradient
        colors={gradColors}
        start={def.gradientStart}
        end={def.gradientEnd}
        style={[
          styles.card,
          def.tornTopEdge && styles.tornCard,
          def.leftMarginStripe && styles.marginPadding,
        ]}
      >
        {def.ruledLines && (
          <RuledLineOverlay lineColor={def.ruledLineColor} lineHeight={def.lineHeight} />
        )}
        {def.leftMarginStripe && <MarginStripe color={def.leftMarginColor} />}
        {def.foldCorner && <FoldCornerTriangle color={def.foldColor} />}

        <Text
          style={{
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {body}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  marginPadding: {
    paddingLeft: 22,
  },
  outer: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tornCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest src/story/__tests__/StoryCard.test.tsx --no-coverage
```

Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add src/story/StoryCard.tsx src/story/__tests__/StoryCard.test.tsx
git commit -m "feat: add StoryCard component with 5 paper styles and decorative elements"
```

---

## Task 8: `src/story/StylePicker.tsx`

**Files:**
- Create: `src/story/StylePicker.tsx`
- Create: `src/story/__tests__/StylePicker.test.tsx`

`StylePicker` is a horizontal scroll row of colored swatches — one per registered card style. Reused identically in both `ComposeSheet` and `ProfileModal`.

- [ ] **Step 1: Write failing tests**

Create `src/story/__tests__/StylePicker.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StylePicker } from '../StylePicker';

test('renders 5 swatches', () => {
  const { getAllByRole } = render(
    <StylePicker selected="a" onSelect={jest.fn()} />,
  );
  expect(getAllByRole('button')).toHaveLength(5);
});

test('calls onSelect with the tapped style id', () => {
  const onSelect = jest.fn();
  const { getByTestId } = render(
    <StylePicker selected="a" onSelect={onSelect} />,
  );
  fireEvent.press(getByTestId('style-swatch-b'));
  expect(onSelect).toHaveBeenCalledWith('b');
});

test('calls onSelect for each style', () => {
  const ids: Array<'a' | 'b' | 'c' | 'd' | 'e'> = ['a', 'b', 'c', 'd', 'e'];
  for (const id of ids) {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <StylePicker selected="a" onSelect={onSelect} />,
    );
    fireEvent.press(getByTestId(`style-swatch-${id}`));
    expect(onSelect).toHaveBeenCalledWith(id);
  }
});

test('shows label for selected style when showLabel is true', () => {
  const { getByText } = render(
    <StylePicker selected="a" onSelect={jest.fn()} showLabel />,
  );
  expect(getByText('Warm Parchment')).toBeTruthy();
});

test('does not show label when showLabel is false', () => {
  const { queryByText } = render(
    <StylePicker selected="a" onSelect={jest.fn()} />,
  );
  expect(queryByText('Warm Parchment')).toBeNull();
});

test('label updates when selected changes', () => {
  const { getByText } = render(
    <StylePicker selected="b" onSelect={jest.fn()} showLabel />,
  );
  expect(getByText('Dark Candlelight')).toBeTruthy();
});
```

- [ ] **Step 2: Run — verify they fail**

```bash
npx jest src/story/__tests__/StylePicker.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../StylePicker'"

- [ ] **Step 3: Create `src/story/StylePicker.tsx`**

```tsx
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { CARD_STYLES, type CardStyleId } from './cardStyles';

export interface StylePickerProps {
  selected: CardStyleId;
  onSelect: (id: CardStyleId) => void;
  showLabel?: boolean;
}

export function StylePicker({ selected, onSelect, showLabel = false }: StylePickerProps) {
  const selectedDef = CARD_STYLES.find((s) => s.id === selected);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CARD_STYLES.map((def) => {
          const isSelected = def.id === selected;
          const isPremium = def.tier === 'premium';
          return (
            <Pressable
              key={def.id}
              testID={`style-swatch-${def.id}`}
              onPress={() => { if (!isPremium) onSelect(def.id); }}
              accessibilityRole="button"
              accessibilityLabel={def.label}
              style={[
                styles.swatch,
                { backgroundColor: def.backgroundColors[0] },
                isSelected && styles.swatchSelected,
                isPremium && styles.swatchPremium,
              ]}
            >
              {isPremium && <Text style={styles.lock}>🔒</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      {showLabel && selectedDef && (
        <Text style={styles.label}>{selectedDef.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: 'rgba(245,230,200,0.5)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  lock: { fontSize: 12 },
  row: { gap: 10, paddingBottom: 2, paddingHorizontal: 2 },
  swatch: {
    alignItems: 'center',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  swatchPremium: { opacity: 0.45 },
  swatchSelected: {
    borderColor: '#f4c97a',
    borderWidth: 2,
  },
  wrap: { marginBottom: 12 },
});
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest src/story/__tests__/StylePicker.test.tsx --no-coverage
```

Expected: PASS — 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/story/StylePicker.tsx src/story/__tests__/StylePicker.test.tsx
git commit -m "feat: add StylePicker swatch row component"
```

---

## Task 9: Update `StorySheet.tsx`

**Files:**
- Modify: `src/story/StorySheet.tsx`

Replace the body `<ScrollView>` + `<Text>` block with `<StoryCard>`. The existing chrome (location row, close, flag, reactions, reply thread, footer) is unchanged.

- [ ] **Step 1: Update `src/story/StorySheet.tsx`**

Add import at top of file (after existing imports):
```tsx
import { StoryCard } from './StoryCard';
```

Locate and replace the `ScrollView` body block (currently lines 67–77):

**Remove:**
```tsx
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
```

**Replace with:**
```tsx
          <StoryCard body={story.body} cardStyle={story.card_style} />
```

Remove now-unused styles from the `StyleSheet.create` call at the bottom — delete these two entries:
```ts
  body: { fontSize: 16, lineHeight: 24 },
  bodyWrap: { paddingBottom: 4 },
```

- [ ] **Step 2: Add `expo-linear-gradient` mock to StorySheet tests**

Find the existing StorySheet test file (likely `src/story/__tests__/StorySheet.test.tsx`). Add this mock at the top, after the existing imports:

```tsx
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      React.createElement(View, { style }, children),
  };
});
```

Also ensure any mock story objects in that test file include `card_style: 'a'`.

- [ ] **Step 3: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass (including StorySheet tests with the updated mock story).

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/story/StorySheet.tsx
git commit -m "feat: render StoryCard in StorySheet — handwriting font + paper background on sulat body"
```

---

## Task 10: Update `ComposeSheet.tsx`

**Files:**
- Modify: `src/compose/ComposeSheet.tsx`

Add `StylePicker` row below the mood picker. Default to the user's `preferred_card_style`; override is local state only (does not update the DB).

- [ ] **Step 1: Write failing test**

Find the existing compose test file (likely `src/compose/__tests__/ComposeSheet.test.tsx`). Add these tests:

```tsx
// Add these mocks at the top of the file if not already present:
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      React.createElement(View, { style }, children),
  };
});

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: { id: 'u1', display_handle: null, preferred_card_style: 'b' as const },
    loading: false,
    error: null,
  }),
}));

// Add these test cases:
test('renders style picker', () => {
  const { getByTestId } = render(<ComposeSheet onClose={jest.fn()} />);
  expect(getByTestId('style-swatch-a')).toBeTruthy();
});

test('initialises style picker from user preferred_card_style', async () => {
  const { getByTestId } = render(<ComposeSheet onClose={jest.fn()} />);
  // Wait for useEffect to read user.preferred_card_style = 'b'
  await waitFor(() => {
    const swatch = getByTestId('style-swatch-b');
    expect(swatch.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderColor: '#f4c97a' }),
      ]),
    );
  });
});
```

Note: `waitFor` is imported from `@testing-library/react-native`.

- [ ] **Step 2: Run — verify the new tests fail**

```bash
npx jest src/compose/__tests__/ComposeSheet.test.tsx --no-coverage
```

Expected: new style-picker tests FAIL, existing tests PASS.

- [ ] **Step 3: Update `src/compose/ComposeSheet.tsx`**

Add imports at the top:
```tsx
import { useUser } from '@/data/useUser';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
```

Inside `ComposeSheet` function, after the existing `useState` declarations, add:
```tsx
  const { user } = useUser();
  const [selectedStyle, setSelectedStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);

  useEffect(() => {
    if (user?.preferred_card_style) {
      setSelectedStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);
```

In the render, after the closing `</ScrollView>` for the mood picker (after `style={styles.moodScroll}`), add:
```tsx
      <StylePicker selected={selectedStyle} onSelect={setSelectedStyle} />
```

Update `handlePost` — add `cardStyle: selectedStyle` to the `create(...)` call:
```tsx
      await create({
        mood: selectedMood,
        body: body.trim(),
        coords: location,
        pinMode: coords ? 'dropped' : 'gps',
        label: placeLabel ?? undefined,
        cardStyle: selectedStyle,
      });
```

- [ ] **Step 4: Run — verify all tests pass**

```bash
npx jest src/compose/__tests__/ComposeSheet.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/compose/ComposeSheet.tsx
git commit -m "feat: add StylePicker to ComposeSheet — per-sulat card style override"
```

---

## Task 11: Update `ProfileModal.tsx`

**Files:**
- Modify: `src/profile/ProfileModal.tsx`

Add a "your paper style" section below the handle display. Only visible when a handle is claimed. Selecting a style immediately updates `users.preferred_card_style` in Supabase and shows a brief "Saved ✓" confirmation.

- [ ] **Step 1: Write failing tests**

Find `src/profile/__tests__/ProfileModal.test.tsx`. Add these tests:

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileModal } from '../ProfileModal';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, style }: { children: React.ReactNode; style: object }) =>
      React.createElement(View, { style }, children),
  };
});

// Mutable user state — set per test
let mockDisplayHandle: string | null = null;
let mockPreferredStyle = 'a';

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: {
      id: 'u1',
      display_handle: mockDisplayHandle,
      preferred_card_style: mockPreferredStyle,
      device_fingerprint: 'fp1',
      email: null,
      theme_preference: 'lantern',
      banned_at: null,
      created_at: '2026-01-01',
    },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/data/useUser', () => ({
  useUser: () => ({
    user: mockDisplayHandle === null
      ? null
      : {
          id: 'u1',
          display_handle: mockDisplayHandle,
          preferred_card_style: mockPreferredStyle,
          device_fingerprint: 'fp1',
          email: null,
          theme_preference: 'lantern',
          banned_at: null,
          created_at: '2026-01-01',
        },
    loading: false,
    error: null,
  }),
}));

jest.mock('@/data/supabase', () => ({
  supabase: {
    from: () => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
}));

jest.mock('@/profile/useMyStories', () => ({
  useMyStories: () => ({ stories: [], loading: false, error: null }),
}));

// Add these tests to the existing describe block or alongside existing tests:

test('style picker is hidden when user has no claimed handle', () => {
  mockDisplayHandle = null;
  const { queryByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  expect(queryByTestId('style-swatch-a')).toBeNull();
});

test('style picker is visible when user has a claimed handle', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => {
    expect(getByTestId('style-swatch-a')).toBeTruthy();
  });
});

test('selecting a style calls supabase update and shows Saved ✓', async () => {
  mockDisplayHandle = 'cozy_writer';
  mockPreferredStyle = 'a';
  const { getByTestId, getByText } = render(
    <ProfileModal onClose={jest.fn()} onNavigate={jest.fn()} />,
  );
  await waitFor(() => getByTestId('style-swatch-b'));
  fireEvent.press(getByTestId('style-swatch-b'));
  await waitFor(() => expect(getByText('Saved ✓')).toBeTruthy());
});
```

If the existing test file already has mocks for `useUser`, `supabase`, and `useMyStories`, merge the new tests into that file rather than duplicating the mocks — keep the mutable `mockDisplayHandle` / `mockPreferredStyle` variables and adjust to match the existing mock style.

- [ ] **Step 2: Run — verify they fail**

```bash
npx jest src/profile/__tests__/ProfileModal.test.tsx --no-coverage
```

Expected: new tests FAIL, existing tests still PASS.

- [ ] **Step 3: Update `src/profile/ProfileModal.tsx`**

Add imports:
```tsx
import { supabase } from '@/data/supabase';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
```

Inside `ProfileModal`, add state after the existing `useState` declarations:
```tsx
  const [preferredStyle, setPreferredStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);
  const [saved, setSaved] = useState(false);
```

Add a `useEffect` to read the user's current preference (after existing `useEffect` for seenCounts):
```tsx
  useEffect(() => {
    if (user?.preferred_card_style) {
      setPreferredStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);
```

Add the `handleStyleChange` function before the return:
```tsx
  const handleStyleChange = async (id: CardStyleId) => {
    if (!user) return;
    setPreferredStyle(id);
    await supabase.from('users').update({ preferred_card_style: id }).eq('id', user.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
```

In the render, locate the block that shows either the claimed-handle row or `HandleClaim`. After the `handleRow` View (the `@handle 🔒` row), add the style picker section:

```tsx
          {displayHandle !== null ? (
            <>
              <View style={styles.handleRow}>
                <Text style={[styles.handleTxt, { color: theme.accent }]}>
                  @{displayHandle}
                </Text>
                <Text style={[styles.lockIcon, { color: theme.textMuted }]}>{'  🔒'}</Text>
              </View>
              <View style={styles.styleSection}>
                <Text style={[styles.styleSectionLabel, { color: theme.textMuted }]}>your paper</Text>
                <StylePicker selected={preferredStyle} onSelect={handleStyleChange} showLabel />
                {saved && (
                  <Text style={[styles.savedTxt, { color: theme.accent }]}>Saved ✓</Text>
                )}
              </View>
            </>
          ) : user !== null ? (
            <HandleClaim userId={user.id} onClaimed={(h) => setClaimedHandle(h)} />
          ) : null}
```

Add new styles to `StyleSheet.create`:
```ts
  savedTxt: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  styleSectionLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  styleSection: { marginBottom: 4, marginTop: 8 },
```

- [ ] **Step 4: Run — verify tests pass**

```bash
npx jest src/profile/__tests__/ProfileModal.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/profile/ProfileModal.tsx
git commit -m "feat: add paper style picker to profile for claimed-handle users"
```

---

## Task 12: Update `app/_layout.tsx` — font loading

**Files:**
- Modify: `app/_layout.tsx`

Load the five handwriting fonts before rendering. The app returns `null` until fonts resolve (fast on web — typically < 200ms). This ensures `fontFamily` style values resolve correctly from the first render.

- [ ] **Step 1: Update `app/_layout.tsx`**

Replace the entire file with:

```tsx
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Kalam_400Regular } from '@expo-google-fonts/kalam';
import { Caveat_400Regular } from '@expo-google-fonts/caveat';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { ReenieBeanie_400Regular } from '@expo-google-fonts/reenie-beanie';
import { ThemeProvider } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';

function UserInit() {
  useUser(); // initialises anonymous auth session on first load
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Kalam_400Regular,
    Caveat_400Regular,
    DancingScript_400Regular,
    PatrickHand_400Regular,
    ReenieBeanie_400Regular,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <UserInit />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: load five handwriting fonts in layout before render"
```

---

## Task 13: Final integration check + deploy

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite one last time**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Start local dev server and manually verify**

```bash
npx expo start --web
```

Open `http://localhost:8081` and verify:
- App loads (fonts resolve, no blank screen lasting > 1s)
- Opening a sulat shows the body text on a warm parchment background with Kalam font (Style A default)
- Opening Compose shows 5 style swatches; selecting one changes the preview swatch highlight
- In Profile with a claimed handle, "your paper" section appears with StylePicker + label
- Selecting a style in Profile shows "Saved ✓"
- Posting a sulat with Style C — when reopened from map, card body shows Dancing Script on parchment background with torn-edge strip at top

- [ ] **Step 4: Deploy to production**

```bash
vercel --prod
```

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: post-integration corrections for card styles"
```
