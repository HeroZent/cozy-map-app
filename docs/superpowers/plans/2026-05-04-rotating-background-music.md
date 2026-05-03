# Rotating Background Music Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained background music player to Sulat that rotates through bundled MP3s with shuffle-bag order, yields to other audio, pauses on background, and ducks when the ComposeSheet is open.

**Architecture:** New `src/audio/` module wraps a single `expo-audio` Player in a React Context provider. Five focused files: `tracks.ts` (manifest), `shuffleBag.ts` (pure logic, unit-tested in isolation), `audioSession.ts` (platform branching), `BackgroundMusicProvider.tsx` (state + effects), `useBackgroundMusic.ts` (consumer hook). Mounted in `app/_layout.tsx`; consumed by the top bar speaker icon, profile sheet rows, and ComposeSheet duck/unduck effect.

**Tech Stack:** Expo SDK 54, React 19, `expo-audio`, `@react-native-async-storage/async-storage`, `@expo/vector-icons` (Ionicons), Jest with `jest-expo` preset, React Native Testing Library.

**Spec:** [docs/superpowers/specs/2026-05-04-rotating-background-music-design.md](../specs/2026-05-04-rotating-background-music-design.md)

---

## Task 1: Add `expo-audio` dependency + Jest mock

**Files:**
- Modify: `package.json` (add `expo-audio` to dependencies)
- Create: `__mocks__/expo-audio.ts` (project root, picked up automatically by Jest)
- Modify: `jest.setup.js` (auto-mock the package globally)

- [ ] **Step 1: Install expo-audio**

Run from `C:/Users/emman/OneDrive/Desktop/ClaudeBusiness/cozy-map-app`:
```
npx expo install expo-audio
```
This pins the version compatible with Expo SDK 54.

- [ ] **Step 2: Verify install succeeded**

Run:
```
npm ls expo-audio
```
Expected: prints a single line showing the resolved version (no `MISSING`).

- [ ] **Step 3: Create the Jest mock**

Create `__mocks__/expo-audio.ts` with:
```ts
// Auto-mocked by Jest via jest.mock('expo-audio') in jest.setup.js.
// Each call to createAudioPlayer() returns a new spy-able fake that mirrors
// the real expo-audio AudioPlayer surface used by this codebase.

type StatusListener = (status: { didJustFinish: boolean; isLoaded: boolean; playing: boolean }) => void;
type EventName = 'playbackStatusUpdate' | 'audioSampleUpdate';

export class FakePlayer {
  // Real AudioPlayer fields (subset that the provider actually reads/writes).
  volume = 1;          // writable property; provider does `player.volume = v`
  paused = true;
  isLoaded = true;     // createAudioPlayer auto-loads, so default is true
  playing = false;
  currentTime = 0;
  duration = 0;
  source: number | null = null;
  private listeners: { [K in EventName]: StatusListener[] } = {
    playbackStatusUpdate: [],
    audioSampleUpdate: [],
  };

  // Methods the provider calls. These match the real AudioPlayer API.
  play = jest.fn(() => { this.paused = false; this.playing = true; });
  pause = jest.fn(() => { this.paused = true; this.playing = false; });
  replace = jest.fn((source: number) => { this.source = source; this.isLoaded = true; });
  remove = jest.fn(() => { this.isLoaded = false; });
  addListener = jest.fn((eventName: EventName, listener: StatusListener) => {
    this.listeners[eventName].push(listener);
    return {
      remove: () => {
        this.listeners[eventName] = this.listeners[eventName].filter((l) => l !== listener);
      },
    };
  });

  // Test helper — call from tests to simulate end-of-track.
  __emitFinish = () => {
    this.listeners.playbackStatusUpdate.forEach((l) =>
      l({ didJustFinish: true, isLoaded: true, playing: false })
    );
  };
}

// Tests must reset this in beforeEach: `__lastPlayer.current = null;`
export const __lastPlayer = { current: null as FakePlayer | null };

export const createAudioPlayer = jest.fn((source?: number) => {
  const p = new FakePlayer();
  if (typeof source === 'number') p.source = source;
  __lastPlayer.current = p;
  return p;
});

export const setAudioModeAsync = jest.fn(async () => {});
export const setIsAudioActiveAsync = jest.fn(async () => {});

// AudioModule is exported by the real package but the only public surface we use
// is via top-level functions (setAudioModeAsync etc.). We expose a stub object
// so any defensive `import { AudioModule } from 'expo-audio'` doesn't throw.
export const AudioModule = {};
```

- [ ] **Step 4: Wire the mock in jest.setup.js**

Append to `jest.setup.js`:
```js
// Auto-mock expo-audio for all tests; use __mocks__/expo-audio.ts.
jest.mock('expo-audio');
```

- [ ] **Step 5: Confirm test suite still passes baseline**

Run:
```
npm test -- --silent
```
Expected: 222 passing (or whatever the current baseline is), 0 new failures.

- [ ] **Step 6: Commit**

```
git add package.json package-lock.json __mocks__/expo-audio.ts jest.setup.js
git commit -m "chore(audio): add expo-audio dep and Jest mock scaffold"
```

---

## Task 2: Pure shuffle bag (TDD)

