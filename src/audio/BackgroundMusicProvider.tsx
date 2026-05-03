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
