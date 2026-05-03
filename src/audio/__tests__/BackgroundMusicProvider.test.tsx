import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BackgroundMusicProvider } from '../BackgroundMusicProvider';
import { useBackgroundMusic } from '../useBackgroundMusic';
import { __lastPlayer, createAudioPlayer } from 'expo-audio';
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