**Files:**
- Create: `src/audio/shuffleBag.ts`
- Create: `src/audio/__tests__/shuffleBag.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/audio/__tests__/shuffleBag.test.ts`:
```ts
import { createBag, drawNext } from '../shuffleBag';

describe('shuffleBag', () => {
  test('createBag returns a permutation of the input', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const bag = createBag(ids);
    expect(bag).toHaveLength(ids.length);
    expect([...bag].sort()).toEqual([...ids].sort());
  });

  test('drawNext returns one item and removes it from the bag', () => {
    const bag = ['a', 'b', 'c'];
    const { next, remaining } = drawNext(bag);
    expect(['a', 'b', 'c']).toContain(next);
    expect(remaining).toHaveLength(2);
    expect(remaining).not.toContain(next);
  });

  test('drawNext on a single-item bag returns the item with empty remaining', () => {
    const { next, remaining } = drawNext(['only']);
    expect(next).toBe('only');
    expect(remaining).toEqual([]);
  });

  test('createBag with lastPlayedId never places it at the top', () => {
    // Run many iterations; the first item should never equal lastPlayedId.
    const ids = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 200; i++) {
      const bag = createBag(ids, 'a');
      expect(bag[0]).not.toBe('a');
    }
  });

  test('1000 draws give roughly equal distribution', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    let bag = createBag(ids);
    let lastPlayed: string | undefined;
    for (let i = 0; i < 1000; i++) {
      if (bag.length === 0) bag = createBag(ids, lastPlayed);
      const { next, remaining } = drawNext(bag);
      counts[next]++;
      lastPlayed = next;
      bag = remaining;
    }
    // Each track should appear roughly 250 times. Allow ±15% slack.
    Object.values(counts).forEach((c) => {
      expect(c).toBeGreaterThan(212);
      expect(c).toBeLessThan(288);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/shuffleBag.test.ts
```
Expected: FAIL with "Cannot find module '../shuffleBag'".

- [ ] **Step 3: Implement shuffleBag**

Create `src/audio/shuffleBag.ts`:
```ts
/**
 * Pure shuffle-bag logic. No React, no audio side-effects.
 *
 * The bag is a randomized queue: createBag returns a permutation, drawNext
 * pops one item from the front. Once the bag is empty, the caller refills
 * via createBag. Passing lastPlayedId to createBag prevents the just-played
 * track from being placed at the top of the new bag, which would cause an
 * audible repeat across the bag boundary.
 */
export function createBag(trackIds: string[], lastPlayedId?: string): string[] {
  if (trackIds.length === 0) return [];
  // Fisher-Yates shuffle on a copy.
  const bag = [...trackIds];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // Avoid placing lastPlayedId at the top — swap it with index 1 if needed.
  if (lastPlayedId && bag.length > 1 && bag[0] === lastPlayedId) {
    [bag[0], bag[1]] = [bag[1], bag[0]];
  }
  return bag;
}

export function drawNext(bag: string[]): { next: string; remaining: string[] } {
  if (bag.length === 0) {
    throw new Error('drawNext called on empty bag — caller must refill via createBag');
  }
  return { next: bag[0], remaining: bag.slice(1) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/shuffleBag.test.ts
```
Expected: 5 tests passing.

- [ ] **Step 5: Commit**

```
git add src/audio/shuffleBag.ts src/audio/__tests__/shuffleBag.test.ts
git commit -m "feat(audio): pure shuffle bag for track rotation"
```

---

## Task 3: Track manifest scaffold

**Files:**
- Create: `src/audio/tracks.ts`
- Create: `assets/audio/.gitkeep`

- [ ] **Step 1: Create empty assets/audio folder**

Run:
```
mkdir -p C:/Users/emman/OneDrive/Desktop/ClaudeBusiness/cozy-map-app/assets/audio
```

- [ ] **Step 2: Create the manifest**

Create `src/audio/tracks.ts`:
```ts
/**
 * Background music manifest.
 *
 * Add one entry per MP3 file in assets/audio/. Display name is hand-set so
 * capitalization is exact (e.g. "Lo-Fi Night" not auto-titled "Lo-fi Night").
 *
 * Convention: id mirrors the filename (without .mp3); displayName mirrors
 * filename with hyphens turned into spaces and proper title case.
 *
 * Empty array is supported — the BackgroundMusicProvider gracefully exposes
 * no-op API and hides the speaker icon when isAudioAvailable === false.
 */
export type Track = { id: string; displayName: string; source: number };

export const TRACKS: Track[] = [
  // Example entry once a track is added:
  // { id: 'quiet-night', displayName: 'Quiet Night', source: require('../../assets/audio/quiet-night.mp3') },
];
```

- [ ] **Step 3: Create .gitkeep to track empty folder**

Create `assets/audio/.gitkeep` with empty content (Write tool with empty string).

- [ ] **Step 4: Commit**

```
git add src/audio/tracks.ts assets/audio/.gitkeep
git commit -m "feat(audio): track manifest scaffold (empty until user provides MP3s)"
```

---

## Task 4: Audio session module

**Files:**
- Create: `src/audio/audioSession.ts`
- Create: `src/audio/__tests__/audioSession.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/audio/__tests__/audioSession.test.ts`:
```ts
import { setAudioModeAsync } from 'expo-audio';
import { configureAudioSession } from '../audioSession';

describe('audioSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('configureAudioSession calls setAudioModeAsync with mixing-friendly settings', async () => {
    await configureAudioSession();
    expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
    const arg = (setAudioModeAsync as jest.Mock).mock.calls[0][0];
    expect(arg).toMatchObject({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
  });

  test('configureAudioSession is a no-op on web', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
    // Use require() rather than await import() — Jest's CJS module system
    // re-evaluates require() after jest.resetModules() without needing
    // --experimental-vm-modules.
    const { configureAudioSession: webImpl } = require('../audioSession');
    await webImpl();
    expect(setAudioModeAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/audioSession.test.ts
```
Expected: FAIL with "Cannot find module '../audioSession'".

- [ ] **Step 3: Implement audioSession**

