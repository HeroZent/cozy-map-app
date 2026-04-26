import { useEffect, useState } from 'react';
import { kvGet, kvSet } from '@/lib/persistence';

const KEY = 'sulat.viewport';
const DEFAULT_VIEWPORT = { longitude: 122.5, latitude: 12.5, zoom: 5 };

export interface Viewport {
  longitude: number;
  latitude: number;
  zoom: number;
}

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await kvGet(KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Viewport;
          if (typeof parsed.longitude === 'number') setViewport(parsed);
        } catch {
          /* ignore corrupt value */
        }
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    kvSet(KEY, JSON.stringify(viewport)).catch(() => {});
  }, [viewport, loaded]);

  return { viewport, setViewport, loaded };
}
