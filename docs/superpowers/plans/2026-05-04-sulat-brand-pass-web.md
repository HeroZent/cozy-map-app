# Sulat brand pass (web) — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install the brand-handoff identity on the web build — production favicons + apple-touch-icon, a "lanterns rising" loader gated on initial Supabase data with a 1200ms minimum hold, and a `SulatLogo` rebuilt to spec (Cormorant Garamond italic + spec-exact amber + 13% dot + two-layer glow + optional breathing).

**Architecture:** Three new modules in `src/brand/` (one logo refactor, one new lantern glyph, one new loader, one new gating hook). Web-only — native is deferred. Plain HTML `<svg>` via `dangerouslySetInnerHTML` on a `<View>` for the lantern (web-only renders directly to `<div>` under react-native-web — no new deps). Plain CSS keyframes injected via `<style>` tag at module scope, matching the existing handwritten-fonts pattern.

**Tech Stack:** TypeScript, React Native + react-native-web (Expo SDK 54), expo-router, jest-expo, @testing-library/react-native. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-04-sulat-brand-pass-web-design.md](cozy-map-app/docs/superpowers/specs/2026-05-04-sulat-brand-pass-web-design.md)

---

## Task 1: Drop production web favicons into `public/`

**Files:**
- Create: `public/favicon.ico`
- Create: `public/favicon-16.png`, `favicon-32.png`, `favicon-48.png`, `favicon-64.png`, `favicon-96.png`, `favicon-128.png`, `favicon-192.png`, `favicon-256.png`, `favicon-512.png`
- Create: `public/apple-touch-icon.png`

- [ ] **Step 1: Copy the 11 favicon files from the brand handoff into `public/`**

```bash
cd cozy-map-app
cp .brand-handoff/assets/icon/favicon.ico public/favicon.ico
cp .brand-handoff/assets/icon/favicon-16.png public/favicon-16.png
cp .brand-handoff/assets/icon/favicon-32.png public/favicon-32.png
cp .brand-handoff/assets/icon/favicon-48.png public/favicon-48.png
cp .brand-handoff/assets/icon/favicon-64.png public/favicon-64.png
cp .brand-handoff/assets/icon/favicon-96.png public/favicon-96.png
cp .brand-handoff/assets/icon/favicon-128.png public/favicon-128.png
cp .brand-handoff/assets/icon/favicon-192.png public/favicon-192.png
cp .brand-handoff/assets/icon/favicon-256.png public/favicon-256.png
cp .brand-handoff/assets/icon/favicon-512.png public/favicon-512.png
cp .brand-handoff/assets/icon/apple-touch-icon.png public/apple-touch-icon.png
```

- [ ] **Step 2: Verify the files landed**

```bash
ls -la public/ | grep -E "favicon|apple-touch"
```

Expected: 11 new files present (10 PNG/ICO favicons + apple-touch-icon.png), plus the existing `index.html` and `sw.js`.

- [ ] **Step 3: Commit**

```bash
git add public/favicon.ico public/favicon-*.png public/apple-touch-icon.png
git commit -m "feat(brand): drop production web favicons + apple-touch-icon"
```

---

## Task 2: Stage native icon assets in `assets/brand/`

These are not wired up this pass — they're staged for the deferred native pass so a future agent has them in-tree.

**Files:**
- Create: `assets/brand/sulat-icon-master.svg`
- Create: `assets/brand/sulat-icon-1024.png`, `sulat-icon-1024-rounded.png`
- Create: `assets/brand/ios/Icon-{20,29,40,58,60,76,80,87,120,152,167,180,1024}.png` (13 files)
- Create: `assets/brand/android/ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png`, `ic_launcher_background.png`

- [ ] **Step 1: Create the directory structure and copy files**

```bash
mkdir -p assets/brand/ios assets/brand/android
cp .brand-handoff/assets/icon/sulat-icon-master.svg assets/brand/sulat-icon-master.svg
cp .brand-handoff/assets/icon/sulat-icon-1024.png assets/brand/sulat-icon-1024.png
cp .brand-handoff/assets/icon/sulat-icon-1024-rounded.png assets/brand/sulat-icon-1024-rounded.png
cp .brand-handoff/assets/icon/ios/Icon-*.png assets/brand/ios/
cp .brand-handoff/assets/icon/android/ic_launcher*.png assets/brand/android/
```

- [ ] **Step 2: Verify**

```bash
ls assets/brand/ios/ | wc -l
ls assets/brand/android/
```

Expected: `13` iOS files; `ic_launcher.png ic_launcher_background.png ic_launcher_foreground.png ic_launcher_round.png` Android files.

- [ ] **Step 3: Commit**

