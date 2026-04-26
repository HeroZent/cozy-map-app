import { useState } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { HeatmapLayer } from '@/map/HeatmapLayer';
import { HeatmapToggle } from '@/map/HeatmapToggle';
import { useStories } from '@/data/useStories';
import { useViewport } from '@/map/useViewport';
import { useTheme } from '@/theme/ThemeContext';

export default function Home() {
  const { viewport } = useViewport();
  const bbox: [number, number, number, number] = [-180, -85, 180, 85];
  const { stories } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] });
  const [heatmapOn, setHeatmapOn] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.fill}>
      <HeatmapToggle enabled={heatmapOn} onToggle={() => setHeatmapOn((v) => !v)} />
      <MapView onDoubleClick={(loc) => router.push(`/compose?lat=${loc.lat}&lng=${loc.lng}&mode=dropped`)}>
        {heatmapOn && <HeatmapLayer stories={stories} />}
        <StoryPins stories={stories} zoom={viewport.zoom} bbox={bbox} />
      </MapView>
      <Pressable onPress={() => router.push('/compose')} style={[styles.fabBtn, { backgroundColor: theme.accent }]}>
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fabBtn: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 32,
    bottom: 24,
    elevation: 8,
    height: 64,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#f4c97a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    width: 64,
  },
  fabPlus: { color: '#2a1f0a', fontSize: 32, fontWeight: '300' },
  fill: { flex: 1 },
});