Create `src/audio/audioSession.ts`:
```ts
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

/**
 * Configure the audio session to mix with other audio.
 *
 * - iOS / Android (native): mixWithOthers — Sulat coexists with whatever else
 *   is playing. Ambient-style mixing on iOS, no audio-focus request on Android.
 * - Web: no-op; autoplay handling lives in the provider via volume=0 +
 *   first-pointerdown unlock.
 *
 * NOTE: `expo-audio` 1.x has no public API to query whether other apps are
 * producing audio, so a true "yield to existing audio" behavior is not
 * achievable here. See the spec's "Audio focus follow-up" section.
 */
export async function configureAudioSession(): Promise<void> {
  if (Platform.OS === 'web') return;
  await setAudioModeAsync({
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/audioSession.test.ts
```
Expected: 2 tests passing.

- [ ] **Step 5: Commit**

```
git add src/audio/audioSession.ts src/audio/__tests__/audioSession.test.ts
git commit -m "feat(audio): platform-aware audio session config"
```

---

## Task 5: BackgroundMusicProvider — empty-manifest path

**Files:**
- Create: `src/audio/BackgroundMusicProvider.tsx`
- Create: `src/audio/useBackgroundMusic.ts`
- Create: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

**Test-only props:** the provider accepts two optional props that exist solely to make testing simpler:
- `tracksOverride?: Track[]` — replaces the imported `TRACKS` manifest. Lets each test pass its own track list without `jest.resetModules`.
- `trackGapMs?: number` — overrides the 1500ms pause between tracks. Tests pass `0` to assert end-to-next without timer manipulation.

Both default to production values when omitted. Document them as test-only in the provider JSDoc.

- [ ] **Step 1: Write failing test for empty manifest**

Create `src/audio/__tests__/BackgroundMusicProvider.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BackgroundMusicProvider } from '../BackgroundMusicProvider';
import { useBackgroundMusic } from '../useBackgroundMusic';

function Probe() {
  const api = useBackgroundMusic();
  return <Text testID="probe">{api.isAudioAvailable ? 'yes' : 'no'}</Text>;
}

describe('BackgroundMusicProvider — empty manifest', () => {
  test('exposes isAudioAvailable=false when manifest is empty', () => {
    render(
      <BackgroundMusicProvider tracksOverride={[]}>
        <Probe />
      </BackgroundMusicProvider>
    );
    expect(screen.getByTestId('probe').props.children).toBe('no');
  });

  test('useBackgroundMusic throws when used outside provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useBackgroundMusic must be used inside/);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: FAIL with "Cannot find module '../BackgroundMusicProvider'".

- [ ] **Step 3: Create the consumer hook**

Create `src/audio/useBackgroundMusic.ts`:
```ts
import { createContext, useContext } from 'react';

export type BackgroundMusicAPI = {
  isMuted: boolean;
  toggleMute: () => void;
  skipTrack: () => void;
  duck: () => void;
  unduck: () => void;
  currentTrackName: string | null;
  isAudioAvailable: boolean;
};

export const BackgroundMusicContext = createContext<BackgroundMusicAPI | null>(null);

export function useBackgroundMusic(): BackgroundMusicAPI {
  const ctx = useContext(BackgroundMusicContext);
  if (!ctx) {
    throw new Error('useBackgroundMusic must be used inside <BackgroundMusicProvider>');
  }
  return ctx;
}
```

- [ ] **Step 4: Implement the provider — minimal skeleton**

Create `src/audio/BackgroundMusicProvider.tsx`:
```tsx
import { ReactNode, useMemo } from 'react';
import { TRACKS, Track } from './tracks';
import { BackgroundMusicContext, BackgroundMusicAPI } from './useBackgroundMusic';

/**
 * Props:
 * - children: required.
 * - tracksOverride: TEST ONLY. Replaces the bundled TRACKS manifest.
 * - trackGapMs: TEST ONLY. Overrides the 1500ms pause between tracks.
 */
export type BackgroundMusicProviderProps = {
  children: ReactNode;
  tracksOverride?: Track[];
  trackGapMs?: number;
};

export function BackgroundMusicProvider({
  children,
  tracksOverride,
  trackGapMs = 1500,
}: BackgroundMusicProviderProps) {
  const tracks = tracksOverride ?? TRACKS;
  const isAudioAvailable = tracks.length > 0;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted: false,
      toggleMute: () => {},
      skipTrack: () => {},
      duck: () => {},
      unduck: () => {},
      currentTrackName: null,
      isAudioAvailable,
    }),
    [isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 2 tests passing.

- [ ] **Step 6: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/useBackgroundMusic.ts src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): provider scaffold with empty-manifest no-op path"
```

---

## Task 6: Provider — cold-start playback (with manifest)

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`
- Modify: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

- [ ] **Step 1: Write failing tests for cold-start behavior**

At the top of `src/audio/__tests__/BackgroundMusicProvider.test.tsx`, add additional imports and a small helper:
```tsx
import { __lastPlayer, createAudioPlayer, AudioModule } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fakeTracks = [
  { id: 't1', displayName: 'Track 1', source: 1 as unknown as number },
  { id: 't2', displayName: 'Track 2', source: 2 as unknown as number },
];

// Flush a few microtasks so async useEffect chains can settle.
async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
```

Then add a new describe block:
```tsx
describe('BackgroundMusicProvider — cold start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
  });

  test('with manifest and no persisted mute, creates a player and calls play() once', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <Text>child</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    // createAudioPlayer auto-loads the source; no separate load() call.
    expect(__lastPlayer.current?.play).toHaveBeenCalledTimes(1);
  });

  test('with persisted muted=true, creates the player but does NOT play', async () => {
    await AsyncStorage.setItem('@sulat:bgmuted', 'true');
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <Text>child</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(__lastPlayer.current?.play).not.toHaveBeenCalled();
  });
});
```