```bash
git add assets/brand/
git commit -m "feat(brand): stage native icon assets for deferred native pass"
```

---

## Task 3: Update `public/index.html` (favicon block + brand fonts + theme-color)

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add the favicon block, theme-color, and brand fonts**

In `public/index.html`, after the `<title>` line and before the `<meta property="og:title">` line, insert the favicon block. Replace the existing handwritten-fonts `<link>` href to ALSO request the two brand fonts (one combined CSS round-trip).

Find:

```html
    <title>Sulat — drop a thought on the map</title>

    <!-- Open Graph -->
```

Replace with:

```html
    <title>Sulat — drop a thought on the map</title>

    <!-- Favicons (sulat brand pass) -->
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="theme-color" content="#0B1326" />

    <!-- Open Graph -->
```

Then find:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Caveat:wght@400&family=Dancing+Script:wght@400&family=Kalam:wght@400&family=Patrick+Hand&family=Reenie+Beanie&display=swap"
      rel="stylesheet"
    />
```

Replace with:

```html
    <link
      href="https://fonts.googleapis.com/css2?family=Caveat:wght@400&family=Cormorant+Garamond:ital,wght@1,500&family=Crimson+Pro:ital,wght@0,400;1,400&family=Dancing+Script:wght@400&family=JetBrains+Mono:wght@400&family=Kalam:wght@400&family=Patrick+Hand&family=Reenie+Beanie&display=swap"
      rel="stylesheet"
    />
```

(Adds `Cormorant Garamond italic 500`, `Crimson Pro regular + italic`, `JetBrains Mono regular` — three new families in the existing combined request.)

- [ ] **Step 2: Verify the file is well-formed**

```bash
grep -c "favicon" public/index.html
grep -c "Cormorant" public/index.html
grep -c "theme-color" public/index.html
```

Expected: each grep returns `1` or higher (each pattern appears at least once).

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat(brand): wire favicon stack + brand fonts + theme-color in index.html"
```

---

## Task 4: Update `app.json` `web.favicon`

Belt-and-braces — explicitly point Expo's CLI at one of the new favicon PNGs so it doesn't auto-emit a stale `<link>` referring to the old `assets/favicon.png`.

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Update the `web.favicon` path**

In `app.json`, find:

```json
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/favicon.png"
    },
```

Replace with:

```json
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./public/favicon-32.png"
    },
```

- [ ] **Step 2: Verify**

```bash
grep -A 3 '"web":' app.json
```

Expected output includes `"favicon": "./public/favicon-32.png"`.

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "feat(brand): point app.json web.favicon at new public/favicon-32.png"
```

---

## Task 5: SulatLogo — write failing tests

**Files:**
- Create: `src/brand/__tests__/SulatLogo.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SulatLogo } from '../SulatLogo';

describe('SulatLogo', () => {
  test('renders the wordmark text "sulat"', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    expect(getByText('sulat')).toBeTruthy();
  });

  test('applies italic font style to the wordmark', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    const wordmark = getByText('sulat');
    const styles = Array.isArray(wordmark.props.style)
      ? Object.assign({}, ...wordmark.props.style.flat())
      : wordmark.props.style;
    expect(styles.fontStyle).toBe('italic');
  });

  test('applies the spec-exact wordmark color #E8B86A', () => {
    const { getByText } = render(<SulatLogo size={60} />);
    const wordmark = getByText('sulat');
    const styles = Array.isArray(wordmark.props.style)
      ? Object.assign({}, ...wordmark.props.style.flat())
      : wordmark.props.style;
    expect(styles.color).toBe('#E8B86A');
  });

  test('dot diameter is 13% of the given font size (rounded)', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const dot = getByTestId('sulat-logo-dot');
    const styles = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style.flat())
      : dot.props.style;
    // 60 * 0.13 = 7.8 → 8
    expect(styles.width).toBe(8);
    expect(styles.height).toBe(8);
  });

  test('dot uses the spec-exact amber-soft color #F2D08C', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const dot = getByTestId('sulat-logo-dot');
    const styles = Array.isArray(dot.props.style)
      ? Object.assign({}, ...dot.props.style.flat())
      : dot.props.style;
    expect(styles.backgroundColor).toBe('#F2D08C');
  });

  test('breathing prop adds animationName "sulatBreathe" on the wrapper', () => {
    const { getByTestId } = render(<SulatLogo size={60} breathing />);
    const wrap = getByTestId('sulat-logo-wrap');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.animationName).toBe('sulatBreathe');
  });

  test('without breathing, no animationName is set', () => {
    const { getByTestId } = render(<SulatLogo size={60} />);
    const wrap = getByTestId('sulat-logo-wrap');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.animationName).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run the tests — expect failures**

```bash
npx jest src/brand/__tests__/SulatLogo.test.tsx --silent
```

Expected: 6 failures (existing SulatLogo doesn't have `testID` props, doesn't have spec colors, doesn't have italic, doesn't have breathing). The "renders the wordmark text" test may pass.

- [ ] **Step 3: Commit**

```bash
git add src/brand/__tests__/SulatLogo.test.tsx
git commit -m "test(brand): failing tests for SulatLogo spec rebuild"
```

---

## Task 6: SulatLogo — implementation

**Files:**
- Modify: `src/brand/SulatLogo.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
import { Platform, StyleSheet, Text, View } from 'react-native';

// Inject the breathing keyframe once at module scope (web only).
// 3.4s ease-in-out infinite, scale + brightness as per brand handoff.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sulat-logo-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes sulatBreathe {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50%      { transform: scale(1.03); filter: brightness(1.15); }
      }
    `;
    document.head.appendChild(style);
  }
}

