import { useMemo } from 'react';
import Supercluster, { type ClusterFeature, type PointFeature } from 'supercluster';
import type { Story } from '@/data/types';

interface StoryProps {
  cluster: false;
  story: Story;
}

export type StoryFeature = PointFeature<StoryProps>;
export type AnyFeature = StoryFeature | ClusterFeature<Record<string, never>>;

export function useClusters(stories: Story[], zoom: number, bbox: [number, number, number, number]) {
  const sc = useMemo(() => {
    const s = new Supercluster<StoryProps, Record<string, never>>({ radius: 60, maxZoom: 14 });
    const points: StoryFeature[] = stories.map((story) => ({
      type: 'Feature',
      properties: { cluster: false, story },
      geometry: { type: 'Point', coordinates: story.location.coordinates },
    }));
    s.load(points);
    return s;
  }, [stories]);

  const clusters = useMemo(() => {
    const out = sc.getClusters(bbox, Math.floor(zoom));
    if (typeof window !== 'undefined') {
      const clusterCount = out.filter(
        (f) => (f.properties as { cluster?: boolean }).cluster,
      ).length;
      console.log('[clusters]', {
        zoom: zoom.toFixed(2),
        total: out.length,
        clusters: clusterCount,
        points: out.length - clusterCount,
      });
    }
    return out;
  }, [sc, bbox, zoom]);
  return { clusters, supercluster: sc };
}
