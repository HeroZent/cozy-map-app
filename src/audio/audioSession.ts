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
