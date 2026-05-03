/**
 * @jest-environment jsdom
 *
 * Regression tests for the web autoplay-unlock path in BackgroundMusicProvider.
 *
 * These tests must run under jsdom so `document` exists and the provider's
 * `document.addEventListener('pointerdown', ...)` listener attaches. Under
 * the default node env, the provider short-circuits the unlock effect and
 * the production code path is unreachable from tests — which is exactly how
 * the autoplay bug shipped to prod the first time. Keep this in jsdom.
 */
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BackgroundMusicProvider } from '../BackgroundMusicProvider';
import { __lastPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

describe('BackgroundMusicProvider — web autoplay unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __lastPlayer.current = null;
    AsyncStorage.clear();
  });

  // Browser autoplay policy rejects the cold-start play() because it isn't
  // inside a user gesture. The pointerdown unlock must (re)call play() to
  // satisfy the policy. Without tracksOverride, the provider engages the
  // production unlock path (webUnlockGain starts at 0).
  test('first pointerdown calls play() to satisfy browser autoplay policy', async () => {
    render(
      <BackgroundMusicProvider>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    const playCallsBefore = (player.play as jest.Mock).mock.calls.length;
    await act(async () => {
      document.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });
    expect((player.play as jest.Mock).mock.calls.length).toBe(playCallsBefore + 1);
  });

  test('first pointerdown does NOT call play() when persisted muted=true', async () => {
    await AsyncStorage.setItem('@sulat:bgmuted', 'true');
    render(
      <BackgroundMusicProvider>
        <Text>x</Text>
      </BackgroundMusicProvider>
    );
    await flush();
    const player = __lastPlayer.current!;
    const playCallsBefore = (player.play as jest.Mock).mock.calls.length;
    await act(async () => {
      document.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
    });
    expect((player.play as jest.Mock).mock.calls.length).toBe(playCallsBefore);
  });
});
