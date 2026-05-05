import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, PanResponder } from 'react-native';
import * as Location from 'expo-location';
import { screenToMapCoords } from '@/map/screenToMapCoords';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StoryPins } from '@/map/StoryPins';
import { HeatmapLayer } from '@/map/HeatmapLayer';
import { StorySheet } from '@/story/StorySheet';
import { ComposeSheet } from '@/compose/ComposeSheet';
import { LanternSheet } from '@/lantern/LanternSheet';
import { SettingsSheet } from '@/settings/SettingsSheet';
import { ProfileModal } from '@/profile/ProfileModal';
import { useStories } from '@/data/useStories';
import { useReadStories } from '@/data/useReadStories';
import { useUnreadFilter } from '@/data/useUnreadFilter';
import { useUser } from '@/data/useUser';
import { useViewport } from '@/map/useViewport';
import { useTheme } from '@/theme/ThemeContext';
import { SulatLoader } from '@/brand/SulatLoader';
import { SulatLogo } from '@/brand/SulatLogo';
import { useLoaderGating } from '@/brand/useLoaderGating';
import { MapVignette, MapWarmTint } from '@/map/MapVignette';
import { PressableScale } from '@/components/PressableScale';
import { GlassSurface } from '@/components/GlassSurface';
import { ClusterStoriesSheet } from '@/cluster/ClusterStoriesSheet';
import { DraftPinMarker } from '@/compose/DraftPinMarker';
import { DraftConfirmChip } from '@/compose/DraftConfirmChip';
import { UnreadFilterChip } from '@/map/UnreadFilterChip';
import { useMoodFilter } from '@/data/useMoodFilter';
import { MoodFilterChip } from '@/map/MoodFilterChip';
import { MoodFilterSheet } from '@/map/MoodFilterSheet';
import type { FlyTarget } from '@/map/MapView';  // import type is erased at build time — safe, no CSS side-effect
import type { Story } from '@/data/types';
import type { Mood } from '@/data/types';
import { useNotifications } from '@/data/useNotifications';
import { MemoryBanner } from '@/notifications/MemoryBanner';
import { ActivityBanner } from '@/notifications/ActivityBanner';
import { NotificationSheet } from '@/notifications/NotificationSheet';
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';

const LazyMapView = React.lazy(() => import('@/map/LazyMapView'));

const NAV_HEIGHT = 76;

function MapSkeleton() {
  return (
    <View style={styles.skeleton}>
      <SulatLogo size={48} />
      <Text style={styles.skeletonHint}>finding your place on the map…</Text>
    </View>
  );
}

