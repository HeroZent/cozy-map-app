import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { TRACKS, Track } from './tracks';
import { createBag, drawNext } from './shuffleBag';
import { configureAudioSession } from './audioSession';
import { BackgroundMusicContext, BackgroundMusicAPI } from './useBackgroundMusic';

const MUTE_STORAGE_KEY = '@sulat:bgmuted';

export type BackgroundMusicProviderProps = {
  children: ReactNode;
  /** TEST ONLY. Replaces the bundled TRACKS manifest. */
  tracksOverride?: Track[];
  /** TEST ONLY. Overrides the natural-end pause between tracks. Default 1500ms. */
  trackGapMs?: number;
};

export function BackgroundMusicProvider({
  children,
  tracksOverride,
  trackGapMs = 1500,
}: BackgroundMusicProviderProps) {
  const tracks = tracksOverride ?? TRACKS;
  const isAudioAvailable = tracks.length > 0;
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const bagRef = useRef<string[]>([]);

  // Cold-start effect.
  useEffect(() => {
    if (!isAudioAvailable) return;
    let cancelled = false;
    (async () => {
      // 1. Read persisted mute.
      const persisted = await AsyncStorage.getItem(MUTE_STORAGE_KEY);
      const muted = persisted === 'true';
      if (cancelled) return;
      setIsMuted(muted);

      // 2. Configure audio session (mixWithOthers — see audioSession.ts).
      await configureAudioSession();
      if (cancelled) return;

      // 3. Init bag and draw first track.
      bagRef.current = createBag(tracks.map((t) => t.id));
      const { next, remaining } = drawNext(bagRef.current);
      bagRef.current = remaining;
      const track = tracks.find((t) => t.id === next)!;

      // 4. Create player (this also starts loading the source).
      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      setCurrentTrackId(next);

      // 5. Play unless muted. (Volume management arrives in Task 9.)
      if (!muted) player.play();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.remove();
    };
  }, [isAudioAvailable]);

  const currentTrackName = currentTrackId
    ? tracks.find((t) => t.id === currentTrackId)?.displayName ?? null
    : null;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute: () => {}, // implemented in Task 7
      skipTrack: () => {},  // implemented in Task 8
      duck: () => {},       // implemented in Task 9
      unduck: () => {},     // implemented in Task 9
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, currentTrackName, isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
