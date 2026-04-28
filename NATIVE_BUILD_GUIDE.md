# Native build guide — sulat → Google Play

This file walks through what's done and what you (the human) need to run in
your terminal. All native development happens on the `mobile` branch and
deploys to **`sulat-mobile.vercel.app`** for web verification. Production
(`sulat.vercel.app`) is unaffected.

---

## ✅ Already in place (committed on `mobile` branch)

- `@maplibre/maplibre-react-native` installed + config plugin registered
- `expo-blur` installed (real frosted glass on iOS + Android via BlurView)
- `expo-notifications` + `expo-device` installed for native push
- `app.json` configured: `ph.sulat.app` bundle ID, Android location permissions
- `eas.json` build profiles: `development` / `preview` / `production`
- Platform-split map components — Metro picks the right file per target:
  - `MapView.web.tsx` ↔ `MapView.tsx` (native MapLibre RN)
  - `StoryPins.web.tsx` ↔ `StoryPins.tsx` (uses `MapContext` for camera ref)
  - `HeatmapLayer.web.tsx` ↔ `HeatmapLayer.tsx` (`GeoJSONSource` + `Layer`)
  - `DraftPinMarker.web.tsx` (draggable) ↔ `DraftPinMarker.tsx` (visible only)
- `MapContext` exposes the native camera ref to descendants
- `GlassSurface` uses `expo-blur`'s `<BlurView>` on native, CSS backdrop on web

---

## 🔧 Step 5 — First Android dev build

Open a **fresh terminal** in the project root and run:

```bash
# 1. Install EAS CLI globally (avoids the npx Windows cache bug)
npm install -g eas-cli

# 2. Authenticate — opens browser
eas login

# 3. Link the local project to an EAS project (creates one if needed)
#    If asked which Expo account, pick yours.
eas build:configure

# 4. Build a development client APK on EAS cloud
#    First build takes 15-25 minutes. Free tier allows ~30 builds/month.
eas build -p android --profile development
```

When the build finishes, EAS shows a QR code + a download link.
- Scan the QR on your Android phone, OR
- Download the APK and install it (you'll need to enable "Install unknown apps" for your browser/file manager)

Then back in the terminal:

```bash
# 5. Start the dev server, point dev client to it
npx expo start --dev-client
```

Open the dev client app on your phone, scan the QR. Hot reload works just like web — but now you're testing the real native build, including MapLibre, BlurView, push permissions, etc.

---

## 🔧 Step 6 — Production build for Google Play

Once you've verified everything works on the dev client and you're ready to
ship to Play Store:

### 6a. Assets you need (one-time)

Place in `assets/`:
- `icon.png` — 1024×1024 PNG (already configured)
- `splash-icon.png` — 1024×1024 PNG
- `adaptive-icon-foreground.png` — 1024×1024 PNG (transparent bg)
- `notification-icon.png` — 96×96 monochrome white-on-transparent PNG (for Android push)

### 6b. Google Play Developer account
- Create at <https://play.google.com/console> ($25 one-time)
- Create a new app: **Sulat**
- Default language: English (Philippines)
- App or game: **App**
- Free or paid: **Free**

### 6c. Listing assets to prepare
- Short description (≤80 chars): "Drop a sulat anywhere. Read what others left behind."
- Full description (≤4000 chars) — write a longer story
- 2–8 phone screenshots (1080×1920 minimum) — capture from your dev client
- Feature graphic: 1024×500 PNG
- Privacy policy URL: `https://sulat.vercel.app/privacy` ✅
- Data safety form: declare what you collect (location, content, anonymous device ID)
- Content rating: complete questionnaire
- Target age: 18+

### 6d. Build the production AAB

```bash
eas build -p android --profile production
```

EAS auto-increments `versionCode` (configured in `eas.json`).
EAS handles the upload signing key (managed credentials).

### 6e. Submit to Play Console

```bash
eas submit -p android --latest
```

This uploads the latest AAB to Play Console's **Internal Testing track**
(per `eas.json` `submit.production.android.track: "internal"`). Confirm in the Play Console UI, add testers, then promote to closed → open → production as you verify.

Review timeline: typically 1–7 days for first submission.

---

## 🐛 Known native limitations (worth knowing before testing)

| Feature | Status |
|---|---|
| MapLibre rendering | ✅ Should work via `@maplibre/maplibre-react-native` |
| Mood-tinted pins | ✅ Same `<PinMarker>` component, MarkerView wrapping |
| Cluster pins + tap | ✅ Carve-out logic, fly-to via `MapContext.cameraRef` |
| Heatmap | ✅ `GeoJSONSource` + `Layer` paint identical to web |
| Frosted glass header/dock | ✅ `expo-blur` BlurView (Android needs `experimentalBlurMethod` flag — set) |
| Sheet animations | ✅ Same `useSheetAnimation` hook, native driver |
| Press feedback | ✅ Same `PressableScale` |
| **Drag draft pin** | ❌ Not yet — native MapLibre Marker doesn't expose draggable. User taps a different spot to re-place. Future: PanResponder + `setCoordinate`. |
| **Web push subscription** | ❌ Web-only via service worker. Native push registration via `expo-notifications` is installed but not wired to your Supabase backend yet. |
| **Reverse geocoding** | Should work via existing `lib/reverseGeocode.ts` (uses fetch — runtime-agnostic). Verify on first dev build. |

---

## 📞 If a build fails

**During `eas build`:**
- Read the build log link EAS gives you
- Most common issue: missing config plugin or wrong bundle ID — verify `app.json`

**During `expo prebuild` (if you run it locally):**
- Delete `android/` and `ios/` directories before re-running
- Or use EAS Build directly (cloud) to skip local prebuild entirely

**During `expo start --dev-client`:**
- Make sure phone and laptop are on the same Wi-Fi network
- Or use `--tunnel` flag for remote testing

---

## Branch / URL summary

| Branch | URL | Use |
|---|---|---|
| `main` | `sulat.vercel.app` | Production web — DO NOT touch from native |
| `staging` | `sulat-staging.vercel.app` | Web staging |
| `mobile` | `sulat-mobile.vercel.app` | **All native work + EAS builds happen here** |

Merge `mobile` → `main` only after the production AAB is verified working on Play Store internal track.
