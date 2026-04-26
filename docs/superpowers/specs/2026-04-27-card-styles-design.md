# Sulat Card Styles — Design Spec

**Date:** 2026-04-27

---

## Goal

Give each sulat a unique visual identity by letting authors choose from five handwritten-letter paper styles. The chosen style is stored on the story permanently and rendered for every viewer. Claimed-handle users set a personal default in their profile; any user can override the style per-sulat at compose time. Future premium styles will be gated behind a paywall using the same data model.

---

## Background

Five visual styles were designed and validated during visual-companion brainstorming:

| ID | Name | Description |
|----|------|-------------|
| `a` | Warm Parchment | Light aged-paper, ruled lines, Kalam font |
| `b` | Dark Candlelight | Deep sepia/brown, Caveat font, amber glow |
| `c` | Torn Letter | Light parchment, torn top edge, Dancing Script, wax-seal |
| `d` | Midnight Journal | Deep indigo, purple ruled lines, left margin stripe, Patrick Hand |
| `e` | Folded Corner | Vellum paper, dog-ear fold, golden shadow edge, Reenie Beanie |

All five are `tier: 'free'`. Future paid styles add a new object with `tier: 'premium'` to the registry — no other code changes required.

---

## Data Model

### Migration: `stories` table

```sql
ALTER TABLE stories
  ADD COLUMN card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (card_style ~ '^[a-z0-9_]{1,32}$');
```

The CHECK constraint is intentionally loose — it allows future style IDs without a migration.

### Migration: `users` table

```sql
ALTER TABLE users
  ADD COLUMN preferred_card_style TEXT NOT NULL DEFAULT 'a'
  CHECK (preferred_card_style ~ '^[a-z0-9_]{1,32}$');
```

`preferred_card_style` lives on `users` (same table as `display_handle`). No separate profiles table needed.

---

## TypeScript Types

### `src/story/cardStyles.ts` (new file)

```ts
export type CardStyleId = 'a' | 'b' | 'c' | 'd' | 'e';

export interface CardStyleDef {
  id: CardStyleId;
  label: string;
  tier: 'free' | 'premium';
  // Background
  backgroundColors: string[];   // 1 = solid, 2+ = linear gradient top→bottom
  backgroundAngle: number;      // degrees (0 = top→bottom, 135 = diagonal)
  // Text
  textColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  locationColor: string;
  footerColor: string;
  // Decorative flags
  ruledLines: boolean;
  ruledLineColor: string;       // rgba
  foldCorner: boolean;
  foldColor: string;
  tornTopEdge: boolean;
  leftMarginStripe: boolean;
  leftMarginColor: string;
  pillFooter: boolean;          // Style B: reply count wrapped in rounded pill
  sealFooter: boolean;          // Style C: wax-seal ✦ replaces reply count icon
  // Chrome
  borderColor: string;          // outer border / outline (rgba)
  shadowColor: string;
}

export const CARD_STYLES: CardStyleDef[] = [
  {
    id: 'a',
    label: 'Warm Parchment',
    tier: 'free',
    backgroundColors: ['#f7edcc', '#ecddb0', '#f2e5bc'],
    backgroundAngle: 160,
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
    backgroundAngle: 155,
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
    backgroundAngle: 160,
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
    backgroundColors: ['#0f0c1a'],
    backgroundAngle: 0,
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
    backgroundAngle: 170,
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

### `src/data/types.ts` — additions

```ts
import type { CardStyleId } from '@/story/cardStyles';

// Add to Story interface:
card_style: CardStyleId;

// Add to User interface:
preferred_card_style: CardStyleId;
```

---

## Components

### `src/story/StoryCard.tsx` (new file)

Unified card renderer. Replaces the plain text body in `StorySheet`.

**Props:**
```ts
interface StoryCardProps {
  story: Story;
  /** Strip chrome (close, flag, reactions) — used for preview swatches. Default false. */
  previewOnly?: boolean;
}
```

**Render structure:**
```
<View card>                             ← background gradient (expo-linear-gradient)
  {tornTopEdge && <TornEdgeStrip />}    ← SVG wavy strip at top
  {ruledLines && <RuledLineOverlay />}  ← absolutely positioned line rows
  {leftMarginStripe && <MarginStripe />}← left-edge accent View
  {foldCorner && <FoldCornerTriangle />}← top-left triangle View

  <Text locationLabel />
  <Text body fontFamily=… fontSize=… lineHeight=… />
  <View footer>
    mood · time
    {pillFooter ? <PillView>💬 N</PillView> : <Text>💬 N</Text>}
    {sealFooter && replyCount > 0 && <WaxSeal />}
  </View>
