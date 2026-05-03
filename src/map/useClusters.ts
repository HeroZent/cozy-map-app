import { useMemo } from 'react';
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { Story } from '@/data/types';

interface StoryProps {
  cluster: false;
  story: Story;
}

export type StoryFeature = PointFeature<StoryProps>;
export type AnyFeature = StoryFeature | ClusterFeature<Record<string, never>>;

/** Highest zoom at which supercluster will still group nearby points. Beyond
 *  this, every point renders individually. We keep it close to maplibre's
 *  default max so sulats dropped at the same coordinate (same plaza, same
 *  building) stay clustered even after the user pinch-zooms all the way in.
 *  Exported so the click handler can decide whether flying-to-fit would just
 *  re-cluster the leaves. */
export const CLUSTER_MAX_ZOOM = 20;

export function useClusters(stories: Story[], zoom: number, bbox: [number, number, number, number]) {
  const sc = useMemo(() => {
    const s = new Supercluster<StoryProps, Record<string, never>>({ radius: 60, maxZoom: CLUSTER_MAX_ZOOM });
    const points: StoryFeature[] = stories.map((story) => ({
      type: 'Feature',
      properties: { cluster: false, story },
      geometry: { type: 'Point', coordinates: story.location.coordinates },
    }));
    s.load(points);
    return s;
  }, [stories]);

  const clusters = useMemo(() => sc.getClusters(bbox, Math.floor(zoom)), [sc, bbox, zoom]);
  return { clusters, supercluster: sc };
}
