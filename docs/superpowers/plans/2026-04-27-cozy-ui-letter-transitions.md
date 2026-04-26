# Cozy UI — Letter Aesthetic, Compose Preview & Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sulat feel like a real letter — cards that look like paper, a compose editor where you type directly on the card, paper-unfold sheet transitions across all modals, and a handful of cozy UI polish touches.

**Architecture:** Four improvements sharing the card style system. `StoryCard` splits into `StoryCardShell` (visual wrapper) + `StoryCard` (text display). A new `ComposeCard` uses `StoryCardShell` with a `TextInput`. A `useSheetAnimation` hook + `AnimatedSheet` wrapper bring the paper-unfold transition to all five sheets. No backend or data model changes.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, `expo-linear-gradient`, React Native `Animated` API (built-in), `@expo-google-fonts/*` handwriting fonts, TypeScript.

---

## File Map

| File | Action |
|------|--------|
| `src/story/cardStyles.ts` | Modify — add `showPostmark`, tune `fontSize`/`lineHeight` |
| `src/story/StoryCardShell.tsx` | **Create** — extracted visual wrapper, all decorative helpers |
| `src/story/Postmark.tsx` | **Create** — shared postmark stamp component |
| `src/story/StoryCard.tsx` | Modify — use `StoryCardShell` + `Postmark`, add `locationLabel`/`createdAt` props |
| `src/story/StorySheet.tsx` | Modify — pass `locationLabel`/`createdAt`, warm shadow color |
| `src/compose/ComposeCard.tsx` | **Create** — card-as-editor, transparent `TextInput` on paper |
| `src/compose/ComposeSheet.tsx` | Modify — replace `TextInput` with `ComposeCard`, polish location row + header |
| `src/hooks/useSheetAnimation.ts` | **Create** — animation hook (scale, opacity, creases, glint) |
| `src/components/AnimatedSheet.tsx` | **Create** — animated wrapper with crease lines + glint overlay |
| `src/story/StorySheet.tsx` | Modify (2nd pass) — wrap with `AnimatedSheet`, intercept close |
| `src/compose/ComposeSheet.tsx` | Modify (2nd pass) — wrap with `AnimatedSheet`, intercept close |
| `src/profile/ProfileModal.tsx` | Modify — `AnimatedSheet`, header font, warm shadow |
| `src/lantern/LanternSheet.tsx` | Modify — `AnimatedSheet`, warm shadow |
| `src/settings/SettingsSheet.tsx` | Modify — `AnimatedSheet`, warm shadow |
| `app/index.tsx` | Modify — nav bar top border, FAB shadow boost |

---

### Task 1: cardStyles.ts — add showPostmark + tune font sizes

**Files:**
- Modify: `src/story/cardStyles.ts`
- Test: `src/story/__tests__/cardStyles.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/story/__tests__/cardStyles.test.ts`:

```ts
test('each style has showPostmark boolean', () => {
  for (const style of CARD_STYLES) {
    expect(typeof style.showPostmark).toBe('boolean');
  }
});

test('showPostmark is true for styles a, c, e', () => {
  expect(getCardStyle('a').showPostmark).toBe(true);
  expect(getCardStyle('c').showPostmark).toBe(true);
  expect(getCardStyle('e').showPostmark).toBe(true);
});

test('showPostmark is false for styles b, d', () => {
  expect(getCardStyle('b').showPostmark).toBe(false);
  expect(getCardStyle('d').showPostmark).toBe(false);
});

test('style a fontSize is 18 and lineHeight is 34', () => {
  const def = getCardStyle('a');
  expect(def.fontSize).toBe(18);
  expect(def.lineHeight).toBe(34);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="cardStyles" --no-coverage
```

Expected: FAIL — `showPostmark` property missing on `CardStyleDef`.

- [ ] **Step 3: Add `showPostmark` to `CardStyleDef` and update all 5 styles**

In `src/story/cardStyles.ts`, add `showPostmark: boolean;` to the `CardStyleDef` interface (after `sealFooter`):

```ts
export interface CardStyleDef {
  id: CardStyleId;
  label: string;
  tier: 'free' | 'premium';
  backgroundColors: string[];
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
  pillFooter: boolean;
  sealFooter: boolean;
  showPostmark: boolean;
  borderColor: string;
  shadowColor: string;
}
```

Then update each style in `CARD_STYLES` with `showPostmark` and new font values:

Style A — Warm Parchment:
```ts
fontSize: 18,
lineHeight: 34,
showPostmark: true,
```

