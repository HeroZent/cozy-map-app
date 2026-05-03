# Sulat brand pass (web) — design spec

**Date:** 2026-05-04
**Scope:** web only
**Source handoff:** `.brand-handoff/` (extracted from `Test Logo.zip`, committed to repo for reference; can be deleted after this work lands)

## Why this is happening

Sulat shipped with placeholder branding: the `assets/icon.png` family is from the Expo template, the favicon is a default, and `SulatLogo` approximates a wordmark + dot lockup with the wrong proportions and font. The brand handoff package supplies a finalised visual identity (wordmark, glowing dot, lanterns-rising loader, app icon) plus production-ready assets at every required size. This pass installs that identity on the web build only — the native pass is a follow-up (see "Native pass — deferred" below).

A loader at startup is also part of this pass: today the web app shows a brief blank flash while the map and Supabase queries hydrate. The handoff defines a "lanterns rising" splash for that exact moment.

## Out of scope

These are intentionally deferred:

- **Native (iOS/Android) icon + splash wiring.** The handoff includes a full iOS asset catalog and Android adaptive-icon foreground/background. None of those files are referenced from `app.json` in this pass; current native paths (`./assets/icon.png`, etc.) stay untouched so native builds keep working. To be done in a follow-up after web is verified in production.
- **Native loader overlay + crossfade.** iOS launch storyboard cannot animate; the handoff prescribes a static splash followed by a post-launch animated screen with crossfade. That entire dance is deferred.
- **Theme-token migration.** The current `lanternGlow` theme uses `#f4c97a` for accent; the brand spec uses `#E8B86A` (wordmark) and `#F2D08C` (dot). The new `SulatLogo` will hardcode the brand-exact values. That makes the wordmark amber slightly different from every other accent on screen. We accept that visual delta in this pass and revisit theme-token migration as a separate effort.
- **Brand-font bundling for native.** Cormorant Garamond, Crimson Pro, and JetBrains Mono are loaded from Google Fonts on web only. Native falls back to system serif (Georgia) and system mono on the eventual native pass; embedding those fonts into the native bundle is a separate decision.
- **Tagline copywriting review.** The handoff suggests `"a place for letters in the dark"` and `"FINDING NEARBY LANTERNS…"`. Both ship as proposed; the latter becomes state-aware in a future pass.

## Architecture

Three pieces, each in its own module, plus straight asset drops:

1. **Brand assets** land under `public/` (web favicons + apple-touch-icon) and `assets/brand/` (master SVG + native icon set, staged but unused until the native pass).
2. **`SulatLogo`** rebuild — same file path, new internals, faithful to the handoff spec. Adds an optional `breathing` prop used by the loader.
3. **`SulatLoader`** new component — composes the lanterns-rising scene, gated on data-loading state with a 1200 ms minimum-show floor and a 400 ms crossfade-out.

Component-level boundaries:

| Unit | Responsibility | Dependencies |
|---|---|---|
| `SulatLogo` | Wordmark + glowing dot lockup; optional breathing animation | none (pure) |
| `SulatLantern` | One SVG lantern glyph per spec | none (pure) |
| `SulatLoader` | Background gradient + star field + lantern field + center lockup + bottom label + crossfade dismiss | `SulatLogo`, `SulatLantern` |
| `app/index.tsx` | Mount the loader on first render; decide when to dismiss | `useStories`, `SulatLoader` |

## Brand assets

### Files dropped into `public/`

These are served at the site root by Expo's web build:

- `favicon.ico` (multi-res 16/32/48)
- `favicon-16.png`, `favicon-32.png`, `favicon-192.png`
- `apple-touch-icon.png` (180×180)

The other PNG sizes from the handoff (`favicon-48/64/96/128/256/512.png`) are also placed in `public/` as belt-and-braces for high-DPI lookups, even though the `<link>` tags only point at three of them.

### Files staged under `assets/brand/`

Not referenced this pass — held for the native pass:

- `sulat-icon-master.svg`
- `sulat-icon-1024.png`, `sulat-icon-1024-rounded.png`
- `ios/Icon-*.png` (full set)
- `android/ic_launcher*.png` (foreground, background, square, round)

### `public/index.html` changes

Adds the favicon block per the handoff and the brand-font `<link>` (only the two faces actually used):

- `Cormorant Garamond:ital,wght@1,500` (italic 500 — wordmark, tagline)
- `JetBrains Mono:wght@400` (regular — bottom mono label)

