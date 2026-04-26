# Cozy UI — Letter Aesthetic, Compose Preview & Transitions Design

**Goal:** Make sulat feel like a real letter-writing experience — cards that look like paper, a compose editor where you write directly on the card, smooth paper-unfold transitions across all modals, and a handful of cozy UI polish touches.

**Architecture:** Four independent improvements that share the card style system as a foundation. No new data model changes. All animation uses React Native's built-in `Animated` API (transform + opacity only — compositor-safe, no repaints).

**Tech Stack:** React Native Web, Expo SDK 54, `expo-linear-gradient`, `Animated` API (built-in), existing `@expo-google-fonts/*` handwriting fonts.

---

## Section 1 — Compose editor: write directly on the card

### What changes

The plain `TextInput` box in `ComposeSheet` is replaced by a live card that uses the selected paper style as the writing surface. The user types directly onto the paper — what they see while composing is exactly what gets posted to the map.

### Component split

`StoryCard` is refactored into two pieces:

**`StoryCardShell`** (`src/story/StoryCardShell.tsx`) — the visual wrapper only. Accepts `cardStyle: CardStyleId` and `children: ReactNode`. Renders:
- `LinearGradient` background with `gradColors`, `gradientStart`, `gradientEnd`
- `RuledLineOverlay` (if `def.ruledLines`)
- `MarginStripe` (if `def.leftMarginStripe`)
- `FoldCornerTriangle` (if `def.foldCorner`)
- `TornEdgeStrip` above the gradient (if `def.tornTopEdge`)
- Outer `View` with `borderColor`, `borderWidth`, `shadowColor`

**`StoryCard`** (`src/story/StoryCard.tsx`) — same public API as today. Renders `StoryCardShell` with a `<Text>` child for the body. Also accepts new optional props:
- `locationLabel?: string | null`
- `createdAt?: string`
Used to render the postmark (Section 2).

**`ComposeCard`** (`src/compose/ComposeCard.tsx`) — new component. Renders `StoryCardShell` with a transparent `<TextInput>` child. The input's `fontFamily`, `fontSize`, `lineHeight`, `color`, and `placeholderTextColor` all come from the selected `CardStyleDef`. Props:
```ts
interface ComposeCardProps {
  cardStyle: CardStyleId;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  locationLabel: string | null;
  maxLength: number;
}
```

### ComposeSheet layout after change

```
[ Mood picker row          ]
[ Style swatch picker      ]
[ ComposeCard              ]  ← replaces TextInput
[ char count (right-align) ]
[ location row             ]
[ error text (if any)      ]
[ Post sulat button        ]
```

The `ComposeCard` shows a postmark in the top-right corner of the card using `locationLabel` + today's date (same as Section 2).

Changing the style swatch immediately re-renders `ComposeCard` with the new card style — background, font, and ruled lines all update live.

---

## Section 2 — Letter aesthetic: postmark + font polish

### Postmark

A circular ink-stamp element is added to `StoryCard`. It sits in the top-right corner of the card, overlapping the gradient background.

**New `CardStyleDef` field:**
```ts
showPostmark: boolean;
```
- `true` for warm/parchment styles: A (Warm Parchment), C (Torn Letter), E (Folded Corner)
- `false` for dark styles: B (Dark Candlelight), D (Midnight Journal) — stamp would clash

**New `StoryCard` props:**
```ts
locationLabel?: string | null;  // e.g. "Valenzuela, Metro Manila"
createdAt?: string;             // ISO string — formatted as "APR 27"
```

**Postmark visual:**
- Circular border, 52×52, `borderRadius: 26`
- Inner dashed circle at 6px inset
- Text: location (first segment before first comma, uppercase, truncated to 10 chars — e.g. `"Valenzuela, Metro Manila"` → `"VALENZUELA"`) + date (MMM DD format from `createdAt` — e.g. `"APR 27"`)
- Color: warm brown at 45% opacity for parchment styles (`rgba(120,80,20,0.45)`)
- `fontFamily: 'monospace'`, `fontSize: 7`, `lineHeight: 11`
- `zIndex: 2` — renders above ruled lines

**StorySheet** passes `story.location_label` and `story.created_at` to `StoryCard`.

**ComposeCard** passes `placeLabel` and `new Date().toISOString()` to its internal postmark.

### Font polish

No new fonts. Tuning only:

| Style | Current fontSize | New fontSize | lineHeight | Note |
|-------|-----------------|--------------|------------|------|
| A Warm Parchment | 17 | 18 | 34 | More breathing room |
| B Dark Candlelight | 20 | 20 | 32 | Slightly tighter |
| C Torn Letter | 19 | 20 | 32 | Match line rhythm |
| D Midnight Journal | 16 | 17 | 34 | Consistent with ruled lines |
| E Folded Corner | 21 | 21 | 32 | Already good |

`ComposeCard`'s `TextInput` uses the card's `fontFamily`, `fontSize`, `lineHeight`, `color` — typing feels like writing with a pen in the chosen style. `placeholderTextColor` is `def.textColor` at 40% opacity.

---

## Section 3 — Sheet transitions

### Animation design

All five bottom sheets get a **paper unfold** open animation and a matching close. The sequence on open:

1. **Unfold** (0.32s): sheet scales from `scaleY(0.04)` to `scaleY(1)` from a `bottom-center` origin, with two brief hesitations at 33% and 66% height (simulating a tri-folded letter snapping open), followed by a small elastic overshoot and settle.
2. **Glint** (0.30s, starts 0.34s after open begins — i.e. after unfold completes): a diagonal light streak sweeps from bottom-left to top-right across the fully-open sheet, like light catching freshly-unfolded paper.

