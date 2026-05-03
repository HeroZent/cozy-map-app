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
