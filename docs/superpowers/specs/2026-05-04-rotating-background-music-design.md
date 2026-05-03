# Rotating Background Music

## Goal

Add a self-contained background music player to Sulat. On launch, the app picks a random track from a bundled set of MP3s and continues rotating through them in shuffle-bag order, with a short silence between tracks. Users can mute (top bar), skip (profile sheet), and the app yields gracefully to other audio sources, the OS background state, and the ComposeSheet.

## Why now

Sulat's current main view is silent. The aesthetic — gold lantern accents, handwritten letters, soft sheets — invites an ambient sonic layer that reinforces the cozy framing. The user is providing the tracks; the app provides the player. This ships before native parity work and before the next feature iteration so the player is in place when those land.

## Locked decisions (from brainstorm)

| Decision | Choice |
|---|---|
| Source | Bundled MP3s in `assets/audio/` |
| Default state | On by default; mute is a persistent state remembered across launches |
| First-launch picker | Random first track |
| Rotation | Shuffle bag (no repeats until bag empty, then reshuffle) |
| Audio focus | Yield to existing audio (Sulat stays silent if other audio is playing) |
| Background behavior | Pause on background, resume on return |
| Track-to-track transition | 1–2s short silence |
| ComposeSheet | Duck to ~30% volume while open, restore on close |
| Player UI surface | Speaker icon in top bar (next to gold profile icon) + "Music off" toggle and "Skip track" button in profile sheet |
| Web autoplay handling | Start with `volume=0`, ramp to full on first user pointerdown |

## Architecture

### File layout

```
src/audio/
├── BackgroundMusicProvider.tsx   ← root context provider, owns expo-audio Player
├── useBackgroundMusic.ts         ← consumer hook (throws if outside provider)
├── shuffleBag.ts                 ← pure shuffle-bag logic (no React)
├── tracks.ts                     ← MP3 manifest (require()s + display names)
├── audioSession.ts               ← platform-specific session config + other-audio check
└── __tests__/
    ├── shuffleBag.test.ts
    └── BackgroundMusicProvider.test.tsx

assets/audio/
└── *.mp3                         ← user-supplied tracks
```

### New runtime dependency

- `expo-audio` (SDK 54-stable replacement for the deprecated `expo-av`).

### Mounting

`BackgroundMusicProvider` wraps the existing tree inside `app/_layout.tsx`, above all routed screens. Every consumer (top bar, profile modal, ComposeSheet) reaches it via `useBackgroundMusic()`.

### Boundaries

- `shuffleBag.ts` is pure — unit-testable without mounting React or loading audio.
- `tracks.ts` is the only file that references the asset folder; swapping a track is a one-line edit.
- `audioSession.ts` keeps platform branching out of the provider so the provider reads as a state machine.
- The provider exposes a narrow API; consumers can never reach into the player's internals.

### Public API

```ts
type BackgroundMusicAPI = {
  isMuted: boolean;
  toggleMute: () => void;       // also persists to AsyncStorage
  skipTrack: () => void;        // advances bag, no fade, no breathing pause
  duck: () => void;             // volume → 0.3
  unduck: () => void;           // volume → 1.0
  currentTrackName: string | null;  // null until first track loads
  isAudioAvailable: boolean;    // false when manifest is empty (graceful no-op)
};
```

## Components

### `tracks.ts`

A typed array. One entry per MP3 in `assets/audio/`. `displayName` is hand-set in the manifest at the same time the `require()` is added (so capitalization can be exact — e.g., `"Lo-Fi Night"` rather than auto-title-cased). Convention is to mirror the filename — `quiet-night.mp3` → `"Quiet Night"` — but the manifest is the source of truth. Shape:

```ts
export type Track = { id: string; displayName: string; source: number };
export const TRACKS: Track[] = [
  // { id: 'quiet-night', displayName: 'Quiet Night', source: require('../../assets/audio/quiet-night.mp3') },
];
```

Ships with an empty array initially; the user drops MP3s into `assets/audio/` and entries are added at implementation time.

### `shuffleBag.ts`

Pure functions, no side effects:

```ts
export function createBag(trackIds: string[]): string[];
export function drawNext(
  bag: string[],
  lastPlayedId?: string
): { next: string; remaining: string[] };
```

`drawNext` returns one item and the remaining bag. When the bag is exhausted, the caller refills via `createBag`. Passing `lastPlayedId` ensures that the refilled bag never places that id at the top — preventing the "track plays twice in a row across a bag boundary" edge case.

### `audioSession.ts`

```ts
export async function configureAudioSession(): Promise<void>;
export async function isOtherAudioPlaying(): Promise<boolean>;
```

Platform behavior:

