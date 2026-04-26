import { useState } from 'react';
import { View } from 'react-native';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { HeatmapLayer } from '@/map/HeatmapLayer';
import { HeatmapToggle } from '@/map/HeatmapToggle';
import { useStories } from '@/data/useStories';
import { useViewport } from '@/map/useViewport';

export default function Home() {
  const { viewport } = useViewport();
  const bbox: [number, number, number, number] = [-180, -85, 180, 85];
  const { stories } = useStories({ minLng: bbox[0], minLat: bbox[1], maxLng: bbox[2], maxLat: bbox[3] });
  const [heatmapOn, setHeatmapOn] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <HeatmapToggle enabled={heatmapOn} onToggle={() => setHeatmapOn((v) => !v)} />
      <MapView>
        {heatmapOn && <HeatmapLayer stories={stories} />}
        <StoryPins stories={stories} zoom={viewport.zoom} bbox={bbox} />
      </MapView>
    </View>
  );
}
