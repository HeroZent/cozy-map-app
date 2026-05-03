import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Text, Pressable, AppState, AppStateStatus } from 'react-native';
import { BackgroundMusicProvider } from '../BackgroundMusicProvider';
import { useBackgroundMusic } from '../useBackgroundMusic';
import { __lastPlayer, createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

const fakeTracks = [
  { id: 't1', displayName: 'Track 1', source: 1 as unknown as number },
  { id: 't2', displayName: 'Track 2', source: 2 as unknown as number },
];

// Flush microtasks AND drain one macrotask cycle so async useEffect chains
// and setTimeout(0) callbacks (used in the natural-end track transition) can
// both settle. Wrapped in act() so React commits queued state updates and
// runs the resulting effects synchronously.
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

function Probe() {
  const api = useBackgroundMusic();
  return <Text testID="probe">{api.isAudioAvailable ? 'yes' : 'no'}</Text>;
}

function MuteButton() {
  const api = useBackgroundMusic();
  return (
    <Pressable testID="mute-btn" onPress={api.toggleMute}>
      <Text>{api.isMuted ? 'muted' : 'unmuted'}</Text>
    </Pressable>
  );
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

function DuckButtons() {
  const api = useBackgroundMusic();
  return (
    <>
      <Pressable testID="duck-btn" onPress={api.duck}><Text>duck</Text></Pressable>
      <Pressable testID="unduck-btn" onPress={api.unduck}><Text>unduck</Text></Pressable>
      <Pressable testID="duck-mute-btn" onPress={api.toggleMute}><Text>mute</Text></Pressable>
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
    fireEvent.press(screen.getByTestId('duck-mute-btn'));
    await flush();
    fireEvent.press(screen.getByTestId('duck-btn'));
    expect(player.volume).toBe(0);
    fireEvent.press(screen.getByTestId('unduck-btn'));
    expect(player.volume).toBe(0);
  });
});

describe('BackgroundMusicProvider — AppState', () => {
  let listeners: Array<(s: AppStateStatus) => void>;
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
    listeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      const fn = listener as (s: AppStateStatus) => void;
      listeners.push(fn);
      return {
        remove: () => {
          listeners = listeners.filter((l) => l !== fn);
        },
      } as any;
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
