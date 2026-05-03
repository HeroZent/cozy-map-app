# Handoff: sulat — Brand Foundation (Logo, Loading Screen, App Icon)

## Overview
This package contains the visual brand foundation for **sulat**, a location-based messaging app where people leave warm "letters" (lanterns) for others nearby. The handoff covers three pieces:

1. **Logo** — primary wordmark with a glowing dot (`sulat.`)
2. **Loading screen** — "lanterns rising" animated splash
3. **App icon** — folded letter with amber glow (used as iOS/Android app icon and browser favicon)

---

## About the Design Files
The files in `reference/` are **design references created in HTML** — interactive prototypes that show the intended look, motion, and behavior. **They are not production code to ship directly.**

Your task is to **recreate these designs in sulat's existing codebase** using its established framework, component library, animation system, and design tokens. If no codebase exists yet, choose the most appropriate stack for the platform (e.g., React Native or SwiftUI for mobile, React/Vue for web) and implement faithfully.

The pre-rasterized icon files in `assets/icon/` (PNGs, SVG, ICO) **are production-ready** — drop them straight into your app/web project.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, and motion are final. Recreate pixel-perfectly using the codebase's existing libraries and patterns.

---

## Brand System

### Color Tokens
Use these exact values. Define them as design tokens in your codebase (`Colors.ts`, `tokens.css`, `Color.swift`, etc.).

| Token              | Hex        | Use                                                   |
| ------------------ | ---------- | ----------------------------------------------------- |
| `ink`              | `#0B1326`  | Primary background (loading, app chrome, icon bg)     |
| `ink-deep`         | `#06091A`  | Deepest background (vignette edges, icon outer)       |
| `ink-warm`         | `#1A2440`  | Slightly warmer navy (icon bg center, raised surfaces)|
| `amber`            | `#E8B86A`  | Primary brand color (logo, key accents, glow core)    |
| `amber-soft`       | `#F2D08C`  | Highlights, dot in wordmark, hot edges                |
| `amber-bright`     | `#FFEABF`  | Brightest emit (inner letter glow, halos)             |
| `rose`             | `#C97A8A`  | Secondary accent (wax seal, special pin states)       |
| `paper`            | `#F4E9D2`  | Light backgrounds (inverse lockup, paper cards)       |

### Typography
Two families. Pick the closest match in the host platform.

| Role        | Family                                          | Style/Weight     | Used for                                    |
| ----------- | ----------------------------------------------- | ---------------- | ------------------------------------------- |
| Display     | **Cormorant Garamond** (Google Fonts)           | Italic 500       | Wordmark "sulat", hero copy, taglines       |
| Body        | **Crimson Pro** (Google Fonts)                  | Regular 400, Italic 400 | Body copy, in-app letter text         |
| System / UI | **JetBrains Mono** (Google Fonts)               | Regular 400, Medium 500 | Status labels, captions, timestamps   |

**Letter-spacing rules:**
- Wordmark: `-0.02em`
- Mono labels: `2–4px tracked, UPPERCASE`
- Body italic taglines: `0.3px`

**Line heights:**
- Wordmark / display: `1.0`
- Body: `1.45–1.55`
- Mono labels: `1` (single line)

### Motion principles
- **Breathing** — 3.4s ease-in-out infinite scale `1 → 1.03` + brightness `1 → 1.15`
- **Twinkle** (stars) — 3s ease-in-out, opacity `0.15 → 0.7`
- **Rising lanterns** — 12–22s linear, vertical drift with slight horizontal sway, fade in/out at 10% / 90%
- **Pulse dots** — 1.4s ease-in-out, staggered 0.18s offset, opacity `0.25 → 1`, scale `0.85 → 1.2`

---

## 1. Logo — Wordmark + Glowing Dot

**File:** `reference/logos.jsx` → `LogoWordmarkDot` component (lines 51–80)
**Visual reference:** open `reference/Sulat Loading & Logo.html` and look at artboard "01 · Wordmark + glowing dot"

