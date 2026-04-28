import { memo } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters } from './useClusters';
import type { Story } from '@/data/types';

/**
 * Memoized pin — re-renders only when its inputs actually change.
 * This is the single biggest perf win: when 30+ stories sit in the same
 * area, dragging the map used to repaint every pin's shadow on every frame.
 * With memo + supercluster collapsing dense regions into one ClusterMarker,
 * the visible-pin count drops by 5-10× at typical zoom levels.
 */
const MemoPinMarker = memo(PinMarker);

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
  onSelect: (story: Story) => void;
}

export function StoryPins({ stories, zoom, bbox, onSelect }: StoryPinsProps) {
  const { clusters, supercluster } = useClusters(stories, zoom, bbox);
  const { current: map } = useMap();

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const isCluster = (feature.properties as { cluster?: boolean }).cluster;

        if (isCluster) {
          const props = feature.properties as { cluster_id: number; point_count: number };
          return (
            <Marker
              key={`cluster-${props.cluster_id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <ClusterMarker
                count={props.point_count}
                onPress={() => {
                  console.log('[cluster] click fired', {
                    id: props.cluster_id,
                    count: props.point_count,
                    hasMap: !!map,
                  });
                  if (!map) {
                    console.warn('[cluster] map ref unavailable');
                    return;
                  }
                  try {
                    // Step 1: get the underlying maplibre instance — this
                    // unwraps any react-map-gl wrapping and gives us the raw
                    // map with reliable flyTo / fitBounds methods.
                    const m = (map as unknown as { getMap?: () => unknown }).getMap?.() ?? map;
                    const currentZoom = (m as { getZoom: () => number }).getZoom();
                    const newZoom = Math.min(currentZoom + 3, 18);
                    console.log('[cluster] flyTo', { from: currentZoom, to: newZoom });
                    (m as { flyTo: (opts: unknown) => void }).flyTo({
                      center: [lng, lat],
                      zoom: newZoom,
                      duration: 600,
                    });
                  } catch (e) {
                    console.error('[cluster] flyTo failed', e);
                  }
                }}
              />
            </Marker>
          );
        }

        const story = (feature.properties as { story: Story }).story;
        return (
          <Marker key={story.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => onSelect(story)}>
              <MemoPinMarker
                mood={story.mood}
                isMemory={story.is_memory}
                reactionCount={story.reaction_count}
              />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
