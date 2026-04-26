import { Source, Layer } from 'react-map-gl/maplibre';
import { useTheme } from '@/theme/ThemeContext';
import type { Story } from '@/data/types';

export interface HeatmapLayerProps {
  stories: Story[];
}

export function HeatmapLayer({ stories }: HeatmapLayerProps) {
  const theme = useTheme();

  const features = stories.map((s) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Point' as const, coordinates: s.location.coordinates },
  }));

  const heatmapGradient: unknown[] = ['interpolate', ['linear'], ['heatmap-density']];
  for (const stop of theme.heatmap) {
    heatmapGradient.push(stop.offset, stop.color);
  }

  return (
    <Source id="story-density" type="geojson" data={{ type: 'FeatureCollection', features }}>
      <Layer
        id="story-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': 1,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
          'heatmap-color': heatmapGradient as any,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 50],
          'heatmap-opacity': 0.7,
        }}
      />
    </Source>
  );
}