Also update the imports at the top of the test file to drop `AudioModule` (no longer used):
```tsx
import { __lastPlayer, createAudioPlayer } from 'expo-audio';
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 3 new failures (the cold-start tests). Empty-manifest tests still pass.

- [ ] **Step 3: Implement cold-start logic**

Replace `src/audio/BackgroundMusicProvider.tsx` contents with:
```tsx
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { TRACKS, Track } from './tracks';
import { createBag, drawNext } from './shuffleBag';
import { configureAudioSession } from './audioSession';
import { BackgroundMusicContext, BackgroundMusicAPI } from './useBackgroundMusic';

const MUTE_STORAGE_KEY = '@sulat:bgmuted';

export type BackgroundMusicProviderProps = {
  children: ReactNode;
  /** TEST ONLY. Replaces the bundled TRACKS manifest. */
  tracksOverride?: Track[];
  /** TEST ONLY. Overrides the natural-end pause between tracks. Default 1500ms. */
  trackGapMs?: number;
};

export function BackgroundMusicProvider({
  children,
  tracksOverride,
  trackGapMs = 1500,
}: BackgroundMusicProviderProps) {
  const tracks = tracksOverride ?? TRACKS;
  const isAudioAvailable = tracks.length > 0;
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const bagRef = useRef<string[]>([]);

  // Cold-start effect.
  useEffect(() => {
    if (!isAudioAvailable) return;
    let cancelled = false;
    (async () => {
      // 1. Read persisted mute.
      const persisted = await AsyncStorage.getItem(MUTE_STORAGE_KEY);
      const muted = persisted === 'true';
      if (cancelled) return;
      setIsMuted(muted);

      // 2. Configure audio session (mixWithOthers — see audioSession.ts).
      await configureAudioSession();
      if (cancelled) return;

      // 3. Init bag and draw first track.
      bagRef.current = createBag(tracks.map((t) => t.id));
      const { next, remaining } = drawNext(bagRef.current);
      bagRef.current = remaining;
      const track = tracks.find((t) => t.id === next)!;

      // 4. Create player (this also starts loading the source).
      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      setCurrentTrackId(next);

      // 5. Play unless muted. (Volume management arrives in Task 9.)
      if (!muted) player.play();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.remove();
    };
  }, [isAudioAvailable]);

  const currentTrackName = currentTrackId
    ? tracks.find((t) => t.id === currentTrackId)?.displayName ?? null
    : null;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute: () => {}, // implemented in Task 7
      skipTrack: () => {},  // implemented in Task 8
      duck: () => {},       // implemented in Task 9
      unduck: () => {},     // implemented in Task 9
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, currentTrackName, isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 5 tests passing (2 from Task 5 + 3 new).

- [ ] **Step 5: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): cold-start with shuffle bag, mute persistence, yield"
```

---

## Task 7: Provider — mute toggle

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`
- Modify: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

- [ ] **Step 1: Write failing tests**

Append a new describe to `src/audio/__tests__/BackgroundMusicProvider.test.tsx`:
```tsx
import { fireEvent } from '@testing-library/react-native';
import { Pressable } from 'react-native';

function MuteButton() {
  const api = useBackgroundMusic();
  return (
    <Pressable testID="mute-btn" onPress={api.toggleMute}>
      <Text>{api.isMuted ? 'muted' : 'unmuted'}</Text>
    </Pressable>
  );
}

describe('BackgroundMusicProvider — mute toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
  });

  test('toggleMute pauses player and persists muted=true', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <MuteButton />
      </BackgroundMusicProvider>
    );
    await flush();
    fireEvent.press(screen.getByTestId('mute-btn'));
    await flush();
    expect(__lastPlayer.current?.pause).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('@sulat:bgmuted')).toBe('true');
  });

  test('toggleMute when already muted resumes playback and persists muted=false', async () => {
    await AsyncStorage.setItem('@sulat:bgmuted', 'true');
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <MuteButton />
      </BackgroundMusicProvider>
    );
    await flush();
    fireEvent.press(screen.getByTestId('mute-btn'));
    await flush();
    expect(__lastPlayer.current?.play).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('@sulat:bgmuted')).toBe('false');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 3 new failures (mute toggle tests).

- [ ] **Step 3: Implement toggleMute**

Modify `src/audio/BackgroundMusicProvider.tsx`. Replace the contents with:
```tsx
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { TRACKS, Track } from './tracks';
import { createBag, drawNext } from './shuffleBag';
import { configureAudioSession } from './audioSession';
import { BackgroundMusicContext, BackgroundMusicAPI } from './useBackgroundMusic';

const MUTE_STORAGE_KEY = '@sulat:bgmuted';

export type BackgroundMusicProviderProps = {
  children: ReactNode;
  tracksOverride?: Track[];
  trackGapMs?: number;
};

export function BackgroundMusicProvider({
  children,
  tracksOverride,
  trackGapMs = 1500,
}: BackgroundMusicProviderProps) {
  const tracks = tracksOverride ?? TRACKS;
  const isAudioAvailable = tracks.length > 0;
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const bagRef = useRef<string[]>([]);
  const lastPlayedIdRef = useRef<string | null>(null);

  // Helper: swap to the next track from the bag and play it.
  // Re-used by both the natural-end listener (Task 8 wires the listener) and skipTrack.
  const startNextFromBag = useCallback(() => {
    if (!playerRef.current) return;
    if (bagRef.current.length === 0) {
      bagRef.current = createBag(
        tracks.map((t) => t.id),
        lastPlayedIdRef.current ?? undefined
      );
    }
    const { next, remaining } = drawNext(bagRef.current);
    bagRef.current = remaining;
    const track = tracks.find((t) => t.id === next)!;
    playerRef.current.replace(track.source);
    setCurrentTrackId(next);
    lastPlayedIdRef.current = next;
    playerRef.current.play();
  }, [tracks]);

  // Attach the natural-end listener once when a player is created.
  // Track-end → setTimeout(gap) → next-track via startNextFromBag.
  const attachEndListener = useCallback(
    (player: ReturnType<typeof createAudioPlayer>) => {
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setCurrentTrackId(null);
          setTimeout(() => {
            startNextFromBag();
          }, trackGapMs);
        }
      });
    },
    [trackGapMs, startNextFromBag]
  );

  // Cold-start effect.
  useEffect(() => {
    if (!isAudioAvailable) return;
    let cancelled = false;
    (async () => {
      const persisted = await AsyncStorage.getItem(MUTE_STORAGE_KEY);
      const muted = persisted === 'true';
      if (cancelled) return;
      setIsMuted(muted);

      await configureAudioSession();
      if (cancelled) return;

      bagRef.current = createBag(tracks.map((t) => t.id));
      const { next, remaining } = drawNext(bagRef.current);
      bagRef.current = remaining;
      const track = tracks.find((t) => t.id === next)!;

      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      attachEndListener(player);
      setCurrentTrackId(next);
      lastPlayedIdRef.current = next;

      if (!muted) player.play();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.remove();
    };
  }, [isAudioAvailable, tracks, attachEndListener]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(MUTE_STORAGE_KEY, String(next));
      if (next) {
        playerRef.current?.pause();
      } else {
        playerRef.current?.play();
      }
      return next;
    });
  }, []);

  const currentTrackName = currentTrackId
    ? tracks.find((t) => t.id === currentTrackId)?.displayName ?? null
    : null;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute,
      skipTrack: () => {},
      duck: () => {},
      unduck: () => {},
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, toggleMute, currentTrackName, isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
```

This implementation already wires the track-end listener and `startNextFromBag` (used in Task 8). Task 8 will add the `skipTrack` callback.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 8 tests passing (5 prior + 3 mute toggle).

- [ ] **Step 5: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): toggleMute with persistence and yield-takeover"
```

