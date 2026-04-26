import { useCallback, useRef, useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { MapView } from '@/map/MapView';
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
import type { FlyTarget } from '@/map/MapView';
import type { Story } from '@/data/types';

const NAV_HEIGHT = 76;

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
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeCoords, setComposeCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [lanternOpen, setLanternOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const theme = useTheme();

  const openCompose = (coords?: { lat: number; lng: number }) => {
    setSelectedStory(null);
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
      {/* Map fills entire screen */}
      <MapView
        onDoubleClick={(loc) => openCompose({ lat: loc.lat, lng: loc.lng })}
        flyTarget={flyTarget}
      >
        {heatmapOn && <HeatmapLayer stories={stories} />}
        <StoryPins
          stories={stories}
          zoom={viewport.zoom}
          bbox={bbox}
          onSelect={(story) => setSelectedStory(story)}
        />
      </MapView>

      <MapWarmTint />
      <MapVignette />

      {/* Floating header */}
      <View style={styles.header} pointerEvents="box-none">
        <SulatLogo size={26} />
        <View style={styles.headerRight} pointerEvents="box-none">
          <Pressable
            onPress={() => setProfileOpen(true)}
            style={[styles.profileBtn, { backgroundColor: theme.surface }]}
          >
            <Text style={styles.profileIcon}>◉</Text>
          </Pressable>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            style={[styles.settingsBtn, { backgroundColor: theme.surface }]}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
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
          onSelectStory={(story) => { setLanternOpen(false); setSelectedStory(story); }}
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

        <Pressable onPress={() => setLanternOpen(true)} style={styles.navBtn}>
          <Text style={styles.navIcon}>🪔</Text>
          <Text style={[styles.navLabel, { color: theme.textMuted }]}>Lantern</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    alignItems: 'center',
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
    shadowOpacity: 0.5,
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
    height: 36,
    justifyContent: 'center',
    opacity: 0.85,
    width: 36,
  },
  profileIcon: { fontSize: 15 },
  settingsBtn: {
    alignItems: 'center',
    borderRadius: 20,
    height: 36,
    justifyContent: 'center',
    opacity: 0.85,
    width: 36,
  },
  settingsIcon: { fontSize: 15 },
});
