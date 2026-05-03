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