Style B — Dark Candlelight:
```ts
fontSize: 20,
lineHeight: 32,
showPostmark: false,
```

Style C — Torn Letter:
```ts
fontSize: 20,
lineHeight: 32,
showPostmark: true,
```

Style D — Midnight Journal:
```ts
fontSize: 17,
lineHeight: 34,
showPostmark: false,
```

Style E — Folded Corner:
```ts
fontSize: 21,
lineHeight: 32,
showPostmark: true,
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="cardStyles" --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/story/cardStyles.ts src/story/__tests__/cardStyles.test.ts
git commit -m "feat: add showPostmark to CardStyleDef, tune font sizes for all 5 styles"
```

---

### Task 2: StoryCardShell.tsx — extract visual wrapper

**Files:**
- Create: `src/story/StoryCardShell.tsx`
- Create: `src/story/__tests__/StoryCardShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/story/__tests__/StoryCardShell.test.tsx`:

```tsx
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { StoryCardShell } from '../StoryCardShell';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return {
    LinearGradient: ({ children, style }: { children: unknown; style: object }) =>
      mockReact.createElement(View, { style }, children),
  };
});

const ids: Array<'a' | 'b' | 'c' | 'd' | 'e'> = ['a', 'b', 'c', 'd', 'e'];

for (const id of ids) {
  test(`renders children for style ${id}`, () => {
    const { getByText } = render(
      <StoryCardShell cardStyle={id}>
        <Text>child content</Text>
      </StoryCardShell>,
    );
    expect(getByText('child content')).toBeTruthy();
  });
}

test('renders without crashing for unknown style (fallback to a)', () => {
  const { getByText } = render(
    // @ts-expect-error intentional bad style
    <StoryCardShell cardStyle="z">
      <Text>fallback</Text>
    </StoryCardShell>,
  );
  expect(getByText('fallback')).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="StoryCardShell" --no-coverage
```

Expected: FAIL — `StoryCardShell` module not found.

- [ ] **Step 3: Create `src/story/StoryCardShell.tsx`**

Move all private decorative helpers from `StoryCard.tsx` here. The full file:

```tsx
import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardStyle, type CardStyleId } from './cardStyles';

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
        style={{
          position: 'absolute',
          bottom: 0,
          left: -4,
          right: -4,
          height: 36,
          backgroundColor: color,
          // @ts-ignore — clipPath is CSS-only, passed through on React Native Web
          clipPath:
            'polygon(0% 70%,2% 20%,5% 65%,8% 10%,11% 58%,14% 8%,18% 52%,21% 18%,25% 62%,28% 5%,32% 48%,36% 22%,40% 68%,44% 12%,48% 55%,52% 8%,56% 50%,60% 18%,64% 60%,68% 8%,72% 52%,76% 22%,80% 65%,84% 10%,88% 55%,92% 20%,96% 62%,98% 30%,100% 70%,100% 100%,0% 100%)',
        }}
      />
    </View>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

export interface StoryCardShellProps {
  cardStyle: CardStyleId;
  children: ReactNode;
}

export function StoryCardShell({ cardStyle, children }: StoryCardShellProps) {
  const def = getCardStyle(cardStyle);

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
      {def.tornTopEdge && <TornEdgeStrip color={def.backgroundColors[0] ?? '#000000'} />}
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
        {children}
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="StoryCardShell" --no-coverage
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/story/StoryCardShell.tsx src/story/__tests__/StoryCardShell.test.tsx
git commit -m "feat: create StoryCardShell — extracted visual wrapper from StoryCard"
```

---

### Task 3: Postmark.tsx — shared postmark stamp component

**Files:**
- Create: `src/story/Postmark.tsx`
- Create: `src/story/__tests__/Postmark.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/story/__tests__/Postmark.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Postmark } from '../Postmark';

test('renders location text uppercase truncated to 10 chars', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Valenzuela, Metro Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('renders date in APR 27 format', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/APR 27/)).toBeTruthy();
});

test('renders null when locationLabel is null', () => {
  const { toJSON } = render(
    <Postmark
      locationLabel={null}
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(toJSON()).toBeNull();
});

test('takes only first segment before comma', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Quezon City, Metro Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/QUEZON CIT/)).toBeTruthy(); // truncated at 10 chars
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="Postmark" --no-coverage
```

Expected: FAIL — `Postmark` module not found.

- [ ] **Step 3: Create `src/story/Postmark.tsx`**

