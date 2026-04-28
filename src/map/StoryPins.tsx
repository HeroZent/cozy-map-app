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
                  // Unwrap to the raw maplibre instance — both wrapper and raw
                  // expose flyTo / fitBounds, but raw is most predictable.
                  const m = (map as unknown as { getMap?: () => unknown }).getMap?.() ?? map;
                  const mm = m as {
                    flyTo: (opts: unknown) => void;
                    fitBounds: (bounds: [[number, number], [number, number]], opts: unknown) => void;
                  };

                  const leaves = supercluster.getLeaves(props.cluster_id, 1000);
                  if (leaves.length === 0) {
                    mm.flyTo({ center: [lng, lat], zoom: 16, duration: 600 });
                    return;
                  }

                  const coords = leaves.map(
                    (l) => l.geometry.coordinates as [number, number],
                  );
                  const lngs = coords.map((c) => c[0]);
                  const lats = coords.map((c) => c[1]);
                  const minLng = Math.min(...lngs);
                  const maxLng = Math.max(...lngs);
                  const minLat = Math.min(...lats);
                  const maxLat = Math.max(...lats);

                  // Tight clusters (e.g. 2 stories in the same neighborhood):
                  // fitBounds would only zoom to ~13 and supercluster would
                  // still group them at radius 60 / maxZoom 14. Force a zoom
                  // that's guaranteed to be above maxZoom so individual pins
                  // emerge.
                  const tinySpread =
                    (maxLng - minLng) < 0.01 && (maxLat - minLat) < 0.01;
                  if (tinySpread) {
                    mm.flyTo({
                      center: [
                        (minLng + maxLng) / 2,
                        (minLat + maxLat) / 2,
                      ],
                      zoom: 16,
                      duration: 600,
                    });
                    return;
                  }

                  mm.fitBounds(
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
