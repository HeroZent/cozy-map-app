import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
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

  const duckLevelRef = useRef(1.0);
  const webUnlockGainRef = useRef<number>(
    tracksOverride !== undefined || typeof document === 'undefined' ? 1 : 0
  );
  // Mirror isMuted into a ref so applyEffectiveVolume can be a stable callback.
  // Without this, applyEffectiveVolume would change on every mute toggle and
  // cause the cold-start useEffect to re-fire, which is incorrect.
  const isMutedRef = useRef(false);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const applyEffectiveVolume = useCallback((mutedOverride?: boolean) => {
    const muted = mutedOverride ?? isMutedRef.current;
    const v = muted ? 0 : duckLevelRef.current * webUnlockGainRef.current;
    if (playerRef.current) playerRef.current.volume = v;
  }, []);

  const duck = useCallback(() => {
    duckLevelRef.current = 0.3;
    applyEffectiveVolume();
  }, [applyEffectiveVolume]);

  const unduck = useCallback(() => {
    duckLevelRef.current = 1.0;
    applyEffectiveVolume();
  }, [applyEffectiveVolume]);

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
    applyEffectiveVolume();
    playerRef.current.play();
  }, [tracks, applyEffectiveVolume]);

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

      applyEffectiveVolume(muted);
      if (!muted) player.play();
    })();
    return () => {
      cancelled = true;
      playerRef.current?.remove();
    };
  }, [isAudioAvailable, tracks, attachEndListener]);

  // Web only: silent autoplay is allowed; sound is gated until first user gesture.
  // Start at webUnlockGain=0; ramp to 1 on first pointerdown.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isAudioAvailable) return;
    if (webUnlockGainRef.current === 1) return; // test-mode (tracksOverride) starts unlocked
    const unlock = () => {
      webUnlockGainRef.current = 1;
      applyEffectiveVolume();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, [isAudioAvailable, applyEffectiveVolume]);

  // AppState pause/resume. Reads isMuted via ref so the listener doesn't have
  // to re-attach on every mute toggle.
  const lastAppStateRef = useRef<AppStateStatus>('active');
  useEffect(() => {
    if (!isAudioAvailable) return;
    const handle = (next: AppStateStatus) => {
      const prev = lastAppStateRef.current;
      if (prev === next) return; // double-fire guard
      lastAppStateRef.current = next;
      if (next === 'background' || next === 'inactive') {
        playerRef.current?.pause();
      } else if (next === 'active') {
        if (!isMutedRef.current && playerRef.current) {
          playerRef.current.play();
        }
      }
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [isAudioAvailable]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      AsyncStorage.setItem(MUTE_STORAGE_KEY, String(next));
      applyEffectiveVolume(next);
      if (next) {
        playerRef.current?.pause();
      } else {
        playerRef.current?.play();
      }
      return next;
    });
  }, [applyEffectiveVolume]);

  const skipTrack = useCallback(() => {
    if (!playerRef.current) return;
    startNextFromBag();
  }, [startNextFromBag]);

  const currentTrackName = currentTrackId
    ? tracks.find((t) => t.id === currentTrackId)?.displayName ?? null
    : null;

  const value = useMemo<BackgroundMusicAPI>(
    () => ({
      isMuted,
      toggleMute,
      skipTrack,
      duck,
      unduck,
      currentTrackName,
      isAudioAvailable,
    }),
    [isMuted, toggleMute, skipTrack, duck, unduck, currentTrackName, isAudioAvailable]
  );

  return (
    <BackgroundMusicContext.Provider value={value}>{children}</BackgroundMusicContext.Provider>
  );
}
