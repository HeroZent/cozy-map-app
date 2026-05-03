import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';
import { TRACKS, Track } from './tracks';
import { createBag, drawNext } from './shuffleBag';
import { configureAudioSession } from './audioSession';
import { BackgroundMusicContext, BackgroundMusicAPI } from './useBackgroundMusic';

const MUTE_STORAGE_KEY = '@sulat:bgmuted';

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
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const bagRef = useRef<string[]>([]);
  const lastPlayedIdRef = useRef<string | null>(null);

  // Helper: swap to the next track from the bag and play it.
  // Re-used by both the natural-end listener (Task 8 wires the listener) and skipTrack.
  const startNextFromBag = useCallback(() => {
    if (!playerRef.current) return;
    if (bagRef.current.length === 0) {
      bagRef.current = createBag(
        tracks.map((t) => t.id),
        lastPlayedIdRef.current ?? undefined
      );
    }
    const { next, remaining } = drawNext(bagRef.current);
    bagRef.current = remaining;
    const track = tracks.find((t) => t.id === next)!;
    playerRef.current.replace(track.source);
    setCurrentTrackId(next);
    lastPlayedIdRef.current = next;
    playerRef.current.play();
  }, [tracks]);

  // Attach the natural-end listener once when a player is created.
  // Track-end → setTimeout(gap) → next-track via startNextFromBag.
  const attachEndListener = useCallback(
    (player: ReturnType<typeof createAudioPlayer>) => {
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setCurrentTrackId(null);
          setTimeout(() => {
            startNextFromBag();
          }, trackGapMs);
        }
      });
    },
    [trackGapMs, startNextFromBag]
  );

  // Cold-start effect.
  useEffect(() => {
    if (!isAudioAvailable) return;
    let cancelled = false;
    (async () => {
      const persisted = await AsyncStorage.getItem(MUTE_STORAGE_KEY);
      const muted = persisted === 'true';
      if (cancelled) return;
      setIsMuted(muted);

      await configureAudioSession();
      if (cancelled) return;

      bagRef.current = createBag(tracks.map((t) => t.id));
      const { next, remaining } = drawNext(bagRef.current);
      bagRef.current = remaining;
      const track = tracks.find((t) => t.id === next)!;

      const player = createAudioPlayer(track.source);
      playerRef.current = player;
      attachEndListener(player);
      setCurrentTrackId(next);
      lastPlayedIdRef.current = next;

      if (!muted) player.play();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.remove();
    };
  }, [isAudioAvailable, tracks, attachEndListener]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(MUTE_STORAGE_KEY, String(next));
      if (next) {
        playerRef.current?.pause();
      } else {
        playerRef.current?.play();
      }
      return next;
    });
  }, []);

  const currentTrackName = currentTrackId
    ? tracks.find((t) => t.id === currentTrackId)?.displayName ?? null
    : null;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute,
      skipTrack: () => {},
      duck: () => {},
      unduck: () => {},
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, toggleMute, currentTrackName, isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
