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
    const { configureAudioSession: webImpl } = await import('../audioSession');
    await webImpl();
    expect(setAudioModeAsync).not.toHaveBeenCalled();
  });
});