export default function Home() {
  const { viewport } = useViewport();
  const bbox: [number, number, number, number] = [-180, -85, 180, 85];
  const bgMusic = useBackgroundMusic();
  const [refreshKey, setRefreshKey] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    setRefreshKey((k) => k + 1);
  }, []));
  const { stories, loading } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] }, refreshKey);
  const { user } = useUser();
  const { read, starred, hydrating: readsHydrating } = useReadStories();
  const { unreadOnly, hydrating: filterHydrating } = useUnreadFilter();
  const { selectedMoods, hydrating: moodHydrating } = useMoodFilter();
  const loaderGating = useLoaderGating(loading || readsHydrating || filterHydrating || moodHydrating);
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const visibleStories = useMemo(() => {
    const meId = user?.id;
    return stories.filter((s) => {
      // Mood filter — applies regardless of override; selectedMoods is the
      // override-aware computed Set (returns all moods when no override).
      if (!selectedMoods.has(s.mood as Mood)) return false;
      // Unread filter — composes via AND.
      if (!unreadOnly) return true;
      return s.author_id === meId || starred.has(s.id) || !read.has(s.id);
    });
  }, [stories, unreadOnly, selectedMoods, read, starred, user?.id]);

  // Keep the open story card in sync with fresh data from every refetch.
  // Without this, reactions and reply counts show stale values until the
  // user closes and reopens the sheet.
  useEffect(() => {
    if (!selectedStory) return;
    const updated = stories.find((s) => s.id === selectedStory.id);
    if (updated) setSelectedStory(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]); // intentionally omit selectedStory — only run when stories changes
  type DraftPhase =
    | { kind: 'idle' }
    | { kind: 'placing'; coords: { lat: number; lng: number } }
    | { kind: 'composing'; coords: { lat: number; lng: number } };

  const [draftPhase, setDraftPhase] = useState<DraftPhase>({ kind: 'idle' });
  const [lanternOpen, setLanternOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  /** When a cluster is tapped, this holds the list of stories to show in
      the cluster sheet. null when no cluster is open. */
  const [clusterStories, setClusterStories] = useState<Story[] | null>(null);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const theme = useTheme();
  const { notifications, memoryCount, activityCount, markRead } = useNotifications();

  // Register service worker for web push (web only — no-op on native)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[sw] registration failed:', err);
      });
    }
  }, []);

  const replyCount = useMemo(
    () => notifications.filter((n) => n.type === 'new_reply').length,
    [notifications],
  );
  const reactionCount = useMemo(
    () => notifications.filter((n) => n.type === 'new_reaction').length,
    [notifications],
  );

  const closeAllSheets = () => {
    setSelectedStory(null);
    setDraftPhase({ kind: 'idle' });
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
    setNotifSheetOpen(false);
    setClusterStories(null);
    setMoodSheetOpen(false);
  };

  const openProfile = () => {
    closeAllSheets();
    setProfileOpen(true);
  };

  const openNotifications = () => {
    closeAllSheets();
    setNotifSheetOpen(true);
  };

  const handleNearMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      setFlyTarget({ lat: coords.latitude, lng: coords.longitude, zoom: 14 });
    } catch {}
  };

  /** Resolve the coords where a pin drops when the user taps "+":
   *  Use the user's GPS if granted; otherwise fall back to the current
   *  viewport center read from useViewport(). */
  const resolveDropCoords = useCallback(async (): Promise<{ lat: number; lng: number }> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const { coords } = await Location.getCurrentPositionAsync({});
        return { lat: coords.latitude, lng: coords.longitude };
      }
    } catch {
      /* fall through to viewport center */
    }
    return { lat: viewport.latitude, lng: viewport.longitude };
  }, [viewport.latitude, viewport.longitude]);

  const startDraftFromFab = useCallback(async () => {
    closeAllSheets();
    const coords = await resolveDropCoords();
    setDraftPhase({ kind: 'placing', coords });
  }, [resolveDropCoords]);

  // Press-and-drag from `+` (Gesture B): hold the FAB for 200ms to
  // arm drag mode (FAB scales up for visual feedback), then drag the
  // finger across the map; on release we unproject the screen point
  // to lng/lat and drop a pin there. Plain taps (release before arm)
  // fall through to startDraftFromFab() for the existing GPS-or-center
  // behavior.
  const [fabDragging, setFabDragging] = useState(false);
  const [fabPressed, setFabPressed] = useState(false);
  const [fabDragOffset, setFabDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const fabArmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fabDraggingRef = useRef(false);
  // Defense-in-depth mirror — the ref is also written directly inside the
  // grant timer and release/terminate handlers so the drag flag is in sync
  // independent of React's commit cycle. This effect remains as a safety net.
  useEffect(() => { fabDraggingRef.current = fabDragging; }, [fabDragging]);

  const fabPanResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (fabArmTimerRef.current) clearTimeout(fabArmTimerRef.current);
        setFabPressed(true);
        fabArmTimerRef.current = setTimeout(() => {
          fabArmTimerRef.current = null;
          fabDraggingRef.current = true;  // sync ref before React commit, so release reads correctly
          setFabDragging(true);
        }, 200);
      },
      onPanResponderMove: (_e, g) => {
        if (!fabDraggingRef.current) return;
        setFabDragOffset({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: async (_e, g) => {
        if (fabArmTimerRef.current) { clearTimeout(fabArmTimerRef.current); fabArmTimerRef.current = null; }
        const wasDragging = fabDraggingRef.current;
        fabDraggingRef.current = false;
        setFabDragging(false);
        setFabPressed(false);
        setFabDragOffset({ x: 0, y: 0 });
        if (!wasDragging) {
          // Plain tap — fall through to the existing tap handler
          startDraftFromFab();
          return;
        }
        // Use gestureState.moveX/Y — these are the latest pageX/pageY of
        // the touch event, which is exactly what map.unproject() expects.
        // Avoids the parent-relative-vs-page-relative mismatch that
        // onLayout-based math suffered from (the FAB is nested inside
        // fabWrap → bottomBar GlassSurface, so layout.x/y were local).
        const screenX = g.moveX;
        const screenY = g.moveY;
        const dropCoords = await screenToMapCoords({ x: screenX, y: screenY });
        if (dropCoords) {
          closeAllSheets();
          setDraftPhase({ kind: 'placing', coords: dropCoords });
        }
      },
      onPanResponderTerminate: () => {
        if (fabArmTimerRef.current) { clearTimeout(fabArmTimerRef.current); fabArmTimerRef.current = null; }
        fabDraggingRef.current = false;
        setFabDragging(false);
        setFabPressed(false);
        setFabDragOffset({ x: 0, y: 0 });
      },
    }),
    [startDraftFromFab],
  );

  return (
    <View style={styles.fill}>
      {/* Map fills entire screen — loaded lazily so the app shell renders first */}
      <Suspense fallback={<MapSkeleton />}>
        <LazyMapView
          onDoubleClick={(loc) => {
            closeAllSheets();
            setDraftPhase({ kind: 'placing', coords: { lat: loc.lat, lng: loc.lng } });
          }}
          flyTarget={flyTarget}
        >
          {heatmapOn && <HeatmapLayer stories={stories} />}
          <StoryPins
            stories={visibleStories}
            zoom={viewport.zoom}
            bbox={bbox}
            onSelect={(story) => { closeAllSheets(); setSelectedStory(story); }}
            onClusterSelect={(list) => { closeAllSheets(); setClusterStories(list); }}
          />

          {/* Draggable draft pin — only visible while compose is open. Lets
              the user fine-tune the post location before submitting on web.
              (Native: shown as a static pin pending drag implementation.) */}
          {draftPhase.kind !== 'idle' && (
            <DraftPinMarker
              longitude={draftPhase.coords.lng}
              latitude={draftPhase.coords.lat}
              onDragEnd={(loc) => setDraftPhase((p) =>
                p.kind === 'idle' ? p : { kind: p.kind, coords: { lat: loc.lat, lng: loc.lng } }
              )}
            />
          )}

          {draftPhase.kind === 'placing' && (
            <DraftConfirmChip
              coords={draftPhase.coords}
              onWrite={() => setDraftPhase({ kind: 'composing', coords: draftPhase.coords })}
              onCancel={() => setDraftPhase({ kind: 'idle' })}
            />
          )}
        </LazyMapView>
      </Suspense>

      <MapWarmTint />
      <MapVignette />

      {/* Floating header — frosted glass strip */}
      <GlassSurface style={styles.headerGlass} pointerEvents="box-none">
        <View style={styles.headerInner} pointerEvents="box-none">
          <SulatLogo size={38} />
          <View style={styles.headerRight} pointerEvents="box-none">
            {bgMusic.isAudioAvailable && (
              <PressableScale
                onPress={bgMusic.toggleMute}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: theme.accentDim,
                    borderColor: theme.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons
                  name={bgMusic.isMuted ? 'volume-mute' : 'volume-high'}
                  size={20}
                  color={theme.accent}
                />
              </PressableScale>
            )}
            <PressableScale
              onPress={openProfile}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.accentDim,
                  borderColor: theme.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              {/* Vector icon (not emoji) so the user glyph picks up theme.accent
               *  the same gold tint as the ⚙ gear, matching the bell's
               *  perceived warmth across the header. */}
              <Ionicons name="person" size={20} color={theme.accent} />
              {/* Badge stays here as a visual cue directing users to the bell — intentional duplicate. */}
              {activityCount > 0 && (
                <View style={[styles.iconBadge, { backgroundColor: theme.accent }]} />
              )}
            </PressableScale>

            <PressableScale
              onPress={openNotifications}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.accentDim,
                  borderColor: theme.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Text style={[styles.iconBtnText, { color: theme.accent }]}>🔔</Text>
              {activityCount + memoryCount > 0 && (
                <View style={[styles.iconBadge, { backgroundColor: theme.accent }]} />
              )}
            </PressableScale>

            <PressableScale
              onPress={() => { closeAllSheets(); setSettingsOpen(true); }}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.accentDim,
                  borderColor: theme.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Text style={[styles.iconBtnText, { color: theme.accent }]}>⚙</Text>
            </PressableScale>
          </View>
        </View>
        {/* Hairline accent border at the bottom of the glass strip */}
        <View style={[styles.headerHairline, { backgroundColor: theme.borderSoft }]} />
      </GlassSurface>

      {/* Story card — floats above nav bar */}
      {selectedStory && (
        <StorySheet
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onReacted={() => setRefreshKey((k) => k + 1)}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Cluster list sheet — fires when a clustered pin is tapped */}
      {clusterStories && (
        <ClusterStoriesSheet
          stories={clusterStories}
          onClose={() => setClusterStories(null)}
          onSelectStory={(story) => {
            setClusterStories(null);
            setSelectedStory(story);
            // Smoothly zoom the map to the picked sulat's pin so the user
            // sees its place on the map while reading.
            const [lng, lat] = story.location.coordinates as [number, number];
            setFlyTarget({ lat, lng, zoom: 16 });
          }}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Lantern sheet — floats above nav bar */}
      {lanternOpen && (
        <LanternSheet
          onClose={() => setLanternOpen(false)}
          onSelectStory={(story) => {
            const [lng, lat] = story.location.coordinates as [number, number];
            setFlyTarget({ lat, lng, zoom: 14 });
          }}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Compose sheet — floats above nav bar */}
      {draftPhase.kind === 'composing' && (
        <ComposeSheet
          coords={draftPhase.coords}
          onClose={() => setDraftPhase({ kind: 'idle' })}
          onPosted={() => { setDraftPhase({ kind: 'idle' }); setRefreshKey((k) => k + 1); }}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Profile modal — floats above nav bar */}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onNavigate={(lat, lng) => setFlyTarget({ lat, lng, zoom: 14 })}
          onDeleted={() => setRefreshKey((k) => k + 1)}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Notification sheet — floats above nav bar */}
      {notifSheetOpen && (
        <NotificationSheet
          onClose={() => setNotifSheetOpen(false)}
          onNavigate={(lat, lng) => setFlyTarget({ lat, lng, zoom: 14 })}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Settings sheet — floats above nav bar */}
      {settingsOpen && (
        <SettingsSheet
          onClose={() => setSettingsOpen(false)}
          heatmapOn={heatmapOn}
          onHeatmapToggle={() => setHeatmapOn((v) => !v)}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Activity banner — floats below header, auto-dismisses after 4s */}
      <ActivityBanner
        activityCount={activityCount}
        replyCount={replyCount}
        reactionCount={reactionCount}
        topOffset={100}
      />

      {/* Memory banner — floats above nav bar, disappears on tap */}
      <MemoryBanner
        notifications={notifications}
        memoryCount={memoryCount}
        markRead={markRead}
        bottomOffset={NAV_HEIGHT}
      />

      {/* Bottom nav bar — frosted glass dock */}
      <GlassSurface style={styles.bottomBar}>
        {/* Hairline accent line at the top of the dock */}
        <View style={[styles.bottomHairline, { backgroundColor: theme.borderSoft }]} />

        <View style={styles.bottomBarInner}>
          <PressableScale onPress={handleNearMe} style={styles.navBtn}>
            <Text style={styles.navIcon}>📍</Text>
            <Text style={[styles.navLabel, { color: theme.textMuted }]}>Near me</Text>
          </PressableScale>

          {/* Center FAB — raised pillar with multi-layer shadow + golden glow */}
          <View style={styles.fabWrap} pointerEvents="box-none">
            {/* Outer halo glow ring */}
            <View
              style={[
                styles.fabHalo,
                { backgroundColor: theme.accentSoft, borderRadius: theme.radii.full },
              ]}
              pointerEvents="none"
            />
            <View
              testID="fab-plus"
              {...fabPanResponder.panHandlers}
            >
              <View
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.accent,
                    borderRadius: theme.radii.full,
                    ...theme.elevations.glow,
                    transform: [
                      { translateX: fabDragOffset.x },
                      { translateY: fabDragOffset.y },
                      { scale: fabDragging ? 1.18 : (fabPressed ? 0.96 : 1) },
                    ],
                  },
                ]}
              >
                <Text style={styles.fabPlus}>＋</Text>
              </View>
            </View>
          </View>

          <PressableScale
            onPress={() => { closeAllSheets(); setLanternOpen(true); }}
            style={styles.navBtn}
          >
            <Text style={styles.navIcon}>🪔</Text>
            <Text style={[styles.navLabel, { color: theme.textMuted }]}>Lantern</Text>
          </PressableScale>
        </View>
      </GlassSurface>

      {/* Floating filter chips — anchored lower-right above the dock */}
      <View style={styles.unreadChipFloat} pointerEvents="box-none">
        <MoodFilterChip onOpen={() => { closeAllSheets(); setMoodSheetOpen(true); }} />
        <View style={{ height: 8 }} />
        <UnreadFilterChip />
      </View>

      <MoodFilterSheet
        open={moodSheetOpen}
        onClose={() => setMoodSheetOpen(false)}
      />

      {/* Cold-start loader — overlays everything until initial Supabase data resolves */}
      {loaderGating.mounted && (
        <SulatLoader visible={loaderGating.visible} onDismissed={loaderGating.onDismissed} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  /* ── Loading skeleton ───────────────────── */
  skeleton: {
    flex: 1,
    backgroundColor: '#0a0e22',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  skeletonHint: {
    color: 'rgba(244,201,122,0.35)',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  /* ── Header (frosted glass strip) ───────── */
  headerGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    /* Web: compact (no status bar to dodge). Native: clear iOS notch / Android status bar. */
    paddingTop: Platform.OS === 'web' ? 14 : 44,
    paddingBottom: 12,
    zIndex: 5,
  },
  headerInner: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    /* Lock the row height so logo and icons cannot drift onto separate baselines */
    height: 38,
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerHairline: {
    height: 1,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  /* ── Header icon button (round pill) ────── */
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderWidth: 1,
    overflow: 'visible',
  },
  iconBtnText: {
    fontSize: 15,
    lineHeight: 17,
    textAlign: 'center',
  },
  iconBadge: {
    width: 7,
    height: 7,
    borderRadius: 4,
    position: 'absolute',
    top: 6,
    right: 6,
  },

  /* ── Bottom dock ─────────────────────────── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NAV_HEIGHT,
  },
  bottomHairline: {
    height: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingBottom: 10,
  },

  /* ── Bottom nav buttons ──────────────────── */
  navBtn: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navIcon: { fontSize: 17 },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  /* ── Floating unread chip ───────────────── */
  unreadChipFloat: {
    position: 'absolute',
    right: 16,
    bottom: NAV_HEIGHT + 16,
    alignItems: 'flex-end',
  },

  /* ── FAB (compose) ───────────────────────── */
  fabWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabHalo: {
    position: 'absolute',
    width: 64,
    height: 64,
    opacity: 0.55,
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
  },
  fabPlus: {
    color: '#2a1f0a',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
  },
});