### Specification
- Wordmark text: `sulat` (lowercase, no period as text — the dot is a separate glowing element)
- Font: Cormorant Garamond, italic, weight 500
- Letter-spacing: `-0.02em`
- Color: `#E8B86A` (amber)
- Line height: `1`

### The dot
- Shape: perfect circle
- Diameter: **13% of the font size** (e.g., 12px diameter at 92px font)
- Color: `#F2D08C` (amber-soft)
- Margin-left from baseline-end of "sulat": **4% of font size**
- Vertical alignment: baseline-aligned (sits on the same baseline as the text)
- Glow (CSS `box-shadow`, two layers):
  - Inner: `0 0 {18% of font-size}px {4% of font-size}px rgba(242,208,140,0.7)`
  - Outer: `0 0 {50% of font-size}px {10% of font-size}px rgba(232,184,106,0.4)`

### Sizes
| Use case                | Font size | Notes                            |
| ----------------------- | --------- | -------------------------------- |
| App header              | 32px      | Reduce glow blur to 60% to scale |
| Loading screen primary  | 60–72px   | Full glow                         |
| Marketing hero          | 92–120px  | Full glow + breathing animation   |
| Footer / dense UI       | 20–24px   | Drop glow, keep dot solid         |

### Lockup rules
- Always lowercase "sulat"
- Always italic
- Never replace the dot with a real period (`.`)
- Minimum clear space around lockup: **height of the dot** on every side

---

## 2. Loading Screen — Lanterns Rising

**File:** `reference/loading-screens.jsx` → `LoadingRisingLanterns` component (lines ~135–175)
**Visual reference:** open `reference/Sulat Loading & Logo.html` and look at artboard "02 · Lanterns rising"

### Layout
Full-bleed mobile screen, 360×780 design canvas (scales to any mobile viewport).

```
┌─────────────────────────────────┐
│  9:41              ░░░░░ 100%   │  ← status bar (system, not part of design)
│                                 │
│         ✦      ✦       ✦        │  ← sparse star dust
│   ✦                       ✦     │
│        ☀                        │  ← lantern rising
│              ☀                  │
│                                 │
│         sulat·                  │  ← wordmark, 60px
│  a place for letters in the dark│  ← italic tagline
│                  ☀              │
│       ☀                         │
│                          ☀      │
│                                 │
│  finding nearby lanterns…       │  ← mono label, bottom 56px
└─────────────────────────────────┘
```

### Background (z-index 0)
- Base gradient (top to bottom): `linear-gradient(180deg, #06091A 0%, #0D1A30 60%, #1A2440 100%)`
- Horizon haze (bottom): `radial-gradient(ellipse at 50% 100%, rgba(232,184,106,0.25), transparent 70%)` — 200px tall, anchored to bottom

### Star dust (z-index 1)
- 30 stars, randomly positioned (deterministic seed for stability across renders)
- Color: `#F2D08C`
- Size: random 0.4–2.0px
- Opacity: random 0.1–0.6
- Animation: `twinkle` 3s ease-in-out infinite, random delay 0–4s, opacity oscillates `0.15 → 0.7`

### Floating lanterns (z-index 2)
- 11 lantern glyphs (see Lantern Glyph spec below)
- Initial position: scattered at `top: 100–130%`, `left: 0–100%`
- Size: random 6–18px wide
- Animation: each one rises with `transform: translate(swayX, -130vh)` over 12–22s linear, infinite, with negative delays so the field is always full
- `swayX`: random `-4px to +4px` for gentle horizontal drift
- Opacity envelope: 0 → full at 10% → full until 90% → 0 at 100%

### Center lockup (z-index 5)
- Vertically and horizontally centered
- Wordmark `LogoWordmarkDot` at `font-size: 60px`
- 16px gap below
- Tagline: `"a place for letters in the dark"`
  - Font: Cormorant Garamond italic, 14px
  - Color: `rgba(242,208,140,0.7)`
  - Letter-spacing: 0.3px

