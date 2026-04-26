import { type ReactNode } from 'react';
import Map, { type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';

export interface MapViewProps {
  children?: ReactNode;
}

export function MapView({ children }: MapViewProps) {
  const theme = useTheme();
  const { viewport, setViewport, loaded } = useViewport();

  if (!loaded) return null;

  return (
    <Map
      initialViewState={viewport}
      mapStyle={theme.mapStyle}
      style={{ width: '100%', height: '100%' }}
      onMoveEnd={(e: ViewStateChangeEvent) =>
        setViewport({
          longitude: e.viewState.longitude,
          latitude: e.viewState.latitude,
          zoom: e.viewState.zoom,
        })
      }
    >
      {children}
    </Map>
  );
}
