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
                  // Smoothly zoom into the cluster — supercluster knows
                  // exactly what zoom level breaks it apart.
                  if (!map) return;
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(props.cluster_id),
                    16,
                  );
                  map.flyTo({
                    center: [lng, lat],
                    zoom: expansionZoom,
                    duration: 600,
                  });
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