- **iOS:** category `AVAudioSessionCategoryAmbient` — mixes with other audio, respects the silent switch. Yield is automatic at the OS level.
- **Android:** `interruptionMode: DoNotMix`. Provider calls `isOtherAudioPlaying()` on mount and skips the initial play if true.
- **Web:** no session config; the unlock flow is handled in the provider via `volume=0` + first-pointerdown ramp.

### `BackgroundMusicProvider.tsx`

Owns:

- A single `expo-audio` Player instance (reused — load swaps the source rather than allocating new players per track).
- `isMuted` (mirrored from AsyncStorage key `@sulat:bgmuted`).
- `currentTrackId`, `bag` (in-memory only, no persistence).
- `duckLevel` (1.0 normal, 0.3 when ComposeSheet open).
- `webUnlockGain` (0 until first pointerdown on web, then 1).
- `isLoading` ref (guards skip-during-load races).

Effective volume = `isMuted ? 0 : (duckLevel * webUnlockGain)`.

Effects:

- **On mount:** read AsyncStorage → `configureAudioSession()` → check `isOtherAudioPlaying()` → init bag → load first track → play (or stay paused if muted/yielding).
- **AppState listener:** `active` → resume if was-playing; `background`/`inactive` → pause. Guard double-fires with a `lastAppState` ref.
- **Player `playbackStatusUpdate`:** `didJustFinish === true` → 1500ms timer → `drawNext` → load + play.
- **On unmount:** unload player, remove listeners.

### `useBackgroundMusic.ts`

Thin `useContext` wrapper. Throws a clear error if used outside the provider. Returns the API surface only.

## Data flow

### Cold start

1. Provider mounts.
2. Read `@sulat:bgmuted`. `null` → default `false`.
3. `configureAudioSession()`.
4. `isOtherAudioPlaying()`. If true → set `wasYieldingAtStart = true`; do not start a track. The speaker icon shows as muted; tapping it starts our music.
5. If muted (and not yielding) → `createBag(allTrackIds)` → `drawNext(bag)` → `Player.load(source)` but do **not** call `play()`. Pre-loading means the first un-mute is instant.
6. If unmuted (and not yielding) → `createBag(allTrackIds)` → `drawNext(bag)` → `Player.load(source).play()`.
7. **Web only:** Player is created with `volume=0` regardless. A one-time `document.addEventListener('pointerdown', unlock, { once: true })` ramps `webUnlockGain` from 0 to 1.

### Track ends naturally

1. `playbackStatusUpdate` fires with `didJustFinish: true`.
2. Set `currentTrackId = null` (UI shows "—" briefly).
3. `setTimeout` 1500ms.
4. `drawNext(bag, lastPlayedId)`. If `bag.empty`, `createBag()` and draw again.
5. `Player.load(nextSource).play()`. Update `currentTrackId`.

### Skip pressed

Same as natural end, but no 1500ms delay — instant transition. The breathing pause is intentional only for the natural-end feel; manual skip is explicit user intent.

### Mute toggled

1. Flip `isMuted`.
2. Persist to AsyncStorage.
3. Muting → `Player.pause()` (track position retained for resume).
4. Unmuting from `wasYieldingAtStart === true` → init bag → draw → load → play. Clear the yielding flag.
5. Unmuting normally → `Player.play()` resumes from saved position.

### ComposeSheet duck

`useEffect(() => { duck(); return () => unduck(); }, [])` inside `ComposeSheet.tsx`. The hook calls `setVolume(0.3 * webUnlockGain)` on mount and `setVolume(1.0 * webUnlockGain)` on unmount. No fade ramp in v1; instant volume change.

### AppState transitions

- `active`: if `isMuted === false && currentTrackId !== null` → `Player.play()` (resumes from saved position).
- `background` / `inactive`: `Player.pause()`. Position retained for resume.

### Persistence (AsyncStorage)

- `@sulat:bgmuted` — `'true'` | `'false'`. Read on mount, written on toggle.
- Track index and bag state are **not** persisted — fresh shuffle every cold start (matches "random first" decision).

## Consumer wiring

| File | Change |
|---|---|
| `app/_layout.tsx` | Wrap children in `<BackgroundMusicProvider>` |
| `app/index.tsx` | Add `Ionicons` speaker icon (`volume-high` ↔ `volume-mute`) next to the gold profile icon; tap calls `toggleMute()`. Hide if `!isAudioAvailable`. |
| `src/profile/ProfileModal.tsx` | Add two rows: "Music off" toggle (binds to `isMuted` / `toggleMute`) and "Skip track" button (calls `skipTrack`). Show a small "Now playing: <currentTrackName>" caption underneath. |
| `src/compose/ComposeSheet.tsx` | `useEffect` that calls `duck()` on mount, `unduck()` on unmount. |