Crease lines flicker at each hesitation point during the unfold.

Close: `scaleY(1)` → `scaleY(0.04)` in 0.14s, no glint.

**All animations use `transform` + `opacity` only** — compositor-safe, zero repaint.

### Implementation

**`src/hooks/useSheetAnimation.ts`** — new hook:
```ts
interface SheetAnimation {
  animatedStyle: { transform: object[]; opacity: Animated.Value };
  glintStyle: { opacity: Animated.Value; transform: object[] };
  creaseOpacity1: Animated.Value;
  creaseOpacity2: Animated.Value;
  open: () => void;
  close: (onDone: () => void) => void;
}
```

Internally uses `Animated.spring` for the scaleY unfold and `Animated.timing` for the glint and creases. The `open()` call sequences:
1. Reset values to initial state
2. Spring scaleY to 1 (tension: 280, friction: 24)
3. After 340ms: timing opacity for glint (fade in → sweep → fade out)

**`src/components/AnimatedSheet.tsx`** — wrapper component:
```tsx
export interface AnimatedSheetRef {
  open: () => void;
  close: (onDone: () => void) => void;
}
interface AnimatedSheetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}
```
Uses `useSheetAnimation` and exposes `open()`/`close()` via `useImperativeHandle` with `AnimatedSheetRef`.

**Each sheet** wraps its root `<View>` with `<AnimatedSheet ref={sheetRef}>` and calls `sheetRef.current.open()` in a `useEffect` on mount. The close button calls `sheetRef.current.close(onClose)` instead of calling `onClose` directly.

**Affected files:**
- `src/story/StorySheet.tsx`
- `src/compose/ComposeSheet.tsx`
- `src/profile/ProfileModal.tsx`
- `src/lantern/LanternSheet.tsx`
- `src/settings/SettingsSheet.tsx`

**Crease lines:** two absolute `View`s at 33% and 66% height inside `AnimatedSheet`, opacity driven by `creaseOpacity1` / `creaseOpacity2`.

**Glint:** absolute `View` (overflow hidden) with an inner `View` whose `translateX` animates from `-60%` to `+60%` of the container width. Static diagonal gradient on the inner view.

---

## Section 4 — Cozy UI polish

Small touches across the app. No layout changes, no new components.

### Bottom nav bar (`app/index.tsx`)
- `borderTopColor: 'rgba(244,201,122,0.08)'`, `borderTopWidth: 1` on the bar
- FAB `shadowColor` stays `#f4c97a` (already warm) — increase `shadowOpacity` from current to `0.6` for a stronger candlelight glow

### Sheet headers
- `ComposeSheet` "New sulat" title: add `fontFamily: theme.fontFamily`
- `ProfileModal` "your sulat" title: add `fontFamily: theme.fontFamily`

### StorySheet footer separator
- Current: `💭 on my mind  ·  today` (two separate Text segments)
- Keep as-is — it already has the `·` separator. Ensure consistent spacing: `{mood?.emoji}{'  ·  '}{mood?.name}{'  ·  '}{timeLabel}` so mood name appears before time.

### Compose location row
- `locationPin` color: change from `theme.accent` to `'rgba(244,201,122,0.7)'` (slightly warmer, lower opacity)
- `locationTxt` color: change from `theme.textMuted` to `'rgba(244,201,122,0.5)'`

### Sheet shadow color
All five sheets: change `shadowColor: '#000'` to `shadowColor: '#1a0e00'` — a very dark warm amber so drop shadows read as candlelight depth rather than hard black.

---

## File Map

| File | Action |
|------|--------|
| `src/story/StoryCardShell.tsx` | **Create** — extracted visual wrapper |
| `src/story/StoryCard.tsx` | **Modify** — use StoryCardShell, add locationLabel/createdAt props, postmark |
| `src/compose/ComposeCard.tsx` | **Create** — card-as-editor component |
| `src/compose/ComposeSheet.tsx` | **Modify** — replace TextInput with ComposeCard, cozy polish |
| `src/story/cardStyles.ts` | **Modify** — add showPostmark field, tune font sizes/lineHeights |
| `src/story/StorySheet.tsx` | **Modify** — pass locationLabel+createdAt to StoryCard, AnimatedSheet, shadow color |
| `src/hooks/useSheetAnimation.ts` | **Create** — animation hook |
| `src/components/AnimatedSheet.tsx` | **Create** — animated wrapper component |
| `src/profile/ProfileModal.tsx` | **Modify** — AnimatedSheet, header font, shadow color |
| `src/lantern/LanternSheet.tsx` | **Modify** — AnimatedSheet, shadow color |
| `src/settings/SettingsSheet.tsx` | **Modify** — AnimatedSheet, shadow color |
| `app/index.tsx` | **Modify** — nav bar border + FAB glow |

---

## Testing

- `StoryCardShell` renders all 5 card styles without crashing
- `StoryCard` with `locationLabel` + `createdAt` shows postmark on styles A/C/E, not on B/D
- `ComposeCard` text input uses the card's font family and color
- Changing style swatch in `ComposeSheet` re-renders `ComposeCard` with new style
- `AnimatedSheet` open animation completes without jank (visual check)
- All 5 sheets open and close with the animation
- Existing StoryCard snapshot tests updated to include new props