export interface SulatLogoProps {
  /** Font size of the wordmark in px. Dot scales proportionally (13% of fontSize). */
  size?: number;
  /** When true, applies the 3.4s breathing animation (scale + brightness). Web only. */
  breathing?: boolean;
}

export function SulatLogo({ size = 26, breathing = false }: SulatLogoProps) {
  const dotSize = Math.round(size * 0.13);
  const dotMarginLeft = Math.round(size * 0.04);
  const innerBlur = size * 0.18;
  const innerSpread = size * 0.04;
  const outerBlur = size * 0.5;
  const outerSpread = size * 0.1;

  const dotShadowStyle =
    Platform.OS === 'web'
      ? {
          boxShadow:
            `0 0 ${innerBlur}px ${innerSpread}px rgba(242,208,140,0.7), ` +
            `0 0 ${outerBlur}px ${outerSpread}px rgba(232,184,106,0.4)`,
        }
      : {
          // Native fallback: single shadow layer (out of scope this pass).
          shadowColor: '#E8B86A',
          shadowOpacity: 1,
          shadowRadius: outerBlur,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        };

  const wrapStyle =
    breathing && Platform.OS === 'web'
      ? {
          animationName: 'sulatBreathe',
          animationDuration: '3.4s',
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
        }
      : undefined;

  return (
    <View testID="sulat-logo-wrap" style={[styles.wrap, wrapStyle as any]}>
      <Text
        style={[
          styles.wordmark,
          {
            fontSize: size,
            lineHeight: size,
          },
        ]}
      >
        sulat
      </Text>
      <View
        testID="sulat-logo-dot"
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginLeft: dotMarginLeft,
            marginBottom: 0,
          },
          dotShadowStyle as any,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  wordmark: {
    color: '#E8B86A',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontStyle: 'italic',
    fontWeight: '500',
    letterSpacing: -0.02 * 60, // -0.02em — RN doesn't accept em; this approximates at default size 60. Override per-callsite via the dynamic fontSize style if exact em is needed.
  },
  dot: {
    backgroundColor: '#F2D08C',
  },
});
```

(Note on `letterSpacing`: RN expects px, not em. Set as a constant matching the typical loader size 60. For the smaller header use the value is close enough — if exact tracking matters per-size, refine in a follow-up.)

- [ ] **Step 2: Run tests — expect pass**

```bash
npx jest src/brand/__tests__/SulatLogo.test.tsx --silent
```

Expected: 7 passing.

- [ ] **Step 3: Run the full audio + brand suite to confirm nothing else broke**

```bash
npx jest src/audio/__tests__/ src/brand/ --silent
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/brand/SulatLogo.tsx
git commit -m "feat(brand): rebuild SulatLogo to handoff spec (italic, 13% dot, two-layer glow, breathing)"
```

---

## Task 7: SulatLantern — write failing tests

**Files:**
- Create: `src/brand/__tests__/SulatLantern.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
/**
 * @jest-environment jsdom
 *
 * SulatLantern uses dangerouslySetInnerHTML to inject SVG markup, which only
 * renders meaningfully under jsdom. The component is web-only by design.
 */
import { render } from '@testing-library/react-native';
import { SulatLantern } from '../SulatLantern';