---

## Task 8: Provider — wire `skipTrack` API and test rotation

The track-end listener and `startNextFromBag` were already added in Task 7's implementation (it was simpler to ship them together). This task adds `skipTrack` and the assertion tests.

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`
- Modify: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/audio/__tests__/BackgroundMusicProvider.test.tsx`:
```tsx
function SkipButton() {
  const api = useBackgroundMusic();
  return <Pressable testID="skip-btn" onPress={api.skipTrack}><Text>skip</Text></Pressable>;
}

describe('BackgroundMusicProvider — track end and skip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
  });

  test('on track end (with trackGapMs=0), advances to next track via replace()', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks} trackGapMs={0}>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    // createAudioPlayer auto-loads the first track — no replace() yet.
    expect(player.replace).toHaveBeenCalledTimes(0);
    expect(player.play).toHaveBeenCalledTimes(1);
    player.__emitFinish();
    // setTimeout(0) fires on the next macrotask; flushes drain the chain.
    await flush();
    await flush();
    expect(player.replace).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(2);
  });

  test('skipTrack advances immediately with no delay', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <SkipButton />
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    expect(player.replace).toHaveBeenCalledTimes(0);
    fireEvent.press(screen.getByTestId('skip-btn'));
    await flush();
    expect(player.replace).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: skip test fails (`skipTrack` is currently a no-op). Track-end test may already pass because Task 7 wired the listener.

- [ ] **Step 3: Wire `skipTrack` callback**

In `src/audio/BackgroundMusicProvider.tsx`, add a `skipTrack` callback above the `value` memo:
```tsx
  const skipTrack = useCallback(() => {
    if (!playerRef.current) return;
    startNextFromBag();
  }, [startNextFromBag]);
```

Update the `value` memo to expose it:
```tsx
  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute,
      skipTrack,
      duck: () => {},
      unduck: () => {},
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, toggleMute, skipTrack, currentTrackName, isAudioAvailable]
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 10 tests passing.

- [ ] **Step 5: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): wire skipTrack API and assert rotation behavior"
```

---

## Task 9: Provider — duck/unduck with mute orthogonality

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`
- Modify: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/audio/__tests__/BackgroundMusicProvider.test.tsx`:
```tsx
function DuckButtons() {
  const api = useBackgroundMusic();
  return (
    <>
      <Pressable testID="duck-btn" onPress={api.duck}><Text>duck</Text></Pressable>
      <Pressable testID="unduck-btn" onPress={api.unduck}><Text>unduck</Text></Pressable>
      <Pressable testID="mute-btn" onPress={api.toggleMute}><Text>mute</Text></Pressable>
    </>
  );
}

