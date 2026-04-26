import { type ReactNode } from 'react';
import Map, { type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';
import type { LatLng } from '@/lib/geo';

export interface MapViewProps {
  children?: ReactNode;
  onDoubleClick?: (loc: LatLng) => void;
}

export function MapView({ children, onDoubleClick }: MapViewProps) {
  const theme = useTheme();
  const { viewport, setViewport, loaded } = useViewport();

  if (!loaded) return null;

  return (
    <Map
      initialViewState={viewport}
      mapStyle={theme.mapStyle}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ width: '100%', height: '100%' }}
      doubleClickZoom={!onDoubleClick}
      onMoveEnd={(e: ViewStateChangeEvent) =>
        setViewport({
          longitude: e.viewState.longitude,
          latitude: e.viewState.latitude,
          zoom: e.viewState.zoom,
        })
      }
      onDblClick={(e: MapMouseEvent) => {
        if (onDoubleClick) {
          e.preventDefault();
          onDoubleClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      }}
    >
      {children}
    </Map>
  );
}