No other existing files are touched. `useStories`, `useClusters`, the draft state machine, and the StorySheet are all unaffected.

## Edge cases & error handling

- **Bundled assets are guaranteed-present.** Wrong `require()` paths fail at Metro bundle time, not runtime — no "file not found" runtime handler.
- **Empty manifest.** `tracks.ts` exporting `[]` flips `isAudioAvailable === false`. Provider exposes the API as no-ops; the speaker icon hides itself; one dev-mode warning logged.
- **`Player.load()` failure.** Wrapped in try/catch. On error: log, advance to the next track in the bag (one retry). If retry also fails, fall back to muted state silently.
- **AppState double-fires.** A `lastAppState` ref guards against acting on `active → active` or rapid bounces (which happen during permission prompts, screen rotation, push notification taps).
- **Mute + duck race.** Effective volume formula `isMuted ? 0 : (duckLevel * webUnlockGain)` keeps the gates orthogonal. Closing ComposeSheet while muted calls `unduck()` → `duckLevel = 1.0` → effective volume stays 0 because `isMuted` still true. Correct.
- **Web autoplay unlock fires before player ready.** Defensive `pendingUnlock` flag applies the volume bump once the player initializes. Unlikely in practice (provider mounts in `_layout`).
- **Skip during 1.5s silence.** No-op if `isLoading === true` or no `currentTrackId`. Cheap ref-based guard.
- **Corrupt or 0-length track.** `playbackStatusUpdate` fires `didJustFinish` immediately. The 1.5s timer + bag draw still applies, so the player just moves on. Repeated failures fall through to the load-failure path.
- **Phone call mid-playback (native).** `expo-audio` handles audio interruption events. iOS pauses on call begin; on call end, we resume only if `isMuted === false && AppState === active`.
- **Hot reload during dev.** Provider tears down its player in cleanup; new instance starts fresh. No persistence of position needed.

## Testing

### Unit tests (`shuffleBag.test.ts`)

- `createBag` returns a permutation of input ids (same length, same set).
- `drawNext` returns one item and removes it from the bag.
- After draining, calling `drawNext(_, lastPlayedId)` never returns `lastPlayedId` at the top of the next bag.
- 1000-iteration randomness sanity check: every track appears in roughly equal proportion across many bags.

### Integration tests (`BackgroundMusicProvider.test.tsx`)

- Empty manifest → `isAudioAvailable === false`, no warnings in test mode.
- Mute persisted as `'true'` → `isMuted === true` after first render, no `play()` call.
- Unmuted, no other audio → `play()` called once.
- Unmuted, `isOtherAudioPlaying === true` → `play()` NOT called, `isMuted === false` (we yield, we don't flip mute).
- `toggleMute()` writes to AsyncStorage and pauses/plays the mock player.
- `skipTrack()` advances bag and triggers a load on the mock.
- `duck()` then `unduck()` calls `setVolume(0.3)` then `setVolume(1.0)` on the mock.
- Mute while ducked + then unduck → effective volume stays 0 (the orthogonal-gates property from edge cases).
- AppState `background` → `pause()` called; `active` → `play()` called.

### Mocking

- `expo-audio` mocked with `__mocks__/expo-audio.ts` exporting a fake `Player` class with spy methods.
- AsyncStorage via the existing `@react-native-async-storage/async-storage/jest/async-storage-mock`.
- AppState transitions triggered using whatever shim already exists in `jest.setup.js`.

### Manual verification (will be in the implementation plan, not unit tests)

- Web at `sulat.vercel.app`: open in a fresh browser → no audio until first tap → audio after first tap → mute persists across reload → pause on tab-switch (`visibilitychange`).
- Native on Pixel 7 emulator: audio plays on launch → pause on home button → resume on return → yield when Spotify is already playing.
- ComposeSheet: tap +, confirm music ducks; close sheet, confirm music returns; do it while muted to confirm no audible change.

### Test count target

~12 unit + ~10 integration = ~22 new tests. Existing suite is 222/224 passing; expect ~244 after this lands.

## Out of scope (future work)

- **Crossfade between tracks.** v1 ships with 1–2s silence; crossfade is a polish add-on if the silence feels jarring.
- **Volume slider.** v1 has only mute/unmute and the ducked compose state. System volume is the user's coarse knob.
- **Track names visible during normal playback.** Only shown in the profile sheet's "Now playing" caption. No persistent ticker.
- **Real music-app behavior.** No background-while-app-closed playback (Approach 1 deliberately rejects the foreground-service path), no media-session lock-screen controls, no notification.
- **Streamed tracks / playlist swaps without redeploy.** v1 is bundled. Migrating to Supabase Storage is a future path if the bundled approach hits its size budget.
