// Auto-mocked by Jest via jest.mock('expo-audio') in jest.setup.js.
// Each call to createAudioPlayer() returns a new spy-able fake.
type StatusListener = (status: { didJustFinish?: boolean; isLoaded?: boolean }) => void;

export class FakePlayer {
  volume = 1;
  isLoaded = false;
  source: number | null = null;
  paused = true;
  positionMillis = 0;
  private listeners: StatusListener[] = [];

  load = jest.fn(async (source: number) => {
    this.source = source;
    this.isLoaded = true;
  });
  unload = jest.fn(async () => {
    this.isLoaded = false;
  });
  play = jest.fn(() => {
    this.paused = false;
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
  setVolume = jest.fn((v: number) => {
    this.volume = v;
  });
  addListener = jest.fn((listener: StatusListener) => {
    this.listeners.push(listener);
    return { remove: () => { this.listeners = this.listeners.filter((l) => l !== listener); } };
  });
  // Test helper — call from tests to simulate end-of-track.
  __emitFinish = () => {
    this.listeners.forEach((l) => l({ didJustFinish: true }));
  };
}

export const __lastPlayer = { current: null as FakePlayer | null };

export const createAudioPlayer = jest.fn(() => {
  const p = new FakePlayer();
  __lastPlayer.current = p;
  return p;
});

export const setAudioModeAsync = jest.fn(async () => {});

export const AudioModule = {
  getStatusAsync: jest.fn(async () => ({ isLoaded: false, isOtherAudioPlaying: false })),
};
