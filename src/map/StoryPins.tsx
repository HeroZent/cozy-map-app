import { Marker, useMap } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters } from './useClusters';
import type { Story } from '@/data/types';

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
}

export function StoryPins({ stories, zoom, bbox }: StoryPinsProps) {
  const router = useRouter();
  const { current: map } = useMap();
  const { clusters, supercluster } = useClusters(stories, zoom, bbox);

  return (
    <>
      {clusters.map((c) => {
        const [lng, lat] = c.geometry.coordinates as [number, number];
        if ((c.properties as any).cluster) {
          const count = (c.properties as any).point_count as number;
          const id = c.id as number;
          return (
            <Marker key={`c-${id}`} longitude={lng} latitude={lat} anchor="center">
              <ClusterMarker
                count={count}
                onPress={() => {
                  const expansion = supercluster.getClusterExpansionZoom(id);
                  map?.flyTo({ center: [lng, lat], zoom: expansion });
                }}
              />
            </Marker>
          );
        }
        const story = (c.properties as any).story as Story;
        return (
          <Marker key={story.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => router.push(`/story/${story.id}`)}>
              <PinMarker mood={story.mood} isMemory={story.is_memory} />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