describe('BackgroundMusicProvider — duck/unduck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
  });

  test('duck() lowers volume to 0.3, unduck() restores to 1.0', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <DuckButtons />
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    fireEvent.press(screen.getByTestId('duck-btn'));
    expect(player.volume).toBe(0.3);
    fireEvent.press(screen.getByTestId('unduck-btn'));
    expect(player.volume).toBe(1.0);
  });

  test('mute + duck + unduck keeps effective volume at 0', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <DuckButtons />
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    fireEvent.press(screen.getByTestId('mute-btn'));
    await flush();
    fireEvent.press(screen.getByTestId('duck-btn'));
    expect(player.volume).toBe(0);
    fireEvent.press(screen.getByTestId('unduck-btn'));
    expect(player.volume).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 2 new failures.

- [ ] **Step 3: Implement duck/unduck with effective-volume formula**

In `src/audio/BackgroundMusicProvider.tsx`, **place these new declarations immediately after `lastPlayedIdRef` and before `attachEndListener`** (so they exist before any callback that depends on them):

```tsx
  const duckLevelRef = useRef(1.0);
  const webUnlockGainRef = useRef<number>(
    tracksOverride !== undefined || typeof document === 'undefined' ? 1 : 0
  );
  // Mirror isMuted into a ref so applyEffectiveVolume can be a stable callback.
  // (Without this, applyEffectiveVolume would change on every mute toggle and
  // cause the cold-start useEffect to re-fire, which is incorrect.)
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const applyEffectiveVolume = useCallback((mutedOverride?: boolean) => {
    const muted = mutedOverride ?? isMutedRef.current;
    const v = muted ? 0 : duckLevelRef.current * webUnlockGainRef.current;
    if (playerRef.current) playerRef.current.volume = v; // property assignment, not method call
  }, []); // stable — reads state via refs

  const duck = useCallback(() => {
    duckLevelRef.current = 0.3;
    applyEffectiveVolume();
  }, [applyEffectiveVolume]);

  const unduck = useCallback(() => {
    duckLevelRef.current = 1.0;
    applyEffectiveVolume();
  }, [applyEffectiveVolume]);
```

In `toggleMute`, insert `applyEffectiveVolume(next)` immediately after the AsyncStorage write so the volume reflects the new mute state synchronously:
```tsx
      AsyncStorage.setItem(MUTE_STORAGE_KEY, String(next));
      applyEffectiveVolume(next);
      if (next) {
        playerRef.current?.pause();
      } else {
        // ... existing unmute logic
      }
```

Update `toggleMute`'s `useCallback` deps array to include `applyEffectiveVolume`:
```tsx
  }, [startNextFromBag, tracks, applyEffectiveVolume]);
```

Update the `value` memo to wire `duck` and `unduck`:
```tsx
  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute,
      skipTrack,
      duck,
      unduck,
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, toggleMute, skipTrack, duck, unduck, currentTrackName, isAudioAvailable]
  );
```

**Why the tests pass:** the `webUnlockGainRef` initializer (above) starts at `1` whenever `tracksOverride` is passed (test mode) or when there's no `document` (native). The duck/unduck assertions then see real volume values: `player.volume = 0.3` after `duck()` and `player.volume = 1.0` after `unduck()`. Production code paths (no `tracksOverride`, real browser) still start at `0` and are unlocked by Task 11's pointerdown listener.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 12 tests passing.

- [ ] **Step 5: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): duck/unduck with mute orthogonality (effective volume formula)"
```

---

## Task 10: Provider — AppState pause/resume

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`
- Modify: `src/audio/__tests__/BackgroundMusicProvider.test.tsx`

- [ ] **Step 1: Write failing tests**

Append to `src/audio/__tests__/BackgroundMusicProvider.test.tsx`:
```tsx
import { AppState } from 'react-native';

describe('BackgroundMusicProvider — AppState', () => {
  let listeners: Array<(s: string) => void>;
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
    listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener as (s: string) => void);
      return { remove: jest.fn() } as any;
    });
  });

  test('background → pause; active → play', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    const pauseCallsBefore = (player.pause as jest.Mock).mock.calls.length;
    listeners.forEach((l) => l('background'));
    expect((player.pause as jest.Mock).mock.calls.length).toBe(pauseCallsBefore + 1);
    const playCallsBefore = (player.play as jest.Mock).mock.calls.length;
    listeners.forEach((l) => l('active'));
    expect((player.play as jest.Mock).mock.calls.length).toBe(playCallsBefore + 1);
  });

  test('double-fire active → active does not call play twice', async () => {
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    const playCallsBefore = (player.play as jest.Mock).mock.calls.length;
    listeners.forEach((l) => l('active'));
    listeners.forEach((l) => l('active'));
    expect((player.play as jest.Mock).mock.calls.length).toBe(playCallsBefore);
  });

  test('AppState active does not unmute a muted player', async () => {
    await AsyncStorage.setItem('@sulat:bgmuted', 'true');
    render(
      <BackgroundMusicProvider tracksOverride={fakeTracks}>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    listeners.forEach((l) => l('background'));
    listeners.forEach((l) => l('active'));
    expect(player.play).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 3 new failures.

- [ ] **Step 3: Implement AppState listener**

In `src/audio/BackgroundMusicProvider.tsx`, add an effect that subscribes to AppState changes. Place it after the cold-start effect:

```tsx
import { AppState, AppStateStatus } from 'react-native';

  // ... inside component:
  const lastAppStateRef = useRef<AppStateStatus>('active');

  useEffect(() => {
    if (!isAudioAvailable) return;
    const handle = (next: AppStateStatus) => {
      const prev = lastAppStateRef.current;
      if (prev === next) return; // double-fire guard
      lastAppStateRef.current = next;
      if (next === 'background' || next === 'inactive') {
        playerRef.current?.pause();
      } else if (next === 'active') {
        if (!isMuted && playerRef.current) {
          playerRef.current.play();
        }
      }
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [isAudioAvailable, isMuted]);
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 15 tests passing.

- [ ] **Step 5: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx src/audio/__tests__/BackgroundMusicProvider.test.tsx
git commit -m "feat(audio): pause on background, resume on return with double-fire guard"
```

---

## Task 11: Web autoplay unlock (volume=0 → first-pointerdown ramp)

**Files:**
- Modify: `src/audio/BackgroundMusicProvider.tsx`

This task has no Jest tests because the test environment isn't a true browser. The behavior is verified manually in Task 16.

- [ ] **Step 1: Add web unlock effect**

In `src/audio/BackgroundMusicProvider.tsx`, add this effect after the cold-start effect:

```tsx
  // Web only: silent autoplay is allowed; sound is gated until first user gesture.
  // Start at webUnlockGain=0; ramp to 1 on first pointerdown.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isAudioAvailable) return;
    if (webUnlockGainRef.current === 1) return; // test-mode (tracksOverride) starts unlocked
    const unlock = () => {
      webUnlockGainRef.current = 1;
      applyEffectiveVolume();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, [isAudioAvailable, applyEffectiveVolume]);
```

In the cold-start effect, set the effective volume right after creating the player (before `player.play()`) so the initial volume is correct on web:

Replace this block in the cold-start effect:
```tsx
      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      attachEndListener(player);
      setCurrentTrackId(next);
      lastPlayedIdRef.current = next;

      if (!muted) player.play();
```

with:
```tsx
      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      attachEndListener(player);
      setCurrentTrackId(next);
      lastPlayedIdRef.current = next;

      applyEffectiveVolume(muted);
      if (!muted) player.play();
```

Also, inside `startNextFromBag`, set the volume after `player.replace()` so each new track starts at the right volume:

```tsx
    playerRef.current.replace(track.source);
    setCurrentTrackId(next);
    lastPlayedIdRef.current = next;
    applyEffectiveVolume(); // keep effective volume across track changes
    playerRef.current.play();
```

Add `applyEffectiveVolume` to `startNextFromBag`'s deps array:
```tsx
  }, [tracks, applyEffectiveVolume]);