</View>
```

**Private decorative sub-components** (all in same file, not exported):
- `TornEdgeStrip` — A 22px tall `View` rendered above the card body. Since the app targets web (React Native Web), the inner `View` uses an inline `style` with `clipPath: 'polygon(...)'` matching the torn-edge polygon from the design mockup. This is supported by React Native Web's inline style passthrough to the DOM. The card background color fills the clip shape so it appears as a torn paper edge against the app background.
- `RuledLineOverlay` — absolutely positioned `View` with repeated `borderBottomWidth: 1, borderBottomColor: ruledLineColor` rows spaced at `lineHeight`.
- `MarginStripe` — `position: absolute, left: 0, top: 0, bottom: 0, width: 3` View.
- `FoldCornerTriangle` — `position: absolute, top: 0, left: 0` View with `borderTopLeftRadius: 4` and triangle formed by `borderWidth` trick.
- `WaxSeal` — 28×28 circular View with radial gradient background and `✦` text.

### `src/story/StylePicker.tsx` (new file)

Horizontal scroll row of style swatches used in both ProfileModal and ComposeSheet.

**Props:**
```ts
interface StylePickerProps {
  selected: CardStyleId;
  onSelect: (id: CardStyleId) => void;
  showLabel?: boolean;  // true in profile, false in compose
}
```

Each swatch is a 48×48 rounded View showing the card's primary background color (first `backgroundColors` value for free styles). Premium swatches render at 50% opacity with a `🔒` overlay and do not call `onSelect`. Selected swatch has a 2px gold (#f4c97a) ring.

---

## New Dependencies

These packages are not currently in `package.json` and must be installed:

```bash
npx expo install expo-linear-gradient expo-font \
  @expo-google-fonts/kalam \
  @expo-google-fonts/caveat \
  @expo-google-fonts/dancing-script \
  @expo-google-fonts/patrick-hand \
  @expo-google-fonts/reenie-beanie
```

| Package | Purpose |
|---------|---------|
| `expo-linear-gradient` | Gradient backgrounds on card styles A, B, C, E |
| `expo-font` | `useFonts` hook for loading handwriting fonts |
| `@expo-google-fonts/kalam` | `Kalam_400Regular` — Style A |
| `@expo-google-fonts/caveat` | `Caveat_400Regular` — Style B |
| `@expo-google-fonts/dancing-script` | `DancingScript_400Regular` — Style C |
| `@expo-google-fonts/patrick-hand` | `PatrickHand_400Regular` — Style D |
| `@expo-google-fonts/reenie-beanie` | `ReenieBeanie_400Regular` — Style E |

## Font Loading

`app/_layout.tsx` is updated to load all five fonts before rendering. The `Stack` is only mounted once `fontsLoaded` is true:

```tsx
import { useFonts } from 'expo-font';
import { Kalam_400Regular } from '@expo-google-fonts/kalam';
import { Caveat_400Regular } from '@expo-google-fonts/caveat';
import { DancingScript_400Regular } from '@expo-google-fonts/dancing-script';
import { PatrickHand_400Regular } from '@expo-google-fonts/patrick-hand';
import { ReenieBeanie_400Regular } from '@expo-google-fonts/reenie-beanie';

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

---

## Modified Files

### `src/data/types.ts`
- Add `card_style: CardStyleId` to `Story`
- Add `preferred_card_style: CardStyleId` to `User`

### `src/data/useStories.ts`
- Add `card_style` to the `SELECT` constant:
  ```ts
  const SELECT = 'id, author_id, mood, body, card_style, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, reactions(emoji, user_id), replies(count)';
  ```

