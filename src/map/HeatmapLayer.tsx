import { useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export interface HeatmapLayerProps {
  stories: Story[];
}

/**
 * Density heatmap over the map. Memoizes the feature collection and
 * paint expression so we don't pass new array references to MapLibre on
 * every render — that was forcing the heatmap to rebuild its internal
 * GPU buffers even when nothing changed.
 */
export function HeatmapLayer({ stories }: HeatmapLayerProps) {
  const theme = useTheme();

  const data = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: stories.map((s) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Point' as const, coordinates: s.location.coordinates },
      })),
    }),
    [stories],
  );

  const heatmapGradient = useMemo(() => {
    const expr: unknown[] = ['interpolate', ['linear'], ['heatmap-density']];
    for (const stop of theme.heatmap) {
      expr.push(stop.offset, stop.color);
    }
    return expr;
  }, [theme.heatmap]);

  return (
    <Source id="story-density" type="geojson" data={data}>
      <Layer
        id="story-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight':    1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'heatmap-color':     heatmapGradient as any,
          'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 50],
          'heatmap-opacity':   0.7,
        }}
      />
    </Source>
  );
}