### Bottom label
- Position: 56px from bottom, full-width centered
- Text: `"finding nearby lanterns…"`
- Font: JetBrains Mono, 9px, letter-spacing 3px, UPPERCASE
- Color: `rgba(232,184,106,0.4)`

### Lantern Glyph (used in loading screen)
SVG, 28×38 viewBox.
- String (top): `<line x1=14 y1=0 x2=14 y2=6>` stroke `#E8B86A` opacity 0.6
- Top cap: `<rect x=9 y=5 width=10 height=2 rx=0.5>` `#E8B86A` opacity 0.85
- Body: ellipse cx=14 cy=19 rx=10 ry=11, filled with radial gradient (`#F2D08C` 0% → `#E8B86A` 60% → `#9C7338` 100%)
- Three horizontal ribs across body: dark stroke `#070D1B` width 0.4 opacity 0.35
- Bottom cap: `<rect x=10 y=29 width=8 height=1.6>`
- Tassel: `<line x1=14 y1=30.6 x2=14 y2=36>` opacity 0.7
- Soft glow halo: ellipse rx=14 ry=14, `#E8B86A` opacity 0.18, blur 4px — animated opacity `0.18 → 0.32 → 0.18` over 3s

---

## 3. App Icon — Folded Letter

**File:** `assets/icon/sulat-icon-master.svg` (production-ready, scalable)
**Showcase:** open `reference/Sulat App Icon.html`

### Concept
A folded letter, flap open, warm amber light spilling out from inside. A small rose-pink wax seal at the bottom hints at intimacy. The whole composition sits on a deep navy background with a soft centered amber halo.

### Composition details (1024×1024 canvas)
- **Background:** radial gradient, `#1A2440` center → `#0B1326` 55% → `#06091A` 100%
- **Star dust:** 10 small amber dots scattered at low opacity (~0.55)
- **Inner halo:** circle r=380 centered at 512,512, filled with radial gradient `#FFEABF` (95% opacity at center) → `#F2D08C` 50% → transparent
- **Letter:** rotated -6° around (512, 532)
  - Back of envelope: 440×300 rounded rect (r=14), filled with `paperBack` gradient (`#A6772F` → `#7A5520`)
  - Front face: 400×250 rounded rect (r=6), filled with `paper` gradient (`#FBE6B8` → `#F0C77A` → `#D9A050`)
  - Inner glow at top edge: `#FFF1CF` falloff to transparent — simulates light from inside
  - Hot rim line at top of letter: 3px stroke `#FFF6DC` opacity 0.9
  - Flap (open, leaning back): triangle from (-200,-100) to (0,-210) to (200,-100), filled with `flapShade` gradient
  - Two horizontal fold lines on letter face: stroke `#9A6F32`, 2.5px, opacity 0.4 / 0.3, rounded caps
  - Wax seal: nested circles at (0, 122) — outer `#B8556A`, inner `#C97A8A`, highlight `#F2D08C` at 65%
- **Outer ring:** circle r=380, stroke `#E8B86A` 2px, opacity 0.18

### Production assets in `assets/icon/`

| File                                       | Size       | Use                                          |
| ------------------------------------------ | ---------- | -------------------------------------------- |
| `sulat-icon-master.svg`                    | scalable   | Source — re-rasterize for any new size       |
| `sulat-icon-1024.png`                      | 1024×1024  | App Store master (square, system rounds)     |
| `sulat-icon-1024-rounded.png`              | 1024×1024  | Marketing / preview (pre-rounded, 22.5% radius) |
| `ios/Icon-{20,29,40,58,60,76,80,87,120,152,167,180,1024}.png` | various | iOS asset catalog |
| `apple-touch-icon.png`                     | 180×180    | iOS home-screen bookmark (web)               |
| `android/ic_launcher_foreground.png`       | 432×432    | Adaptive icon foreground                     |
| `android/ic_launcher_background.png`       | 432×432    | Adaptive icon background (gradient navy)     |
| `android/ic_launcher.png`                  | 192×192    | Legacy square icon                           |
| `android/ic_launcher_round.png`            | 192×192    | Legacy round icon                            |
| `favicon.ico`                              | multi-res  | Browser favicon (16/32/48 embedded)          |
| `favicon-{16,32,48,64,96,128,192,256,512}.png` | various | Explicit PNG favicons for `<link rel=icon>` |

