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
                  // Unwrap to the raw maplibre instance for predictable methods.
                  const m =
                    (map as unknown as { getMap?: () => unknown }).getMap?.() ?? map;
                  const mm = m as {
                    flyTo: (opts: unknown) => void;
                    cameraForBounds: (
                      bounds: [[number, number], [number, number]],
                      opts: unknown,
                    ) => { center: [number, number]; zoom: number } | undefined;
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

                  // Compute the natural fit-bounds camera, then ENFORCE a
                  // minimum zoom of 15. Why 15: supercluster's maxZoom is 14,
                  // so at zoom <= 14 it still clusters; at zoom 15+ it returns
                  // individual points. Without this floor, fitBounds for two
                  // sulats ~5km apart lands at zoom 13-14 and they re-cluster
                  // immediately — exactly the bug we hit.
                  const camera = mm.cameraForBounds(
                    [
                      [minLng, minLat],
                      [maxLng, maxLat],
                    ],
                    { padding: { top: 100, bottom: 140, left: 60, right: 60 } },
                  );
                  const naturalZoom = camera?.zoom ?? 15;
                  const targetZoom = Math.min(Math.max(naturalZoom, 15), 18);
                  const center =
                    camera?.center ?? [
                      (minLng + maxLng) / 2,
                      (minLat + maxLat) / 2,
                    ];

                  mm.flyTo({
                    center,
                    zoom: targetZoom,
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
