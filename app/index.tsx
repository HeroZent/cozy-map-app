import { useState } from 'react';
import { View } from 'react-native';
import { MapView } from '@/map/MapView';
import { StoryPins } from '@/map/StoryPins';
import { useStories } from '@/data/useStories';
import type { Bbox } from '@/data/useStories';

export default function Home() {
  const [bbox] = useState<Bbox>({ minLng: -180, minLat: -85, maxLng: 180, maxLat: 85 });
  const { stories } = useStories(bbox);

  return (
    <View style={{ flex: 1 }}>
      <MapView>
        <StoryPins stories={stories} />
      </MapView>
    </View>
  );
}