```tsx
import { View, Text, StyleSheet } from 'react-native';

function formatLocation(label: string | null | undefined): string {
  if (!label) return '';
  return (label.split(',')[0] ?? '').trim().toUpperCase().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export interface PostmarkProps {
  locationLabel: string | null | undefined;
  date: string; // ISO string
  inkColor: string;
}

export function Postmark({ locationLabel, date, inkColor }: PostmarkProps) {
  const loc = formatLocation(locationLabel);
  if (!loc) return null;
  const dateStr = formatDate(date);

  return (
    <View style={[styles.outer, { borderColor: inkColor }]}>
      <View style={[styles.inner, { borderColor: inkColor }]} />
      <Text style={[styles.text, { color: inkColor }]}>
        {loc}{'\n'}{dateStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    bottom: 6,
    left: 6,
    position: 'absolute',
    right: 6,
    top: 6,
  },
  outer: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1.5,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 52,
    zIndex: 2,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 7,
    lineHeight: 11,
    position: 'relative',
    textAlign: 'center',
    zIndex: 1,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="Postmark" --no-coverage
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/story/Postmark.tsx src/story/__tests__/Postmark.test.tsx
git commit -m "feat: create Postmark — shared circular ink stamp component"
```

---

### Task 4: StoryCard.tsx — use StoryCardShell + Postmark

**Files:**
- Modify: `src/story/StoryCard.tsx`
- Modify: `src/story/__tests__/StoryCard.test.tsx`

- [ ] **Step 1: Add failing tests for new props**

Add to `src/story/__tests__/StoryCard.test.tsx` (keep all existing tests):

```tsx
test('shows postmark for style a when locationLabel and createdAt provided', () => {
  const { getByText } = render(
    <StoryCard
      body="hello"
      cardStyle="a"
      locationLabel="Valenzuela, Metro Manila"
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('does not show postmark for style b even with locationLabel', () => {
  const { queryByText } = render(
    <StoryCard
      body="hello"
      cardStyle="b"
      locationLabel="Valenzuela, Metro Manila"
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(queryByText(/VALENZUELA/)).toBeNull();
});

test('does not show postmark when locationLabel is null', () => {
  const { queryByText } = render(
    <StoryCard
      body="hello"
      cardStyle="a"
      locationLabel={null}
      createdAt="2026-04-27T00:00:00.000Z"
    />,
  );
  expect(queryByText(/APR/)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
npm test -- --testPathPattern="src/story/__tests__/StoryCard" --no-coverage
```

Expected: 3 new tests FAIL — `StoryCard` doesn't accept new props.

- [ ] **Step 3: Rewrite `src/story/StoryCard.tsx`**

Replace the entire file:

```tsx
import { Text, StyleSheet } from 'react-native';
import { StoryCardShell } from './StoryCardShell';
import { Postmark } from './Postmark';
import { getCardStyle, type CardStyleId } from './cardStyles';

export interface StoryCardProps {
  body: string;
  cardStyle: CardStyleId;
  locationLabel?: string | null;
  createdAt?: string;
}

export function StoryCard({ body, cardStyle, locationLabel, createdAt }: StoryCardProps) {
  const def = getCardStyle(cardStyle);
  const showPostmark = def.showPostmark && !!locationLabel && !!createdAt;

  return (
    <StoryCardShell cardStyle={cardStyle}>
      {showPostmark && (
        <Postmark
          locationLabel={locationLabel}
          date={createdAt!}
          inkColor="rgba(120,80,20,0.45)"
        />
      )}
      <Text
        style={[
          styles.body,
          {
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            paddingRight: showPostmark ? 60 : 0,
          },
        ]}
      >
        {body}
      </Text>
    </StoryCardShell>
  );
}

const styles = StyleSheet.create({
  body: {
    position: 'relative',
    zIndex: 1,
  },
});
```

- [ ] **Step 4: Run ALL StoryCard tests to verify they pass**

```bash
npm test -- --testPathPattern="src/story/__tests__/StoryCard" --no-coverage
```

Expected: All tests PASS (existing + 3 new).

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/story/StoryCard.tsx src/story/__tests__/StoryCard.test.tsx
git commit -m "feat: StoryCard uses StoryCardShell + Postmark, adds locationLabel/createdAt props"
```

---

### Task 5: StorySheet.tsx — pass postmark props + warm shadow

**Files:**
- Modify: `src/story/StorySheet.tsx`

No new tests needed — this is a prop-passing change only. Existing app renders validate it.

- [ ] **Step 1: Pass `locationLabel` and `createdAt` to `StoryCard` in `StorySheet.tsx`**

Find the `<StoryCard>` usage in `src/story/StorySheet.tsx` (currently line ~55):

```tsx
{/* Body */}
<StoryCard body={story.body} cardStyle={story.card_style} />
```

Change it to:

```tsx
{/* Body */}
<StoryCard
  body={story.body}
  cardStyle={story.card_style}
  locationLabel={story.location_label}
  createdAt={story.created_at}