```

Add `applyEffectiveVolume` to the cold-start `useEffect` deps array:
```tsx
  }, [isAudioAvailable, tracks, attachEndListener, applyEffectiveVolume]);
```

`applyEffectiveVolume` is already declared (in Task 9) above the cold-start effect — so this reference is valid in source order.

- [ ] **Step 2: Verify all existing tests still pass**

Run:
```
npm test -- --silent src/audio/__tests__/BackgroundMusicProvider.test.tsx
```
Expected: 15 tests passing (no new failures from Task 11).

- [ ] **Step 3: Commit**

```
git add src/audio/BackgroundMusicProvider.tsx
git commit -m "feat(audio): web autoplay unlock via first-pointerdown gain ramp"
```

---

## Task 12: Wire `BackgroundMusicProvider` into `app/_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the provider wrapper**

Replace the contents of `app/_layout.tsx` with:
```tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';
import { BackgroundMusicProvider } from '@/audio/BackgroundMusicProvider';

// Handwritten card fonts are loaded via <link> in public/index.html (Google Fonts CDN).
// This keeps ~400 KB of font data out of the JS bundle.
// If native builds are added later, restore useFonts() here with a Platform.OS check.

function UserInit() {
  useUser();
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <BackgroundMusicProvider>
        <UserInit />
        <Stack screenOptions={{ headerShown: false }} />
      </BackgroundMusicProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Run full test suite to confirm no regressions**

Run:
```
npm test -- --silent
```
Expected: existing 222 + new audio tests (~17) = ~239 passing, no new failures.

- [ ] **Step 3: Commit**

```
git add app/_layout.tsx
git commit -m "feat(audio): mount BackgroundMusicProvider at root"
```

---

## Task 13: Top-bar speaker icon in `app/index.tsx`

**Files:**
- Modify: `app/index.tsx` (around lines 270–290 where the profile + bell icons live)

- [ ] **Step 1: Add the speaker icon button before the profile icon**

Open `app/index.tsx`. Find the `<View style={styles.headerRight}>` block (around line 270). Before the existing profile `PressableScale`, insert:

```tsx
            {/* Background music mute toggle. Hidden when no manifest. */}
            {bgMusic.isAudioAvailable && (
              <PressableScale
                onPress={bgMusic.toggleMute}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: theme.accentDim,
                    borderColor: theme.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name={bgMusic.isMuted ? 'volume-mute' : 'volume-high'}
                  size={20}
                  color={theme.accent}
                />
              </PressableScale>
            )}
```

- [ ] **Step 2: Add the hook import and call**

Near the top of the file, add the import:
```tsx
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';
```

Inside the component body (near other hook calls), add:
```tsx
  const bgMusic = useBackgroundMusic();
```

- [ ] **Step 3: Run full test suite**

Run:
```
npm test -- --silent
```
Expected: no regressions.

- [ ] **Step 4: Commit**

```
git add app/index.tsx
git commit -m "feat(audio): top-bar speaker icon for music mute toggle"
```

---

## Task 14: Music rows in `ProfileModal`

**Files:**
- Modify: `src/profile/ProfileModal.tsx`

- [ ] **Step 1: Add hook import and section**

In `src/profile/ProfileModal.tsx`, add to the imports near the top:
```tsx
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';
import { Switch } from 'react-native';
```

Inside the component body, near the other hook calls (~line 34):
```tsx
  const bgMusic = useBackgroundMusic();
```

After the `<View style={[styles.divider, ...]}>` block following the style picker (~line 170), and before the `YOUR SULAT` section, insert a new section:

```tsx
          {bgMusic.isAudioAvailable && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textFaint }]}>MUSIC</Text>
              <View style={styles.musicRow}>
                <Text style={[styles.musicLabel, { color: theme.textPrimary }]}>Music off</Text>
                <Switch
                  value={bgMusic.isMuted}
                  onValueChange={bgMusic.toggleMute}
                  trackColor={{ false: theme.borderSoft, true: theme.accent }}
                  thumbColor={theme.surface}
                />
              </View>
              <PressableScale onPress={bgMusic.skipTrack} style={styles.musicRow}>
                <Text style={[styles.musicLabel, { color: theme.textPrimary }]}>Skip track</Text>
                <Text style={[styles.musicAction, { color: theme.accent }]}>↦</Text>
              </PressableScale>
              {bgMusic.currentTrackName && (
                <Text style={[styles.nowPlaying, { color: theme.textFaint }]}>
                  Now playing: {bgMusic.currentTrackName}
                </Text>
              )}
              <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />
            </>
          )}