### Web `<head>` snippet (drop-in)

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" href="/favicon-32.png" sizes="32x32">
<link rel="icon" type="image/png" href="/favicon-192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0B1326">
<title>sulat — letters in the dark</title>
```

### iOS integration
1. In Xcode, open Assets.xcassets → AppIcon
2. Drag each `Icon-*.png` from `assets/icon/ios/` into the matching slot
3. The 1024×1024 goes into the App Store slot
4. iOS automatically applies its rounded mask — **do not pre-round the iOS icons**

### Android integration
1. Place `ic_launcher_foreground.png` and `ic_launcher_background.png` in `res/mipmap-xxxhdpi/`
2. Create `res/mipmap-anydpi-v26/ic_launcher.xml`:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
       <background android:drawable="@mipmap/ic_launcher_background"/>
       <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
   </adaptive-icon>
   ```
3. For pre-O devices, fall back to `ic_launcher.png` and `ic_launcher_round.png`

---

## State Management
None of these three pieces require app state. The loading screen is a pure presentational component that runs while initial data is being fetched. Suggested integration:

```pseudo
isLoading = true
mount LoadingRisingLanterns
fetchInitialData().then(() => isLoading = false; navigate to home)
```

Minimum loading screen display time: **1200ms** even if data arrives faster, so users perceive the brand moment rather than a flash.

---

## Files in this handoff

```
design_handoff_sulat_brand/
├── README.md                          ← you are here
├── assets/
│   └── icon/                          ← production-ready icon files
│       ├── sulat-icon-master.svg
│       ├── sulat-icon-1024.png
│       ├── sulat-icon-1024-rounded.png
│       ├── apple-touch-icon.png
│       ├── favicon.ico
│       ├── favicon-{16..512}.png
│       ├── ios/Icon-*.png
│       └── android/ic_launcher*.png
└── reference/                         ← HTML design references (do not ship)
    ├── Sulat Loading & Logo.html      ← canvas with all explorations
    ├── Sulat App Icon.html            ← icon showcase
    ├── logos.jsx                      ← React source for logo variants
    ├── loading-screens.jsx            ← React source for loading variants
    └── design-canvas.jsx              ← canvas wrapper (not shipped)
```

To preview the references locally, serve the `reference/` folder over any static HTTP server (the JSX files load via Babel inline transpilation):

```bash
cd reference && python3 -m http.server 8000
# open http://localhost:8000/Sulat Loading & Logo.html
```

---

## Questions / decisions left to the engineer
- **Animation library:** the references use raw CSS keyframes. Use whatever your codebase already has (Framer Motion, Reanimated, Lottie, etc.) — match the timing values exactly.
- **Font loading:** the references use Google Fonts `<link>`. In a native app, embed Cormorant Garamond + JetBrains Mono in your bundle. On the web, prefer self-hosted woff2 with `font-display: swap`.
- **Loading screen as native splash:** on iOS, the launch screen storyboard cannot run animation. Use the loading screen as a *post-launch* React/SwiftUI screen — show a static frame as the actual splash, then crossfade into the animated loading screen.
- **Tagline copy:** "a place for letters in the dark" — confirm with copywriting before shipping. The bottom mono label `"finding nearby lanterns…"` should be replaced with state-aware copy (`"locating you…"`, `"loading lanterns…"`, etc.).
