import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { StoryPins } from '@/map/StoryPins';
import { HeatmapLayer } from '@/map/HeatmapLayer';
import { StorySheet } from '@/story/StorySheet';
import { ComposeSheet } from '@/compose/ComposeSheet';
import { LanternSheet } from '@/lantern/LanternSheet';
import { SettingsSheet } from '@/settings/SettingsSheet';
import { ProfileModal } from '@/profile/ProfileModal';
import { useStories } from '@/data/useStories';
import { useViewport } from '@/map/useViewport';
import { useTheme } from '@/theme/ThemeContext';
import { SulatLogo } from '@/brand/SulatLogo';
import { MapVignette, MapWarmTint } from '@/map/MapVignette';
import type { FlyTarget } from '@/map/MapView';  // import type is erased at build time — safe, no CSS side-effect
import type { Story } from '@/data/types';

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
  const [refreshKey, setRefreshKey] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    setRefreshKey((k) => k + 1);
  }, []));
  const { stories } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] }, refreshKey);
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  // Keep the open story card in sync with fresh data from every refetch.
  // Without this, reactions and reply counts show stale values until the
  // user closes and reopens the sheet.
  useEffect(() => {
    if (!selectedStory) return;
    const updated = stories.find((s) => s.id === selectedStory.id);
    if (updated) setSelectedStory(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]); // intentionally omit selectedStory — only run when stories changes
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCoords, setComposeCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [lanternOpen, setLanternOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const theme = useTheme();

  const closeAllSheets = () => {
    setSelectedStory(null);
    setComposeOpen(false);
    setLanternOpen(false);
    setSettingsOpen(false);
    setProfileOpen(false);
  };

  const openCompose = (coords?: { lat: number; lng: number }) => {
    closeAllSheets();
    setComposeCoords(coords);
    setComposeOpen(true);
  };

  const handleNearMe = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      setFlyTarget({ lat: coords.latitude, lng: coords.longitude, zoom: 14 });
    } catch {}
  };

  return (
    <View style={styles.fill}>
      {/* Map fills entire screen — loaded lazily so the app shell renders first */}
      <Suspense fallback={<MapSkeleton />}>
        <LazyMapView
          onDoubleClick={(loc) => openCompose({ lat: loc.lat, lng: loc.lng })}
          flyTarget={flyTarget}
        >
          {heatmapOn && <HeatmapLayer stories={stories} />}
          <StoryPins
            stories={stories}
            zoom={viewport.zoom}
            bbox={bbox}
            onSelect={(story) => { closeAllSheets(); setSelectedStory(story); }}
          />
        </LazyMapView>
      </Suspense>

      <MapWarmTint />
      <MapVignette />

      {/* Floating header */}
      <View style={styles.header} pointerEvents="box-none">
        <SulatLogo size={26} />
        <View style={styles.headerRight} pointerEvents="box-none">
          <Pressable
            onPress={() => { closeAllSheets(); setProfileOpen(true); }}
            style={[styles.profileBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.profileIcon, { color: theme.accent }]}>◉</Text>
          </Pressable>
          <Pressable
            onPress={() => { closeAllSheets(); setSettingsOpen(true); }}
            style={[styles.settingsBtn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
          >
            <Text style={[styles.settingsIcon, { color: theme.accent }]}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* Story card — floats above nav bar */}
      {selectedStory && (
        <StorySheet
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onReacted={() => setRefreshKey((k) => k + 1)}
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
      {composeOpen && (
        <ComposeSheet
          coords={composeCoords}
          onClose={() => setComposeOpen(false)}
          onPosted={() => { setComposeOpen(false); setRefreshKey((k) => k + 1); }}
          bottomOffset={NAV_HEIGHT + 10}
        />
      )}

      {/* Profile modal — floats above nav bar */}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
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

      {/* Bottom nav bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.surface }]}>
        <Pressable onPress={handleNearMe} style={styles.navBtn}>
          <Text style={styles.navIcon}>📍</Text>
          <Text style={[styles.navLabel, { color: theme.textMuted }]}>Near me</Text>
        </Pressable>

        <Pressable
          onPress={() => openCompose()}
          style={[styles.fab, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.fabPlus}>+</Text>
        </Pressable>

        <Pressable onPress={() => { closeAllSheets(); setLanternOpen(true); }} style={styles.navBtn}>
          <Text style={styles.navIcon}>🪔</Text>
          <Text style={[styles.navLabel, { color: theme.textMuted }]}>Lantern</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  bottomBar: {
    alignItems: 'center',
    borderTopColor: 'rgba(244,201,122,0.08)',
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    height: NAV_HEIGHT,
    justifyContent: 'space-around',
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
  },
  fab: {
    alignItems: 'center',
    borderRadius: 32,
    elevation: 8,
    height: 60,
    justifyContent: 'center',
    shadowColor: '#f4c97a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    width: 60,
  },
  fabPlus: { color: '#2a1f0a', fontSize: 30, fontWeight: '300' },
  fill: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 48,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  navBtn: { alignItems: 'center', gap: 2 },
  navIcon: { fontSize: 16 },
  navLabel: { fontSize: 11, fontWeight: '500' },
  profileBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileIcon: { fontSize: 16 },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  settingsIcon: { fontSize: 16 },
});