The Google-Fonts request is appended to the existing handwritten-fonts request so it remains a single CSS round-trip. Total added font weight ≈ 10–15 KB compressed.

`<meta name="theme-color" content="#0B1326">` is added.

The existing `<title>` stays as-is — the handoff's suggested `"sulat — letters in the dark"` is a tagline change, separate from this branding pass.

### `app.json` changes

`web.favicon` is updated to `"./public/favicon-32.png"` so Expo's CLI doesn't auto-emit a stale favicon link that overrides our explicit ones. (This is belt-and-braces — Expo's web template uses `<head>` injection from `app.json` only if not present in `public/index.html`, but being explicit prevents drift.) iOS/Android icon paths in `app.json` stay untouched.

## `SulatLogo` rebuild

File: [src/brand/SulatLogo.tsx](cozy-map-app/src/brand/SulatLogo.tsx)

### Props

```ts
interface SulatLogoProps {
  /** Font size of the wordmark in px. Dot scales proportionally (13% of fontSize). */
  size?: number;        // default 26
  /** When true, applies a 3.4s ease-in-out breathing animation (scale + brightness). */
  breathing?: boolean;  // default false
}
```

### Visuals (per handoff)

- Wordmark text: `sulat`, lowercase, italic, font-family `'Cormorant Garamond', Georgia, serif`, weight 500
- Wordmark color: `#E8B86A` (brand-exact, NOT `theme.accent`)
- Wordmark letter-spacing: `-0.02em`
- Wordmark line-height: `1.0`
- Dot diameter: `Math.round(size * 0.13)` — was 0.24 in current implementation
- Dot color: `#F2D08C`
- Dot margin-left: `Math.round(size * 0.04)`
- Dot baseline alignment via `alignSelf: flex-end` + small `marginBottom` to sit on the wordmark baseline. (The handoff's "baseline-aligned" is achievable in RN-Web via flex `alignItems: baseline`; we use the existing flex-end approach because flex baseline alignment is unreliable across RN-Web versions.)

### Glow (web-faithful, native-degraded)

The handoff specifies a two-layer glow. RN's `shadow*` style props produce a single layer. On web RN-Web supports `boxShadow` in style (string form). The dot uses both:

```tsx
const innerBlur = size * 0.18;
const innerSpread = size * 0.04;
const outerBlur = size * 0.50;
const outerSpread = size * 0.10;

<View
  style={[
    styles.dot,
    Platform.OS === 'web' ? {
      boxShadow:
        `0 0 ${innerBlur}px ${innerSpread}px rgba(242,208,140,0.7), ` +
        `0 0 ${outerBlur}px ${outerSpread}px rgba(232,184,106,0.4)`,
    } : {
      // native fallback: single layer via shadowColor/shadowRadius
      shadowColor: '#E8B86A',
      shadowOpacity: 1,
      shadowRadius: outerBlur,
      shadowOffset: { width: 0, height: 0 },
      elevation: 6,
    },
  ]}
/>
```

This means the native build still gets a glow (not pixel-faithful), and web is exact. Acceptable since native is out of scope this pass anyway.

### Breathing animation (web only this pass)

When `breathing={true}`:

- The whole `<View>` lockup gets `animationName: 'sulatBreathe'` with 3.4s ease-in-out infinite.
- Keyframes: `0%/100% { transform: scale(1); filter: brightness(1); } 50% { transform: scale(1.03); filter: brightness(1.15); }`.
- Keyframes injected once at module scope via a `<style>` tag (matches the existing pattern for handwritten fonts).
- On native, `breathing` is a no-op (we'd switch to `react-native-reanimated` in the native pass).

### Existing call-sites

Five places use `SulatLogo` today: [app/index.tsx](cozy-map-app/app/index.tsx), [app/privacy.tsx](cozy-map-app/app/privacy.tsx), [app/terms.tsx](cozy-map-app/app/terms.tsx), [src/cluster/ClusterStoriesSheet.tsx](cozy-map-app/src/cluster/ClusterStoriesSheet.tsx). The signature change (adds optional prop, no removed props) keeps all of them compiling. They get the new look automatically.

## `SulatLoader` component

File (new): [src/brand/SulatLoader.tsx](cozy-map-app/src/brand/SulatLoader.tsx)

### Props

```ts
interface SulatLoaderProps {
  /** When false, the loader begins its 400ms fade-out then unmounts. */
  visible: boolean;
  /** Fired after the fade-out transition completes. */
  onDismissed?: () => void;
}
```

### Layout (full-bleed)

`StyleSheet.absoluteFill` over the route, `zIndex: 9999`, pointer-events accept (block underlying interactions while shown).

### Background (z 0)

Single `<View>` with inline `background: 'linear-gradient(180deg, #06091A 0%, #0D1A30 60%, #1A2440 100%)'` plus a child `<View>` for the bottom horizon haze using `radial-gradient(ellipse at 50% 100%, rgba(232,184,106,0.25), transparent 70%)` anchored 0/0/0/auto, height 200px.

### Star dust (z 1)

30 stars, deterministic positions from a fixed seed (so SSR and CSR match if Expo enables static rendering later). Each star is a 1×1 `<View>` scaled via `transform`. CSS animation: `sulatTwinkle` 3s ease-in-out infinite, opacity `0.15 → 0.7`, random `animation-delay` 0–4s baked in. Color `#F2D08C`.

### Floating lanterns (z 2)

11 `SulatLantern` glyphs, each in an absolutely-positioned wrapper. Each wrapper has:

- `top: random(100%-130%)` (initial — below the viewport)
- `left: random(0–100%)`
- size: random 6–18px wide
- animation: `sulatRise` 12–22s linear infinite (random duration per lantern), with a negative `animation-delay` between `-0s` and `-22s` so the field is steady-state on first frame.

`@keyframes sulatRise`:

```
0%   { transform: translate(0, 0); opacity: 0; }
10%  { opacity: 1; }
50%  { transform: translate(var(--swayX), -65vh); opacity: 1; }
90%  { opacity: 1; }
100% { transform: translate(var(--swayX), -130vh); opacity: 0; }
```

`--swayX` is set per-lantern as a CSS custom property (`-4px` to `+4px`). The lantern's halo opacity also pulses 3s `0.18 → 0.32 → 0.18`.

### Center lockup (z 5)

- `<SulatLogo size={60} breathing />`
- 16px gap below
- Tagline: `<Text>` with `"a place for letters in the dark"`, font Cormorant Garamond italic 14px, color `rgba(242,208,140,0.7)`, letter-spacing `0.3px`

### Bottom label (z 5)

- Position: `bottom: 56`, full-width centered
- Text: `FINDING NEARBY LANTERNS…`
- Font: JetBrains Mono 9px, letter-spacing 3px, uppercase
- Color: `rgba(232,184,106,0.4)`

### `SulatLantern` glyph

Inline SVG, viewBox 28×38, per the handoff "Lantern Glyph" section. Single component, takes a `size` prop (width in px). Halo and body use `<radialGradient>` defined inline.

### Crossfade dismiss

- Wrapper has `transition: opacity 400ms ease-out` (web) / `Animated.timing` (native — but no-op this pass).
- When `visible` flips false, opacity transitions to 0; on `transitionend`, `onDismissed` fires.
- Container then unmounts via parent state change (loader is conditionally rendered; the parent keeps it in the tree until `onDismissed`).

## Loader gating in `app/index.tsx`

Local state, no global context. The loader is a sibling of the existing map content, rendered as an overlay above it.

```tsx
const { stories, loading, error } = useStories(/* existing call */, refreshKey);

const [loaderVisible, setLoaderVisible] = useState(true);
const [loaderInTree, setLoaderInTree] = useState(true);
const mountedAt = useRef(Date.now());

const MIN_SHOW_MS  = 1200;
const HARD_CAP_MS  = 8000;

useEffect(() => {
  // Hard cap: even if loading never flips false, never trap the user on the splash.
  const cap = setTimeout(() => setLoaderVisible(false), HARD_CAP_MS);
  return () => clearTimeout(cap);
}, []);

useEffect(() => {
  if (loading) return;             // still loading — wait for !loading or hard cap
  const elapsed = Date.now() - mountedAt.current;
  const wait = Math.max(0, MIN_SHOW_MS - elapsed);
  const t = setTimeout(() => setLoaderVisible(false), wait);
  return () => clearTimeout(t);
}, [loading]);

// in JSX:
{loaderInTree && (
  <SulatLoader
    visible={loaderVisible}
    onDismissed={() => setLoaderInTree(false)}
  />
)}
```

`error` from `useStories` does not block dismissal — the loader still hides on error so the user sees whatever the map's error state looks like. (Reviewing this in the spec self-check: yes, this is correct — a loader that hangs forever on a Supabase error would be worse UX than letting the underlying error state show.) The hard cap (`HARD_CAP_MS`) is the second backstop: even if `loading` somehow never flips false, the loader dismisses at 8 seconds.

The map and other UI render normally underneath; while the loader is visible, the user can't see the map mid-load. Once the loader fades, the map is already painted underneath.

## Testing

### Unit tests

- **`SulatLogo`**
  - Renders the wordmark text "sulat" with fontStyle italic.
  - Dot is 13% of given fontSize (e.g. size 60 → dot 8px).
  - With `breathing` prop, applies the breathing animation class/style.

- **`SulatLoader`**
  - Mounts with opacity 1 when `visible=true`.
  - On `visible=false` after ≥ 1200 ms shown, opacity transitions to 0.
  - `onDismissed` fires after the transition completes (use jest fake timers).
  - Star count is 30 and lantern count is 11 (smoke check).

- **`SulatLantern`** — renders an SVG with the right viewBox; smoke check.

### Integration test (existing harness)

Add a single test in [app/__tests__/](cozy-map-app/app/) (or similar location for Expo Router route tests) that:

- Renders `app/index.tsx` with `useStories` mocked to take 50ms then resolve.
- Asserts loader is visible immediately on mount.
- Advances timers past 1200ms.
- Asserts loader has begun dismissing.

A second test asserts the 8-second hard cap: `useStories` mocked to never resolve, fake-timer-advance to 8000ms, assert loader has begun dismissing.

### Visual verification (in-browser)

- Use the existing `mcp__Claude_Preview__preview_*` tools to start/inspect the dev server.
- Take a `preview_screenshot` mid-load and post-load to confirm visual fidelity matches the handoff `Sulat Loading & Logo.html` reference.
- Confirm Cormorant Garamond + JetBrains Mono actually load (no FOUT-to-system-fallback that sticks).

## Risks and mitigations

- **`box-shadow` two-layer glow on web works but isn't visually stable across browsers.** Mitigation: visual verification step in three browsers (Chrome, Safari, Firefox) before claiming done. If a browser misrenders, fall back to a single `0 0 (outerBlur) (outerSpread) rgba(...)` shadow.
- **Google Fonts request blocking first paint.** Existing `<link rel="preconnect">` for `fonts.googleapis.com` already mitigates this. We're adding two new font faces to an existing CSS request — no new TCP connection needed.
- **Star/lantern positions reshuffling on every render.** Mitigation: deterministic seeded random, computed once at module scope (not in component body). Verify in test by mounting twice and asserting same `top`/`left` values.
- **Loader staying mounted forever if `useStories` never resolves.** `useStories` always either resolves to data or sets `error`, both of which flip `loading` to `false`. The 8-second hard cap in the gating logic above is the explicit backstop for the pathological case (e.g. fetch hung but no error fired).
- **Body scroll on the loader page.** `public/index.html`'s `expo-reset` style sets `body { overflow: hidden }` already, so this is fine. No new scroll lock needed.

## Native pass — deferred

When this lands and verifies on web, the native pass picks up:

- Drop iOS PNGs into Xcode's Assets.xcassets / AppIcon (or use Expo's `expo-build-properties` icon paths in `app.json`).
- Drop Android adaptive-icon foreground + background into `res/mipmap-xxxhdpi/`; create `res/mipmap-anydpi-v26/ic_launcher.xml`. With Expo prebuild the simpler path is to update `app.json`'s `android.adaptiveIcon` to point at the new files.
- Configure a static `expo-splash-screen` image (single frame from the loader scene) for the storyboard launch.
- Wire `SulatLoader` as a post-launch overlay on app mount, with `expo-splash-screen.hideAsync()` after the first frame of the React loader paints (crossfade from native splash to React loader).
- Port the breathing/twinkle/rising animations to `react-native-reanimated` for native fidelity (web's CSS keyframes don't translate).
- Bundle Cormorant Garamond, Crimson Pro, JetBrains Mono via `expo-font` + `useFonts()` (the existing `_layout.tsx` comment already calls out this insertion point).
- Re-run all five existing `SulatLogo` call-sites + the loader in iOS Simulator and an Android emulator before claiming native parity.
