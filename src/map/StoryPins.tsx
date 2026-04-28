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
                  // Pull every story in this cluster (recursive). Each leaf
                  // feature carries the full Story object in its properties,
                  // so we can hand it straight to the list sheet.
                  const leaves = supercluster.getLeaves(props.cluster_id, 1000);
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