```

- [ ] **Step 2: Add the new styles**

Append to the `StyleSheet.create({...})` block in the same file:
```tsx
  musicRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  musicLabel: { fontSize: 14 },
  musicAction: { fontSize: 18, fontWeight: '600' },
  nowPlaying: { fontSize: 11, marginTop: 2 },
```

- [ ] **Step 3: Run full test suite**

Run:
```
npm test -- --silent
```
Expected: no regressions.

- [ ] **Step 4: Commit**

```
git add src/profile/ProfileModal.tsx
git commit -m "feat(audio): music section (off toggle + skip + now playing) in ProfileModal"
```

---

## Task 15: Duck wiring in `ComposeSheet.tsx`

**Files:**
- Modify: `src/compose/ComposeSheet.tsx`

- [ ] **Step 1: Add hook import**

At the top of `src/compose/ComposeSheet.tsx`, add the import:
```tsx
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';
```

- [ ] **Step 2: Add the duck/unduck effect**

Inside the `ComposeSheet` component, near the other `useEffect` calls, add:
```tsx
  const bgMusic = useBackgroundMusic();
  useEffect(() => {
    bgMusic.duck();
    return () => bgMusic.unduck();
  }, [bgMusic]);
```

- [ ] **Step 3: Run full test suite**

Run:
```
npm test -- --silent
```
Expected: no regressions. If any ComposeSheet integration test fails because `useBackgroundMusic` throws (no provider in the test render tree), wrap that test's render in `<BackgroundMusicProvider>`.

- [ ] **Step 4: Commit**

```
git add src/compose/ComposeSheet.tsx
git commit -m "feat(audio): duck music while ComposeSheet is open"
```

---

## Task 16: Manual verification + dev server smoke test

This task has no automated steps — it's the manual checklist that proves the feature works in real environments. Run after the user has dropped MP3 files into `assets/audio/` and added matching entries to `tracks.ts`.

- [ ] **Step 1: Add at least one track to the manifest**

If `assets/audio/` still has no MP3 files, ask the user to drop one in. Once present, edit `src/audio/tracks.ts` to register it:
```ts
export const TRACKS: Track[] = [
  { id: 'quiet-night', displayName: 'Quiet Night', source: require('../../assets/audio/quiet-night.mp3') },
];
```
Repeat for additional tracks.

- [ ] **Step 2: Start the web preview**

Use the `mcp__Claude_Preview__preview_start` tool with the cozy-map-app workspace (or run `npm run web`) and confirm Metro starts cleanly with no module-resolution errors for `expo-audio`.

- [ ] **Step 3: Web golden-path verification**

Open `http://localhost:8081` (or the existing preview URL) in a fresh browser tab.
- Confirm: no audio plays initially (unmuted but `webUnlockGain=0`).
- Tap anywhere on the page (e.g., the map). Confirm music starts playing within ~1s.
- Tap the new speaker icon in the top bar. Confirm music pauses and the icon switches to `volume-mute`.
- Reload the page. Confirm music does NOT auto-play (mute persisted).
- Tap the speaker icon. Confirm music resumes.
- Open DevTools → Application → Local Storage. Confirm `@sulat:bgmuted` reflects the current state.

- [ ] **Step 4: Web track-rotation verification**

- Open the profile sheet. Confirm "MUSIC" section visible with "Music off" toggle and "Skip track" row plus "Now playing: <name>" caption.
- Tap "Skip track" several times. Confirm the caption updates and audio changes.
- Verify in the network tab that no track is requested twice in a row across the bag boundary.

- [ ] **Step 5: ComposeSheet duck verification**

- With music playing at full volume, tap the `+` FAB. Confirm music volume drops audibly when the ComposeSheet opens.
- Close the ComposeSheet (✕ or back gesture). Confirm volume returns to full.

- [ ] **Step 6: Yield verification (web)**

- Open a YouTube tab and start a video.
- Reload Sulat. With `interruptionMode: 'mixWithOthers'` configured, Sulat will play *alongside* the YouTube tab — both audible. This is intentional (see spec's "Audio focus follow-up"). User can mute Sulat with the speaker icon. The first launch is the only time both can collide; the muted state persists.

- [ ] **Step 7: Native verification (Pixel 7 emulator) — DEFERRED PER HANDOFF**

The native build at `C:/sb` is stale (does not include this feature). Re-running native verification requires re-robocopying `mobile` HEAD into `C:/sb` and rebuilding the APK. If the user wants this now, do it; otherwise skip and note in commit message.

- [ ] **Step 8: Final commit (only if any tracks.ts edits were needed)**

```
git add src/audio/tracks.ts
git commit -m "feat(audio): register initial track manifest"
```

If no manifest edits were needed (user pre-populated), no commit.

---

## Self-review notes (already applied)

Spec coverage check:
- All locked decisions from the spec table → mapped to specific tasks (Tasks 6–11).
- Edge cases from the spec's Edge Cases section → covered in tests (Tasks 5–10) and the resilient implementation (try/catch around `player.replace`, `lastAppState` ref, orthogonal volume formula).
- Testing section's unit + integration counts → met by Tasks 2 (5 unit tests for shuffleBag) + Tasks 5–10 (15 integration tests for the provider). Audio session adds 4 more. Total ~24 new tests, slightly above the spec's ~22 estimate.
- Manual verification list from the spec → mapped to Task 16 substeps.