/>
```

- [ ] **Step 2: Update shadow color in `StorySheet.tsx` styles**

In the `StyleSheet.create` at the bottom of `src/story/StorySheet.tsx`, find the `card` style:

```ts
card: {
  borderRadius: 18,
  elevation: 12,
  left: 12,
  maxHeight: 480,
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
```

Change `shadowColor: '#000'` to `shadowColor: '#1a0e00'`.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/story/StorySheet.tsx
git commit -m "feat: StorySheet passes locationLabel/createdAt to StoryCard, warm shadow color"
```

---

### Task 6: ComposeCard.tsx — card as editor

**Files:**
- Create: `src/compose/ComposeCard.tsx`
- Create: `src/compose/__tests__/ComposeCard.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/compose/__tests__/ComposeCard.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ComposeCard } from '../ComposeCard';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  const mockReact = require('react');
  return {
    LinearGradient: ({ children, style }: { children: unknown; style: object }) =>
      mockReact.createElement(View, { style }, children),
  };
});

test('renders TextInput with provided value', () => {
  const { getByDisplayValue } = render(
    <ComposeCard
      cardStyle="a"
      value="naol masaya"
      onChangeText={() => {}}
      placeholder="What's on your mind?"
      locationLabel="Manila"
      maxLength={500}
    />,
  );
  expect(getByDisplayValue('naol masaya')).toBeTruthy();
});

test('calls onChangeText when text changes', () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = render(
    <ComposeCard
      cardStyle="a"
      value="hello"
      onChangeText={onChangeText}
      placeholder="Write here"
      locationLabel={null}
      maxLength={500}
    />,
  );
  fireEvent.changeText(getByDisplayValue('hello'), 'hello world');
  expect(onChangeText).toHaveBeenCalledWith('hello world');
});

test('renders postmark when locationLabel provided for style a', () => {
  const { getByText } = render(
    <ComposeCard
      cardStyle="a"
      value=""
      onChangeText={() => {}}
      placeholder="Write"
      locationLabel="Valenzuela, Metro Manila"
      maxLength={500}
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('does not render postmark for style b', () => {
  const { queryByText } = render(
    <ComposeCard
      cardStyle="b"
      value=""
      onChangeText={() => {}}
      placeholder="Write"
      locationLabel="Valenzuela, Metro Manila"
      maxLength={500}
    />,
  );
  expect(queryByText(/VALENZUELA/)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="ComposeCard" --no-coverage
```

Expected: FAIL — `ComposeCard` module not found.

- [ ] **Step 3: Create `src/compose/ComposeCard.tsx`**

```tsx
import { TextInput, StyleSheet } from 'react-native';
import { StoryCardShell } from '@/story/StoryCardShell';
import { Postmark } from '@/story/Postmark';
import { getCardStyle, type CardStyleId } from '@/story/cardStyles';

export interface ComposeCardProps {
  cardStyle: CardStyleId;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  locationLabel: string | null;
  maxLength: number;
}

/** Converts a 6-digit hex colour to rgba at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ComposeCard({
  cardStyle,
  value,
  onChangeText,
  placeholder,
  locationLabel,
  maxLength,
}: ComposeCardProps) {
  const def = getCardStyle(cardStyle);
  const showPostmark = def.showPostmark && !!locationLabel;
  const placeholderColor = def.textColor.startsWith('#')
    ? hexToRgba(def.textColor, 0.4)
    : def.textColor;

  return (
    <StoryCardShell cardStyle={cardStyle}>
      {showPostmark && (
        <Postmark
          locationLabel={locationLabel}
          date={new Date().toISOString()}
          inkColor="rgba(120,80,20,0.45)"
        />
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            paddingRight: showPostmark ? 60 : 0,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline
        maxLength={maxLength}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="top"
      />
    </StoryCardShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
    minHeight: 96,
    position: 'relative',
    zIndex: 1,
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="ComposeCard" --no-coverage
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/compose/ComposeCard.tsx src/compose/__tests__/ComposeCard.test.tsx
git commit -m "feat: create ComposeCard — write directly on the paper"
```

---

### Task 7: ComposeSheet.tsx — use ComposeCard + cozy polish

**Files:**
- Modify: `src/compose/ComposeSheet.tsx`

No new tests needed — existing ComposeSheet tests (if any) validate mount. Visual validation via the app.

- [ ] **Step 1: Replace `TextInput` block with `ComposeCard` in `src/compose/ComposeSheet.tsx`**

Add `ComposeCard` import at the top:

```tsx
import { ComposeCard } from './ComposeCard';
```

Remove `TextInput` from the React Native imports (it's no longer used directly).

Find and remove this block (the existing `TextInput`):

```tsx
{/* Text area */}
<TextInput
  style={[styles.textInput, { color: theme.textPrimary, borderColor: 'rgba(245,230,200,0.15)' }]}
  placeholder={moodEntry?.prompt ?? 'What do you want to say?'}
  placeholderTextColor={theme.textMuted}
  multiline
  maxLength={500}
  value={body}
  onChangeText={setBody}
  textAlignVertical="top"
/>
```

Replace it with:

```tsx
{/* Card editor — write directly on the paper */}
<ComposeCard
  cardStyle={selectedStyle}
  value={body}
  onChangeText={setBody}
  placeholder={moodEntry?.prompt ?? 'What do you want to say?'}
  locationLabel={placeLabel}
  maxLength={500}
/>
```

- [ ] **Step 2: Add `fontFamily` to the header title in `ComposeSheet.tsx`**

Find:

```tsx
<Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
  New sulat
</Text>
```

It already has `fontFamily: theme.fontFamily` — verify this is present. If not, add it.

- [ ] **Step 3: Update location row colours in `ComposeSheet.tsx`**

In `StyleSheet.create`, update:

```ts
locationPin: { fontSize: 11, marginRight: 4 },
locationTxt: { fontSize: 12 },
```

These stay the same in the stylesheet. In the JSX, find:

```tsx
<Text style={[styles.locationPin, { color: theme.accent }]}>📍</Text>
```

Change to:

```tsx
<Text style={[styles.locationPin, { color: 'rgba(244,201,122,0.7)' }]}>📍</Text>
```

And find:

```tsx
{!location ? (
  <Text style={[styles.locationTxt, { color: theme.textMuted }]}>Getting location…</Text>
) : placeLabel ? (
  <Text style={[styles.locationTxt, { color: theme.textMuted }]}>{placeLabel}</Text>
) : (
  <Text style={[styles.locationTxt, { color: theme.textMuted }]}>
    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
  </Text>
)}
```

Change all three `{ color: theme.textMuted }` to `{ color: 'rgba(244,201,122,0.5)' }`.

- [ ] **Step 4: Update shadow color + remove now-unused textInput style**

In the `card` style inside `StyleSheet.create`, the `shadowColor` isn't set directly — it comes from the parent. Actually `ComposeSheet` has its own `styles.card`. Find it and change `shadowColor: '#000'` to `shadowColor: '#1a0e00'` if present. Also remove the now-unused `textInput` style from `StyleSheet.create`.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/compose/ComposeSheet.tsx
git commit -m "feat: ComposeSheet uses ComposeCard, warm location row, polish"
```

---

### Task 8: useSheetAnimation.ts — animation hook

**Files:**
- Create: `src/hooks/useSheetAnimation.ts`
- Create: `src/hooks/__tests__/useSheetAnimation.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useSheetAnimation.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useSheetAnimation } from '../useSheetAnimation';

test('returns open and close functions', () => {
  const { result } = renderHook(() => useSheetAnimation());
  expect(typeof result.current.open).toBe('function');
  expect(typeof result.current.close).toBe('function');
});

test('returns 6 animated values', () => {
  const { result } = renderHook(() => useSheetAnimation());
  const { scaleAnim, opacityAnim, creaseOpacity1, creaseOpacity2, glintOpacity, glintTranslateX } =
    result.current;
  // Each is an Animated.Value — check it has a setValue method
  expect(typeof scaleAnim.setValue).toBe('function');
  expect(typeof opacityAnim.setValue).toBe('function');
  expect(typeof creaseOpacity1.setValue).toBe('function');
  expect(typeof creaseOpacity2.setValue).toBe('function');
  expect(typeof glintOpacity.setValue).toBe('function');
  expect(typeof glintTranslateX.setValue).toBe('function');
});

test('open() does not throw', () => {
  const { result } = renderHook(() => useSheetAnimation());
  expect(() => act(() => result.current.open())).not.toThrow();
});

test('close() calls onDone after animation', () => {
  jest.useFakeTimers();
  const { result } = renderHook(() => useSheetAnimation());
  const onDone = jest.fn();
  act(() => {
    result.current.open();
    result.current.close(onDone);
  });
  act(() => { jest.runAllTimers(); });
  expect(onDone).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="useSheetAnimation" --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useSheetAnimation.ts`**

```ts
import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export interface SheetAnimationResult {
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  creaseOpacity1: Animated.Value;
  creaseOpacity2: Animated.Value;
  glintOpacity: Animated.Value;
  glintTranslateX: Animated.Value;
  open: () => void;
  close: (onDone: () => void) => void;
}

export function useSheetAnimation(): SheetAnimationResult {
  const scaleAnim       = useRef(new Animated.Value(0.04)).current;
  const opacityAnim     = useRef(new Animated.Value(0)).current;
  const creaseOpacity1  = useRef(new Animated.Value(0)).current;
  const creaseOpacity2  = useRef(new Animated.Value(0)).current;
  const glintOpacity    = useRef(new Animated.Value(0)).current;
  const glintTranslateX = useRef(new Animated.Value(-300)).current;

  const open = useCallback(() => {
    // Reset all values
    scaleAnim.setValue(0.04);
    opacityAnim.setValue(0);
    creaseOpacity1.setValue(0);
    creaseOpacity2.setValue(0);
    glintOpacity.setValue(0);
    glintTranslateX.setValue(-300);

    Animated.parallel([
      // Fade in fast
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      // Three-phase scale: snap to each crease then settle
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.35,
          tension: 800,
          friction: 20,
          useNativeDriver: true,
        }),
        Animated.delay(25),
        Animated.spring(scaleAnim, {
          toValue: 0.70,
          tension: 700,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.delay(20),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 350,
          friction: 26,
          useNativeDriver: true,
        }),
      ]),
      // Crease 1 flickers at 60ms
      Animated.sequence([
        Animated.delay(60),
        Animated.timing(creaseOpacity1, { toValue: 1, duration: 35, useNativeDriver: true }),
        Animated.timing(creaseOpacity1, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]),
      // Crease 2 flickers at 140ms
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(creaseOpacity2, { toValue: 1, duration: 35, useNativeDriver: true }),
        Animated.timing(creaseOpacity2, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]),
      // Glint fires after unfold settles (~340ms)
      Animated.sequence([
        Animated.delay(340),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(glintOpacity, { toValue: 1, duration: 35, useNativeDriver: true }),
            Animated.timing(glintOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]),
          Animated.timing(glintTranslateX, {
            toValue: 300,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim, creaseOpacity1, creaseOpacity2, glintOpacity, glintTranslateX]);

  const close = useCallback(
    (onDone: () => void) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.04,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    },
    [scaleAnim, opacityAnim],
  );

  return {
    scaleAnim,
    opacityAnim,
    creaseOpacity1,
    creaseOpacity2,
    glintOpacity,
    glintTranslateX,
    open,
    close,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="useSheetAnimation" --no-coverage
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSheetAnimation.ts src/hooks/__tests__/useSheetAnimation.test.ts
git commit -m "feat: useSheetAnimation hook — paper-unfold open + close with crease + glint"
```

---

### Task 9: AnimatedSheet.tsx — animated wrapper component

**Files:**
- Create: `src/components/AnimatedSheet.tsx`
- Create: `src/components/__tests__/AnimatedSheet.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/AnimatedSheet.test.tsx`:

```tsx
import React, { createRef } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AnimatedSheet, type AnimatedSheetRef } from '../AnimatedSheet';

test('renders children', () => {
  const { getByText } = render(
    <AnimatedSheet>
      <Text>sheet content</Text>
    </AnimatedSheet>,
  );
  expect(getByText('sheet content')).toBeTruthy();
});

test('exposes open and close via ref', () => {
  const ref = createRef<AnimatedSheetRef>();
  render(
    <AnimatedSheet ref={ref}>
      <Text>content</Text>
    </AnimatedSheet>,
  );
  expect(typeof ref.current?.open).toBe('function');
  expect(typeof ref.current?.close).toBe('function');
});

test('open() via ref does not throw', () => {
  const ref = createRef<AnimatedSheetRef>();
  render(
    <AnimatedSheet ref={ref}>
      <Text>content</Text>
    </AnimatedSheet>,
  );
  expect(() => ref.current?.open()).not.toThrow();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="AnimatedSheet" --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/AnimatedSheet.tsx`**

```tsx
import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  type ReactNode,
} from 'react';
import { Animated, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSheetAnimation } from '@/hooks/useSheetAnimation';

export interface AnimatedSheetRef {
  open: () => void;
  close: (onDone: () => void) => void;
}

interface AnimatedSheetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedSheet = forwardRef<AnimatedSheetRef, AnimatedSheetProps>(
  function AnimatedSheet({ children, style }, ref) {
    const {
      scaleAnim,
      opacityAnim,
      creaseOpacity1,
      creaseOpacity2,
      glintOpacity,
      glintTranslateX,
      open,
      close,
    } = useSheetAnimation();

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    // Auto-open on mount
    useEffect(() => {
      open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View
        style={[
          style,
          {
            transform: [{ scaleY: scaleAnim }],
            opacity: opacityAnim,
            // @ts-ignore — transformOrigin CSS passthrough for React Native Web
            transformOrigin: 'center bottom',
          },
        ]}
      >
        {/* Crease line 1 — flickers at first fold hesitation */}
        <Animated.View
          style={[styles.crease, { top: '33%', opacity: creaseOpacity1 }]}
          pointerEvents="none"
        />
        {/* Crease line 2 — flickers at second fold hesitation */}
        <Animated.View
          style={[styles.crease, { top: '66%', opacity: creaseOpacity2 }]}
          pointerEvents="none"
        />
        {/* Glint — diagonal light streak after unfold settles */}
        <View style={styles.glintContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.glintStripe,
              {
                opacity: glintOpacity,
                transform: [{ translateX: glintTranslateX }],
              },
            ]}
          />
        </View>
        {children}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  crease: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    height: 1.5,
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  glintContainer: {
    borderRadius: 18,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  glintStripe: {
    bottom: -40,
    position: 'absolute',
    top: -40,
    width: 80,
    // @ts-ignore — CSS gradient passthrough for React Native Web
    background:
      'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.04) 75%, transparent 100%)',
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="AnimatedSheet" --no-coverage
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AnimatedSheet.tsx src/components/__tests__/AnimatedSheet.test.tsx
git commit -m "feat: AnimatedSheet — paper-unfold wrapper with crease lines and light glint"
```

---

### Task 10: Wire AnimatedSheet into StorySheet + ComposeSheet

**Files:**
- Modify: `src/story/StorySheet.tsx`
- Modify: `src/compose/ComposeSheet.tsx`

- [ ] **Step 1: Update `src/story/StorySheet.tsx`**

Add imports at the top:

```tsx
import { useRef } from 'react';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
```

Inside the `StorySheet` function, add a ref:

```tsx
const sheetRef = useRef<AnimatedSheetRef>(null);
```

Replace the root `<View style={[styles.card, ...]}>` with `<AnimatedSheet>`, passing the card styles directly. The full JSX wrapper changes from:

```tsx
return (
  <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
    {/* ... */}
  </View>
);
```

To:

```tsx
return (
  <AnimatedSheet
    ref={sheetRef}
    style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
  >
    {/* ... */}
  </AnimatedSheet>
);
```

Find every place where `onClose` is called directly in `StorySheet.tsx` (the close button `onPress`):

```tsx
<Pressable onPress={onClose} style={styles.closeHitbox}>
```

Change to:

```tsx
<Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
```

- [ ] **Step 2: Update `src/compose/ComposeSheet.tsx`**

Add imports:

```tsx
import { useRef } from 'react';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
```

Add ref inside `ComposeSheet`:

```tsx
const sheetRef = useRef<AnimatedSheetRef>(null);
```

Replace root `<View style={[styles.card, ...]}>` with `<AnimatedSheet>`:

```tsx
return (
  <AnimatedSheet
    ref={sheetRef}
    style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
  >
    {/* ... */}
  </AnimatedSheet>
);
```

Find the close `Pressable` in the header:

```tsx
<Pressable onPress={onClose} style={styles.closeHitbox}>
```

Change to:

```tsx
<Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/story/StorySheet.tsx src/compose/ComposeSheet.tsx
git commit -m "feat: StorySheet + ComposeSheet use AnimatedSheet for paper-unfold transition"
```

---

### Task 11: Wire AnimatedSheet into ProfileModal + LanternSheet + SettingsSheet

**Files:**
- Modify: `src/profile/ProfileModal.tsx`
- Modify: `src/lantern/LanternSheet.tsx`
- Modify: `src/settings/SettingsSheet.tsx`

- [ ] **Step 1: Update `src/profile/ProfileModal.tsx`**

Add imports:

```tsx
import { useRef } from 'react';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
```

Add ref inside `ProfileModal`:

```tsx
const sheetRef = useRef<AnimatedSheetRef>(null);
```

Replace root `<View style={[styles.card, ...]}>` with:

```tsx
<AnimatedSheet
  ref={sheetRef}
  style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
>
```

Change `shadowColor: '#000'` → `'#1a0e00'` in `StyleSheet.create` `card` style.

Change close `Pressable` `onPress`:

```tsx
<Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
```

Add `fontFamily: theme.fontFamily` to the "your sulat" title Text style if not already present:

```tsx
<Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
  your sulat
</Text>
```

- [ ] **Step 2: Update `src/lantern/LanternSheet.tsx`**

Add imports:

```tsx
import { useRef } from 'react';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
```

Add ref inside `LanternSheet`:

```tsx
const sheetRef = useRef<AnimatedSheetRef>(null);
```

Replace root `<View style={[styles.card, ...]}>` with:

```tsx
<AnimatedSheet
  ref={sheetRef}
  style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
>
```

Change `shadowColor: '#000'` → `'#1a0e00'` in `StyleSheet.create` `card` style.

Change close `Pressable`:

```tsx
<Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
```

- [ ] **Step 3: Update `src/settings/SettingsSheet.tsx`**

Add imports:

```tsx
import { useRef } from 'react';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
```

Add ref inside `SettingsSheet`:

```tsx
const sheetRef = useRef<AnimatedSheetRef>(null);
```

Replace root `<View style={[styles.card, ...]}>` with:

```tsx
<AnimatedSheet
  ref={sheetRef}
  style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
>
```

Change `shadowColor: '#000'` → `'#1a0e00'` in `StyleSheet.create` `card` style.

Change close `Pressable`:

```tsx
<Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/profile/ProfileModal.tsx src/lantern/LanternSheet.tsx src/settings/SettingsSheet.tsx
git commit -m "feat: ProfileModal + LanternSheet + SettingsSheet use AnimatedSheet, warm shadows"
```

---

### Task 12: app/index.tsx — cozy UI polish

**Files:**
- Modify: `app/index.tsx`

No new tests needed — visual changes only.

- [ ] **Step 1: Add warm top border to the bottom nav bar in `app/index.tsx`**

In `StyleSheet.create`, find `bottomBar`:

```ts
bottomBar: {
  alignItems: 'center',
  bottom: 0,
  flexDirection: 'row',
  height: NAV_HEIGHT,
  justifyContent: 'space-around',
  left: 0,
  paddingBottom: 10,
  paddingHorizontal: 20,
  position: 'absolute',
  right: 0,
},
```

Add `borderTopColor` and `borderTopWidth`:

```ts
bottomBar: {
  alignItems: 'center',
  borderTopColor: 'rgba(244,201,122,0.08)',
  borderTopWidth: 1,
  bottom: 0,
  flexDirection: 'row',
  height: NAV_HEIGHT,
  justifyContent: 'space-around',
  left: 0,
  paddingBottom: 10,
  paddingHorizontal: 20,
  position: 'absolute',
  right: 0,
},
```

- [ ] **Step 2: Boost FAB shadow opacity**

In `StyleSheet.create`, find `fab`:

```ts
fab: {
  alignItems: 'center',
  borderRadius: 32,
  elevation: 8,
  height: 60,
  justifyContent: 'center',
  shadowColor: '#f4c97a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 12,
  width: 60,
},
```

Change `shadowOpacity: 0.5` → `shadowOpacity: 0.6`.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx
git commit -m "feat: cozy UI polish — nav bar warm border, FAB stronger glow"
```

---

## Self-Review Checklist

- [x] cardStyles `showPostmark` field — Task 1
- [x] Font size/lineHeight tuning for all 5 styles — Task 1
- [x] `StoryCardShell` extracted visual wrapper — Task 2
- [x] `Postmark` component (location + date, only when `showPostmark` + `locationLabel` present) — Task 3
- [x] `StoryCard` uses `StoryCardShell` + `Postmark`, new optional props — Task 4
- [x] `StorySheet` passes `locationLabel` + `createdAt`, warm shadow — Task 5
- [x] `ComposeCard` — transparent `TextInput` on card paper, card font, postmark — Task 6
- [x] `ComposeSheet` — `ComposeCard` replaces `TextInput`, warm location row — Task 7
- [x] `useSheetAnimation` — scaleY sequence with hesitations, creases, glint — Task 8
- [x] `AnimatedSheet` — wrapper, crease overlays, glint overlay, `transformOrigin` passthrough — Task 9
- [x] All 5 sheets wired with `AnimatedSheet` — Tasks 10, 11
- [x] Nav bar border + FAB glow — Task 12
- [x] Shadow color `#1a0e00` applied to all 5 sheets — Tasks 5, 7, 11
