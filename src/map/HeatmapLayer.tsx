// src/map/HeatmapLayer.tsx — NATIVE (iOS/Android) implementation.
// On the web target Metro picks `HeatmapLayer.web.tsx`.
import { useMemo } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export interface HeatmapLayerProps {
  stories: Story[];
}

const SOURCE_ID = 'story-density';
const LAYER_ID = 'story-heatmap';

/**
 * Native heatmap rendering. Same MapLibre paint expressions as the web
 * version — supercluster's underlying style spec is identical across
 * platforms, only the React component wrappers differ.
 */
export function HeatmapLayer({ stories }: HeatmapLayerProps) {
  const theme = useTheme();

  const data = useMemo(
    () =>
      ({
        type: 'FeatureCollection',
        features: stories.map((s) => ({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: s.location.coordinates },
        })),
      }) as GeoJSON.FeatureCollection,
    [stories],
  );

  const heatmapColor = useMemo(() => {
    const expr: unknown[] = ['interpolate', ['linear'], ['heatmap-density']];
    for (const stop of theme.heatmap) {
      expr.push(stop.offset, stop.color);
    }
    return expr;
  }, [theme.heatmap]);

  return (
    <GeoJSONSource id={SOURCE_ID} data={data}>
      <Layer
        id={LAYER_ID}
        type="heatmap"
        source={SOURCE_ID}
        paint={{
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'heatmap-color': heatmapColor as any,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 50],
          'heatmap-opacity': 0.7,
        }}
      />
    </GeoJSONSource>
  );
}