### `src/data/useCreateStory.ts`
- Add `cardStyle: CardStyleId` to `CreateStoryArgs`
- Pass `card_style: cardStyle` in the `supabase.functions.invoke` body

### `supabase/functions/create-story/index.ts`
- Add `card_style?: string` to `CreateStoryBody`
- Validate: if provided, must match `/^[a-z0-9_]{1,32}$/`; defaults to `'a'`
- Include `card_style` in the `stories` INSERT

### `src/story/StorySheet.tsx`
- Replace the `<ScrollView><Text body /></ScrollView>` block with `<StoryCard story={story} />`
- StorySheet keeps its existing chrome (location header, close, flag, ReactionBar, ReplyThread, footer)

### `src/compose/ComposeSheet.tsx`
- Import `useUser` and read `user?.preferred_card_style ?? DEFAULT_CARD_STYLE` on mount
- Add `selectedStyle: CardStyleId` local state, initialised from user preference
- Render `<StylePicker selected={selectedStyle} onSelect={setSelectedStyle} />` below the mood picker
- Pass `cardStyle: selectedStyle` to `useCreateStory`

### `src/profile/ProfileModal.tsx`
- Below the HandleClaim / handle display section, add a "paper style" section:
  - Only rendered when `displayHandle !== null` (i.e., handle is claimed)
  - Label: "your paper" (small muted text)
  - `<StylePicker selected={preferredStyle} onSelect={handleStyleChange} showLabel />`
- `handleStyleChange` calls:
  ```ts
  await supabase.from('users')
    .update({ preferred_card_style: id })
    .eq('id', user.id);
  setPreferredStyle(id);
  ```
- Brief "Saved ✓" inline confirmation (fade out after 1.5s using `setTimeout` + local state)

### `app/_layout.tsx`
- Load all five handwriting fonts with `useFonts`

---

## Data Flow

```
1. User claims handle
   → users.preferred_card_style = 'a' (default, already in DB)

2. User opens Profile → taps Style C swatch
   → users.preferred_card_style = 'c' (instant Supabase update)
   → "Saved ✓" shown briefly

3. User opens Compose
   → useUser() returns user.preferred_card_style = 'c'
   → StylePicker initialised on C

4. User taps Style E swatch in Compose
   → local selectedStyle = 'e'
   → user.preferred_card_style stays 'c' (no DB write)

5. User posts sulat
   → create-story invoked with card_style = 'e'
   → stories INSERT: card_style = 'e'

6. Anyone opens that sulat's StorySheet
   → story.card_style = 'e'
   → StoryCard renders Style E (Folded Corner)
```

---

## Anonymous Users

Anonymous users (no claimed handle) can still pick a style per-sulat in ComposeSheet. The StylePicker defaults to `'a'` when `user.preferred_card_style` is not yet set or the user hasn't loaded. The profile "paper style" section is hidden until a handle is claimed.

---

## Premium Styles (Future)

To add a paid style:
1. Add a new `CardStyleDef` object to `CARD_STYLES` with `tier: 'premium'`
2. The `StylePicker` automatically renders it with a 🔒 overlay
3. Implement a paywall check on `onSelect` — if tier is `'premium'` and user hasn't purchased, show upgrade prompt instead of selecting

No other code changes required.

---

## Testing

- `cardStyles.test.ts` — `getCardStyle` returns correct def, fallback to 'a' on unknown id
- `StylePicker.test.tsx` — renders all 5 swatches, calls onSelect on tap, shows gold ring on selected, premium swatch does not call onSelect
- `StoryCard.test.tsx` — renders body text, renders decorative elements per flags (ruledLines, foldCorner, tornTopEdge, leftMarginStripe, sealFooter, pillFooter)
- `ComposeSheet.test.tsx` — initialises StylePicker from user preference, override does not mutate preference, card_style passed to create hook
- `ProfileModal.test.tsx` — style picker hidden for unclaimed user, shown for claimed user, selecting calls supabase update, "Saved ✓" shown after update

---

## Migration Files

```
supabase/migrations/20260427000001_stories_card_style.sql
supabase/migrations/20260427000002_users_preferred_card_style.sql
```
