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
                  if (!map) return;
                  // Walk every story in this cluster (recursive) so we can fit
                  // the map exactly to the bounding box of its children. This
                  // is more reliable than computing expansionZoom because:
                  //   • It always reveals every pin in the cluster.
                  //   • It doesn't rely on the floor()/expansion-zoom dance.
                  //   • Multiple sub-clusters become visible at once.
                  const leaves = supercluster.getLeaves(props.cluster_id, Infinity);
                  if (leaves.length === 0) return;

                  const coords = leaves.map(
                    (l) => l.geometry.coordinates as [number, number],
                  );
                  const lngs = coords.map((c) => c[0]);
                  const lats = coords.map((c) => c[1]);
                  const minLng = Math.min(...lngs);
                  const maxLng = Math.max(...lngs);
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);

                  // Edge case: every story shares ~the same coordinates.
                  // fitBounds would zoom to infinity, so fall back to a
                  // generous fixed zoom that breaks the cluster apart.
                  const tinySpread = (maxLng - minLng) < 0.0008 && (maxLat - minLat) < 0.0008;
                  if (tinySpread) {
                    map.flyTo({
                      center: [lng, lat],
                      zoom: 16,
                      duration: 500,
                    });
                    return;
                  }

                  map.fitBounds(
                    [
                      [minLng, minLat],
                      [maxLng, maxLat],
                    ],
                    {
                      padding: { top: 100, bottom: 140, left: 60, right: 60 },
                      duration: 600,
                      maxZoom: 17,
                    },
                  );
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