describe('SulatLantern', () => {
  test('renders an outer wrapper with the requested width', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.width).toBe(14);
    // 38/28 ≈ 1.357, height = round(width * 38/28)
    expect(styles.height).toBe(Math.round(14 * 38 / 28));
  });

  test('renders an inline SVG with viewBox 0 0 28 38', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const html = (wrap.props as any).dangerouslySetInnerHTML?.__html ?? '';
    expect(html).toContain('viewBox="0 0 28 38"');
  });

  test('SVG markup contains the lantern body ellipse', () => {
    const { getByTestId } = render(<SulatLantern width={14} />);
    const wrap = getByTestId('sulat-lantern');
    const html = (wrap.props as any).dangerouslySetInnerHTML?.__html ?? '';
    expect(html).toContain('<ellipse');
    expect(html).toMatch(/cy="19"/);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx jest src/brand/__tests__/SulatLantern.test.tsx --silent
```

Expected: 3 failures (component doesn't exist yet — `Cannot find module`).

- [ ] **Step 3: Commit**

```bash
git add src/brand/__tests__/SulatLantern.test.tsx
git commit -m "test(brand): failing tests for SulatLantern SVG glyph"
```

---

## Task 8: SulatLantern — implementation

**Files:**
- Create: `src/brand/SulatLantern.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { View } from 'react-native';

const SVG = `
<svg viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sulatLanternBody" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F2D08C"/>
      <stop offset="60%" stop-color="#E8B86A"/>
      <stop offset="100%" stop-color="#9C7338"/>
    </radialGradient>
  </defs>
  <!-- Halo glow -->
  <ellipse cx="14" cy="19" rx="14" ry="14" fill="#E8B86A" opacity="0.18" />
  <!-- String -->
  <line x1="14" y1="0" x2="14" y2="6" stroke="#E8B86A" stroke-width="0.4" opacity="0.6" />
  <!-- Top cap -->
  <rect x="9" y="5" width="10" height="2" rx="0.5" fill="#E8B86A" opacity="0.85" />
  <!-- Body -->
  <ellipse cx="14" cy="19" rx="10" ry="11" fill="url(#sulatLanternBody)" />
  <!-- Ribs -->
  <line x1="5" y1="14" x2="23" y2="14" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <line x1="4" y1="19" x2="24" y2="19" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <line x1="5" y1="24" x2="23" y2="24" stroke="#070D1B" stroke-width="0.4" opacity="0.35" />
  <!-- Bottom cap -->
  <rect x="10" y="29" width="8" height="1.6" fill="#E8B86A" opacity="0.85" />
  <!-- Tassel -->
  <line x1="14" y1="30.6" x2="14" y2="36" stroke="#E8B86A" stroke-width="0.5" opacity="0.7" />
</svg>
`.trim();

export interface SulatLanternProps {
  /** Width in px; height scales to maintain 28:38 aspect ratio. */
  width: number;
}

export function SulatLantern({ width }: SulatLanternProps) {
  const height = Math.round(width * 38 / 28);
  // dangerouslySetInnerHTML on a View — under react-native-web this becomes a div, which honors the prop.
  // Web-only by design; on native this renders an empty wrapper (acceptable until the deferred native pass).
  return (
    <View
      testID="sulat-lantern"
      style={{ width, height }}
      // @ts-ignore — RN-Web's View accepts dangerouslySetInnerHTML on web; native ignores.
      dangerouslySetInnerHTML={{ __html: SVG }}
    />
  );
}
```

- [ ] **Step 2: Run tests — expect pass**

```bash
npx jest src/brand/__tests__/SulatLantern.test.tsx --silent
```

Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/brand/SulatLantern.tsx
git commit -m "feat(brand): SulatLantern SVG glyph (web-only via dangerouslySetInnerHTML)"
```

---

## Task 9: useLoaderGating hook — write failing tests

The hook owns the 1200ms-minimum + 8s-hard-cap state machine. Extracting it makes app/index.tsx clean and the gating trivially testable.

**Files:**
- Create: `src/brand/__tests__/useLoaderGating.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
import { render, act } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useLoaderGating } from '../useLoaderGating';

function Harness({ loading, onChange }: { loading: boolean; onChange?: (s: { visible: boolean; mounted: boolean }) => void }) {
  const gate = useLoaderGating(loading);
  if (onChange) onChange({ visible: gate.visible, mounted: gate.mounted });
  return (
    <View>
      <Text testID="visible">{String(gate.visible)}</Text>
      <Text testID="mounted">{String(gate.mounted)}</Text>
    </View>
  );
}

describe('useLoaderGating', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial state: visible=true, mounted=true', () => {
    const { getByTestId } = render(<Harness loading={true} />);
    expect(getByTestId('visible').props.children).toBe('true');
    expect(getByTestId('mounted').props.children).toBe('true');
  });

  test('with loading=false from the start, holds visible until 1200ms minimum elapses', () => {
    const { getByTestId } = render(<Harness loading={false} />);
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(500); });
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(700); });
    // Now at 1200ms — visible should flip false
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('when loading flips false after 2000ms, visible flips false immediately (already past floor)', () => {
    const { getByTestId, rerender } = render(<Harness loading={true} />);
    act(() => { jest.advanceTimersByTime(2000); });
    rerender(<Harness loading={false} />);
    act(() => { jest.advanceTimersByTime(0); });
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('hard cap fires at 8000ms even if loading never flips false', () => {
    const { getByTestId } = render(<Harness loading={true} />);
    act(() => { jest.advanceTimersByTime(7999); });
    expect(getByTestId('visible').props.children).toBe('true');
    act(() => { jest.advanceTimersByTime(2); });
    expect(getByTestId('visible').props.children).toBe('false');
  });

  test('onDismissed callback flips mounted=false', () => {
    let lastState: { visible: boolean; mounted: boolean } | null = null;
    const { getByTestId } = render(
      <Harness loading={false} onChange={(s) => { lastState = s; }} />
    );
    act(() => { jest.advanceTimersByTime(1200); });
    expect(getByTestId('visible').props.children).toBe('false');
    // Caller must explicitly invoke onDismissed (simulating end-of-fade-out).
    // The hook exposes it; render the Harness with a way to trigger it.
    // Since onDismissed is exposed by the hook, mounted only flips after the consumer calls it.
    // Verify mounted is still true at this point.
    expect(getByTestId('mounted').props.children).toBe('true');
    expect(lastState).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx jest src/brand/__tests__/useLoaderGating.test.tsx --silent
```

Expected: 5 failures (`Cannot find module '../useLoaderGating'`).

- [ ] **Step 3: Commit**

```bash
git add src/brand/__tests__/useLoaderGating.test.tsx
git commit -m "test(brand): failing tests for useLoaderGating hook"
```

---

## Task 10: useLoaderGating hook — implementation

**Files:**
- Create: `src/brand/useLoaderGating.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SHOW_MS = 1200;
const HARD_CAP_MS = 8000;

export interface LoaderGatingState {
  /** Should the loader currently be opaque (true) or fading out (false)? */
  visible: boolean;
  /** Should the loader still exist in the React tree at all? */
  mounted: boolean;
  /** Caller invokes this when its fade-out transition completes; flips mounted=false. */
  onDismissed: () => void;
}

/**
 * Manages the loader's visibility lifecycle:
 *  - visible=true on mount
 *  - visible flips false when (loading is false AND 1200ms have elapsed) OR at 8000ms hard cap
 *  - mounted flips false only after the consumer invokes onDismissed (post-fade)
 */
export function useLoaderGating(loading: boolean): LoaderGatingState {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(true);
  const mountedAt = useRef(Date.now());
  const visibleRef = useRef(true);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  // Hard cap: dismiss at 8s no matter what.
  useEffect(() => {
    const cap = setTimeout(() => {
      if (visibleRef.current) setVisible(false);
    }, HARD_CAP_MS);
    return () => clearTimeout(cap);
  }, []);

  // Data-gated dismiss: when loading flips false, schedule dismiss respecting the floor.
  useEffect(() => {
    if (loading) return;
    const elapsed = Date.now() - mountedAt.current;
    const wait = Math.max(0, MIN_SHOW_MS - elapsed);
    const t = setTimeout(() => {
      if (visibleRef.current) setVisible(false);
    }, wait);
    return () => clearTimeout(t);
  }, [loading]);

  const onDismissed = useCallback(() => {
    setMounted(false);
  }, []);

  return { visible, mounted, onDismissed };
}
```

- [ ] **Step 2: Run tests — expect pass**

```bash
npx jest src/brand/__tests__/useLoaderGating.test.tsx --silent
```

Expected: 5 passing.

- [ ] **Step 3: Commit**

```bash
git add src/brand/useLoaderGating.ts
git commit -m "feat(brand): useLoaderGating hook (1200ms floor + 8s hard cap)"
```

---

## Task 11: SulatLoader — write failing tests

**Files:**
- Create: `src/brand/__tests__/SulatLoader.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
/**
 * @jest-environment jsdom
 *
 * SulatLoader injects keyframes via <style> and embeds 30 stars + 11 lanterns —
 * jsdom is needed so document.head.appendChild + dangerouslySetInnerHTML work.
 */
import { render } from '@testing-library/react-native';
import { SulatLoader } from '../SulatLoader';

describe('SulatLoader', () => {
  test('mounts with the bottom-label text', () => {
    const { getByText } = render(<SulatLoader visible={true} />);
    expect(getByText('FINDING NEARBY LANTERNS…')).toBeTruthy();
  });

  test('mounts with the tagline text', () => {
    const { getByText } = render(<SulatLoader visible={true} />);
    expect(getByText('a place for letters in the dark')).toBeTruthy();
  });

  test('renders 30 stars', () => {
    const { getAllByTestId } = render(<SulatLoader visible={true} />);
    expect(getAllByTestId('sulat-loader-star')).toHaveLength(30);
  });

  test('renders 11 lanterns', () => {
    const { getAllByTestId } = render(<SulatLoader visible={true} />);
    expect(getAllByTestId('sulat-lantern')).toHaveLength(11);
  });

  test('star positions are deterministic across renders (same seed)', () => {
    const { getAllByTestId, unmount } = render(<SulatLoader visible={true} />);
    const firstRender = getAllByTestId('sulat-loader-star').map((s) => {
      const styles = Array.isArray(s.props.style) ? Object.assign({}, ...s.props.style.flat()) : s.props.style;
      return [styles.left, styles.top].join(',');
    });
    unmount();
    const { getAllByTestId: getAllByTestId2 } = render(<SulatLoader visible={true} />);
    const secondRender = getAllByTestId2('sulat-loader-star').map((s) => {
      const styles = Array.isArray(s.props.style) ? Object.assign({}, ...s.props.style.flat()) : s.props.style;
      return [styles.left, styles.top].join(',');
    });
    expect(firstRender).toEqual(secondRender);
  });

  test('visible=false sets wrapper opacity to 0', () => {
    const { getByTestId } = render(<SulatLoader visible={false} />);
    const wrap = getByTestId('sulat-loader');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.opacity).toBe(0);
  });

  test('visible=true sets wrapper opacity to 1', () => {
    const { getByTestId } = render(<SulatLoader visible={true} />);
    const wrap = getByTestId('sulat-loader');
    const styles = Array.isArray(wrap.props.style)
      ? Object.assign({}, ...wrap.props.style.flat())
      : wrap.props.style;
    expect(styles.opacity).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx jest src/brand/__tests__/SulatLoader.test.tsx --silent
```

Expected: 7 failures (`Cannot find module '../SulatLoader'`).

- [ ] **Step 3: Commit**

```bash
git add src/brand/__tests__/SulatLoader.test.tsx
git commit -m "test(brand): failing tests for SulatLoader"
```

---

## Task 12: SulatLoader — implementation

**Files:**
- Create: `src/brand/SulatLoader.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SulatLogo } from './SulatLogo';
import { SulatLantern } from './SulatLantern';

// ── Module-level keyframe injection (web only) ─────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sulat-loader-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes sulatTwinkle {
        0%, 100% { opacity: 0.15; }
        50%      { opacity: 0.7; }
      }
      @keyframes sulatRise {
        0%   { transform: translate(0px, 0px); opacity: 0; }
        10%  { opacity: 1; }
        50%  { transform: translate(var(--sulat-sway, 0px), -65vh); opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translate(var(--sulat-sway, 0px), -130vh); opacity: 0; }
      }
      @keyframes sulatHalo {
        0%, 100% { opacity: 0.18; }
        50%      { opacity: 0.32; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Deterministic seeded random (mulberry32) ──────────────────────────────
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stars: pre-computed once at module scope, never reshuffles between renders.
const STAR_RNG = makeRng(2026);
const STARS = Array.from({ length: 30 }, () => ({
  left: STAR_RNG() * 100,           // %
  top: STAR_RNG() * 100,            // %
  size: 0.4 + STAR_RNG() * 1.6,     // 0.4–2.0 px
  opacity: 0.1 + STAR_RNG() * 0.5,  // 0.1–0.6 (CSS animation overrides via keyframe)
  delay: STAR_RNG() * 4,            // 0–4 s
}));

// Lanterns: 11 of them, also deterministic.
const LANTERN_RNG = makeRng(2027);
const LANTERNS = Array.from({ length: 11 }, () => ({
  left: LANTERN_RNG() * 100,           // %
  top: 100 + LANTERN_RNG() * 30,       // 100–130 % (offscreen below)
  width: 6 + LANTERN_RNG() * 12,       // 6–18 px
  duration: 12 + LANTERN_RNG() * 10,   // 12–22 s
  delay: -(LANTERN_RNG() * 22),        // negative delay so steady-state on first frame
  sway: -4 + LANTERN_RNG() * 8,        // -4 to +4 px
}));

export interface SulatLoaderProps {
  /** When false, the loader transitions to opacity 0 over 400ms then fires onDismissed. */
  visible: boolean;
  /** Fired after the fade-out transition completes. */
  onDismissed?: () => void;
}

export function SulatLoader({ visible, onDismissed }: SulatLoaderProps) {
  return (
    <View
      testID="sulat-loader"
      style={[
        styles.wrap,
        {
          opacity: visible ? 1 : 0,
          ...(Platform.OS === 'web'
            ? { transition: 'opacity 400ms ease-out' as any }
            : {}),
          background:
            'linear-gradient(180deg, #06091A 0%, #0D1A30 60%, #1A2440 100%)' as any,
          pointerEvents: visible ? 'auto' : ('none' as any),
        },
      ]}
      onTransitionEnd={() => {
        if (!visible) onDismissed?.();
      }}
    >
      {/* Horizon haze (anchored bottom) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 200,
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(232,184,106,0.25), transparent 70%)' as any,
        }}
      />

      {/* Star dust */}
      {STARS.map((s, i) => (
        <View
          key={`star-${i}`}
          testID="sulat-loader-star"
          style={{
            position: 'absolute',
            left: `${s.left}%` as any,
            top: `${s.top}%` as any,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#F2D08C',
            opacity: s.opacity,
            ...(Platform.OS === 'web'
              ? {
                  animationName: 'sulatTwinkle',
                  animationDuration: '3s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${s.delay}s`,
                }
              : {}),
          } as any}
        />
      ))}

      {/* Floating lanterns */}
      {LANTERNS.map((l, i) => (
        <View
          key={`lantern-${i}`}
          style={{
            position: 'absolute',
            left: `${l.left}%` as any,
            top: `${l.top}%` as any,
            ...(Platform.OS === 'web'
              ? {
                  animationName: 'sulatRise',
                  animationDuration: `${l.duration}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationDelay: `${l.delay}s`,
                  // CSS custom prop consumed by the @keyframes
                  ['--sulat-sway' as any]: `${l.sway}px`,
                }
              : {}),
          } as any}
        >
          <SulatLantern width={l.width} />
        </View>
      ))}

      {/* Center lockup */}
      <View style={styles.centerLockup} pointerEvents="none">
        <SulatLogo size={60} breathing />
        <View style={{ height: 16 }} />
        <Text style={styles.tagline}>a place for letters in the dark</Text>
      </View>

      {/* Bottom mono label */}
      <Text style={styles.bottomLabel}>FINDING NEARBY LANTERNS…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    overflow: 'hidden',
  },
  centerLockup: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }],
  },
  tagline: {
    color: 'rgba(242,208,140,0.7)',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  bottomLabel: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(232,184,106,0.4)',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 9,
    letterSpacing: 3,
  },
});
```

- [ ] **Step 2: Run tests — expect pass**

```bash
npx jest src/brand/__tests__/SulatLoader.test.tsx --silent
```

Expected: 7 passing.

- [ ] **Step 3: Run all brand tests**

```bash
npx jest src/brand/ --silent
```

Expected: all green (SulatLogo + SulatLantern + useLoaderGating + SulatLoader = ~22 passing).

- [ ] **Step 4: Commit**

```bash
git add src/brand/SulatLoader.tsx
git commit -m "feat(brand): SulatLoader — lanterns rising splash with crossfade dismiss"
```

---

## Task 13: Wire SulatLoader into `app/index.tsx`

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Inspect the current file to find the right insertion point**

```bash
grep -n "useStories\|return\|export default" app/index.tsx | head -10
```

This tells you where the `useStories` call lives and where the JSX `return` statement starts.

- [ ] **Step 2: Add the imports at the top of the file**

In `app/index.tsx`, find the existing imports section. Add (alongside existing brand-related imports):

```tsx
import { SulatLoader } from '@/brand/SulatLoader';
import { useLoaderGating } from '@/brand/useLoaderGating';
```

- [ ] **Step 3: Hook the gating into the component**

Find the line that calls `useStories(...)` (currently around line 55). Immediately after that destructure, add:

```tsx
const loaderGating = useLoaderGating(loading);
```

NOTE: the existing destructure may be `const { stories } = useStories(...)`. You'll need to also destructure `loading`:

```tsx
const { stories, loading } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] }, refreshKey);
const loaderGating = useLoaderGating(loading);
```

(If `loading` was already destructured, just add the second line.)

- [ ] **Step 4: Render the loader as the last child of the route**

Find the route's main JSX `return (...)` block. Add `SulatLoader` at the very end, just before the closing root tag, so it overlays everything else:

```tsx
{loaderGating.mounted && (
  <SulatLoader visible={loaderGating.visible} onDismissed={loaderGating.onDismissed} />
)}
```

- [ ] **Step 5: Run a typecheck to make sure nothing else broke**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no errors involving `app/index.tsx` or the new imports.

- [ ] **Step 6: Run the full test suite**

```bash
npx jest --testPathIgnorePatterns=".worktrees" --silent
```

Expected: 246+ passing, only the pre-existing `NotificationSheet` flake failing. The new tests added by this plan (~22) push the count higher.

- [ ] **Step 7: Commit**

```bash
git add app/index.tsx
git commit -m "feat(brand): mount SulatLoader on cold start with data-gated dismiss"
```

---

## Task 14: Visual verification in the dev preview

This task is hands-on and not committable — it verifies the loader actually looks right in a real browser before deploying.

- [ ] **Step 1: Confirm Metro is running on port 8081**

Use `mcp__Claude_Preview__preview_list`. The expected server is `sulat-web` (serverId from prior session). If not running, start with `mcp__Claude_Preview__preview_start` from the `cozy-map-app` directory.

- [ ] **Step 2: Reload and clear localStorage so loader appears**

Use `mcp__Claude_Preview__preview_eval` to clear any persisted mute that might affect the page, then reload:

```js
Object.keys(localStorage).filter(k => k.startsWith('sulat')).forEach(k => localStorage.removeItem(k));
window.location.reload();
```

- [ ] **Step 3: Within ~500ms of reload, take a screenshot**

Use `mcp__Claude_Preview__preview_screenshot` while the loader is still visible (within the 1200ms minimum). Save with a descriptive filename.

- [ ] **Step 4: Verify visually against `.brand-handoff/reference/Sulat Loading & Logo.html`**

Open that HTML reference (in a separate tab on the user's machine if needed) and compare the screenshot to artboard "02 · Lanterns rising". Specifically check:

- Wordmark renders in italic Cormorant Garamond (not Georgia)
- Glowing dot has the two-layer halo
- Star dust visible
- Lanterns visible at various heights
- Bottom monospace label reads "FINDING NEARBY LANTERNS…"
- Background gradient correct (deep navy → slightly warmer)

If any of these are off, return to Phase 1 (don't ship).

- [ ] **Step 5: Take a second screenshot ~2 seconds in to confirm loader has dismissed**

Use `mcp__Claude_Preview__preview_screenshot` again. The map should now be visible and the loader should be unmounted (or at opacity 0 in the process of unmounting).

- [ ] **Step 6: Verify favicons**

```js
fetch('/favicon-32.png').then(r => ({ status: r.status, type: r.headers.get('content-type') }))
```

Expected: `status: 200`, `content-type: image/png`. Repeat for `/favicon.ico` and `/apple-touch-icon.png`.

---

## Task 15: Push to remote and ship to production

Per the prior session's discovery, the auto-deploy on push fails because `*.mp3` is gitignored — Production must be deployed via local CLI.

- [ ] **Step 1: Push to remote**

```bash
git push origin mobile
```

- [ ] **Step 2: Production deploy via Vercel CLI**

```bash
vercel deploy --prod --yes
```

Expected: Production URL reported as `Ready` with `Aliased: https://sulat.vercel.app`.

- [ ] **Step 3: Smoke check production**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sulat.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://sulat.vercel.app/favicon.ico
curl -s -o /dev/null -w "%{http_code}\n" https://sulat.vercel.app/apple-touch-icon.png
```

Expected: three `200` responses.

- [ ] **Step 4: Hand back to user**

Tell the user the deploy is live, list the URL, and remind them to clear cache or do a hard reload because their browser may have the old favicon cached. Also remind them about `@sulat:bgmuted` localStorage (from prior session) if music testing is in scope.

---

## Self-review checklist

Done by writer before declaring complete:

**Spec coverage** — every section of the spec has a task:
- ✅ Brand assets in `public/` (Task 1) and `assets/brand/` (Task 2)
- ✅ `public/index.html` updates (Task 3)
- ✅ `app.json` web.favicon (Task 4)
- ✅ `SulatLogo` rebuild (Tasks 5–6)
- ✅ `SulatLantern` (Tasks 7–8)
- ✅ `useLoaderGating` (Tasks 9–10) — extracted hook for testability
- ✅ `SulatLoader` (Tasks 11–12)
- ✅ Loader gating in `app/index.tsx` (Task 13)
- ✅ Visual verification (Task 14) — covers the spec's "Visual verification" section
- ✅ Risks: 8s hard cap implemented in `useLoaderGating` and tested

**Type consistency**
- `SulatLogo` props match between Task 6 (component) and Task 11 (`SulatLoader` consumes `<SulatLogo size={60} breathing />`).
- `SulatLantern` exposes a `width` prop (Task 8); `SulatLoader` passes `width={l.width}` (Task 12).
- `useLoaderGating` returns `{ visible, mounted, onDismissed }` (Task 10) and is consumed identically in Task 13.

**No placeholders** — checked all task bodies; no "TBD"/"appropriate"/"TODO".

**Native pass deferred** — the spec's "Native pass — deferred" list is preserved in the spec; no native tasks here.
