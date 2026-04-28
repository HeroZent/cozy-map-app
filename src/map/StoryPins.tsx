// src/map/StoryPins.tsx — NATIVE (iOS/Android) implementation.
// On the web target Metro picks `StoryPins.web.tsx`.
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';
import { PinMarker } from './PinMarker';
import { ClusterMarker } from './ClusterMarker';
import { useClusters, type StoryFeature } from './useClusters';
import { useMapCamera } from './MapContext';
import type { Story } from '@/data/types';

const MemoPinMarker = memo(PinMarker);

/** Engagement signal — replies + reactions. */
function engagementOf(s: Story): number {
  return (s.reply_count ?? 0) + (s.reaction_count ?? 0);
}

const PROMOTE_PER_CLUSTER = 1;

export interface StoryPinsProps {
  stories: Story[];
  zoom: number;
  bbox: [number, number, number, number];
  onSelect: (story: Story) => void;
  onClusterSelect: (stories: Story[]) => void;
}

/**
 * Native MapLibre pin renderer. Mirrors the web implementation but uses:
 *   • `Marker` from `@maplibre/maplibre-react-native` (with `lngLat` tuple
 *     prop instead of separate `longitude`/`latitude`)
 *   • Camera ref from `MapContext` (no `useMap` hook on native)
 *
 * All clustering logic, top-1 carve-out, and zoom-vs-list-sheet decision
 * is identical to the web version — same UX, just different render primitives.
 */
export function StoryPins({ stories, zoom, bbox, onSelect, onClusterSelect }: StoryPinsProps) {
  const cameraRef = useMapCamera();
  // Native bbox tracking is harder (no straight equivalent of getBounds() on
  // the camera ref). Fall back to using the prop bbox for now — supercluster
  // will still cluster correctly, just without viewport optimisation. Future
  // work: read bbox via map.queryRenderedFeatures or a region change event.
  const [viewBbox] = useState<[number, number, number, number]>(bbox);

  // Diagnostic: which stories share identical coordinates.
  useEffect(() => {
    const groups = new Map<string, number>();
    stories.forEach((s) => {
      const k = (s.location.coordinates as [number, number]).join(',');
      groups.set(k, (groups.get(k) ?? 0) + 1);
    });
    // No-op in production; useful when wiring up native testing.
    void groups;
  }, [stories]);

  const { clusters, supercluster } = useClusters(stories, zoom, viewBbox);

  // Top-engagement carve-out — same as web.
  const adjustedClusters = useMemo(() => {
    type SyntheticCluster = {
      type: 'Feature';
      properties: {
        cluster: true;
        cluster_id: number;
        point_count: number;
        _restLeaves: StoryFeature[];
      };
      geometry: { type: 'Point'; coordinates: [number, number] };
    };
    type Output = StoryFeature | SyntheticCluster | typeof clusters[number];
    const out: Output[] = [];

    for (const feature of clusters) {
      const isCluster = (feature.properties as { cluster?: boolean }).cluster;
      if (!isCluster) {
        out.push(feature);
        continue;
      }
      const props = feature.properties as { cluster_id: number; point_count: number };
      const leaves = supercluster.getLeaves(props.cluster_id, 1000) as StoryFeature[];
      const sorted = [...leaves].sort(
        (a, b) => engagementOf(b.properties.story) - engagementOf(a.properties.story),
      );
      const promoted = sorted.slice(0, PROMOTE_PER_CLUSTER);
      const rest = sorted.slice(PROMOTE_PER_CLUSTER);
      for (const leaf of promoted) out.push(leaf);
      if (rest.length === 1) {
        out.push(rest[0]!);
      } else if (rest.length >= 2) {
        out.push({
          type: 'Feature',
          properties: {
            cluster: true,
            cluster_id: props.cluster_id,
            point_count: rest.length,
            _restLeaves: rest,
          },
          geometry: {
            type: 'Point',
            coordinates: feature.geometry.coordinates as [number, number],
          },
        });
      }
    }
    return out;
  }, [clusters, supercluster]);

  return (
    <>
      {adjustedClusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const isCluster = (feature.properties as { cluster?: boolean }).cluster;

        if (isCluster) {
          const props = feature.properties as {
            cluster_id: number;
            point_count: number;
            _restLeaves?: StoryFeature[];
          };
          return (
            <Marker
              key={`cluster-${props.cluster_id}-z${Math.floor(zoom)}-n${props.point_count}`}
              lngLat={[lng, lat]}
              anchor="center"
            >
              <Pressable
                onPress={() => {
                  const camera = cameraRef?.current;
                  const restProp = props._restLeaves;
                  const leaves =
                    restProp ?? (supercluster.getLeaves(props.cluster_id, 1000) as StoryFeature[]);
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

                  // Approximate fit zoom from bbox spread (rough heuristic
                  // — native MapLibre's cameraForBounds isn't directly
                  // exposed on the ref).
                  const lngSpread = Math.max(0.0001, maxLng - minLng);
                  const latSpread = Math.max(0.0001, maxLat - minLat);
                  const span = Math.max(lngSpread, latSpread);
                  // Empirical: span~0.001° ≈ z17, ~0.05° ≈ z12, ~1° ≈ z7
                  const naturalZoom = Math.max(5, Math.min(18, Math.log2(360 / span) - 1));

                  if (naturalZoom >= 15 && camera) {
                    camera.flyTo({
                      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
                      zoom: Math.min(naturalZoom, 18),
                      duration: 600,
                    });
                    return;
                  }

                  const inner = leaves
                    .map((l) => (l.properties as { story?: Story }).story)
                    .filter((s): s is Story => !!s);
                  if (inner.length > 0) onClusterSelect(inner);
                }}
              >
                <ClusterMarker count={props.point_count} onPress={() => { /* nested handles tap */ }} />
              </Pressable>
            </Marker>
          );
        }

        const story = (feature.properties as { story: Story }).story;
        const reactionCount = zoom >= 9 ? story.reaction_count : 0;
        const replyCount = zoom >= 9 ? story.reply_count : 0;
        return (
          <Marker key={story.id} lngLat={[lng, lat]} anchor="center">
            <Pressable onPress={() => onSelect(story)}>
              <MemoPinMarker
                mood={story.mood}
                isMemory={story.is_memory}
                reactionCount={reactionCount}
                replyCount={replyCount}
              />
            </Pressable>
          </Marker>
        );
      })}
    </>
  );
}
