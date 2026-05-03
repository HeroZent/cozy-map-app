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
