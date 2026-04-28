import { memo, useEffect, useState } from 'react';
import { Marker, useMap } from 'react-map-gl/maplibre';
import { Pressable } from 'react-native';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters } from './useClusters';
import type { Story } from '@/data/types';

const MemoPinMarker = memo(PinMarker);

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  /** Fallback bbox until the map ref reports its actual bounds. */
  bbox: [number, number, number, number];
  onSelect: (story: Story) => void;
  /**
   * Called when a user taps a cluster — receives every story the cluster
   * contains. The parent decides what to do with that list (we render a
   * ClusterStoriesSheet so the user can pick one to read).
   */
  onClusterSelect: (stories: Story[]) => void;
}

/**
 * Renders story pins, dense regions collapsed into clusters via supercluster.
 *
 * Clicking a cluster doesn't try to zoom — many sulats sit at identical
 * coordinates (e.g. dropped at the same plaza), and no zoom level can
 * separate them. Instead, we hand the full leaf list to the parent so it
 * can show a list sheet.
 */
export function StoryPins({ stories, zoom, bbox, onSelect, onClusterSelect }: StoryPinsProps) {
  const { current: map } = useMap();
  const [viewBbox, setViewBbox] = useState<[number, number, number, number]>(bbox);

  // Track real viewport so supercluster.getClusters only returns features
  // inside the visible window, even when the parent passes a global bbox.
  useEffect(() => {
    if (!map) return;
    const sync = () => {
      const b = map.getBounds();
      setViewBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    sync();
    map.on('moveend', sync);
    map.on('zoomend', sync);
    return () => {
      map.off('moveend', sync);
      map.off('zoomend', sync);
    };
  }, [map]);

  const { clusters, supercluster } = useClusters(stories, zoom, viewBbox);

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

                  // Strategy:
                  //   1. Compute the fit-bounds camera for the cluster's
                  //      children. If the natural zoom is >= 15, the cluster
                  //      can un-cluster visually (supercluster.maxZoom = 14)
                  //      — fly there.
                  //   2. Otherwise the children sit on top of each other or
                  //      too close to separate, so open the list sheet.
                  let camera: { center: [number, number]; zoom: number } | undefined;
                  try {
                    camera = mm.cameraForBounds(
                      [
                        [minLng, minLat],
                        [maxLng, maxLat],
                      ],
                      { padding: { top: 100, bottom: 140, left: 60, right: 60 } },
                    );
                  } catch {
                    /* if maplibre can't compute (degenerate bounds), fall
                       through to the list-sheet branch */
                  }

                  if (camera && camera.zoom >= 15) {
                    // They can un-cluster — zoom in and let the user explore
                    // the individual pins on the map.
                    mm.flyTo({
                      center: camera.center,
                      zoom: Math.min(camera.zoom, 18),
                      duration: 600,
                    });
                    return;
                  }

                  // Otherwise — too tight to un-cluster. Show the list.
                  const inner = leaves
                    .map((l) => (l.properties as { story?: Story }).story)
                    .filter((s): s is Story => !!s);
                  if (inner.length > 0) onClusterSelect(inner);
                }}
              />
            </Marker>
          );
        }

        const story = (feature.properties as { story: Story }).story;
        const reactionCount = zoom >= 9 ? story.reaction_count : 0;
        return (
          <Marker key={story.id} longitude={lng} latitude={lat} anchor="center">
            <Pressable onPress={() => onSelect(story)}>
              <MemoPinMarker
                mood={story.mood}
                isMemory={story.is_memory}
                reactionCount={reactionCount}
              />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
