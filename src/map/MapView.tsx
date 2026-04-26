import { useEffect, useRef, type ReactNode } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';
import type { LatLng } from '@/lib/geo';

export interface FlyTarget extends LatLng {
  zoom?: number;
}

export interface MapViewProps {
  children?: ReactNode;
  onDoubleClick?: (loc: LatLng) => void;
  flyTarget?: FlyTarget | null;
}

export function MapView({ children, onDoubleClick, flyTarget }: MapViewProps) {
  const theme = useTheme();
  const { viewport, setViewport, loaded } = useViewport();
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (!flyTarget || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: flyTarget.zoom ?? 13,
      duration: 1800,
    });
  }, [flyTarget]);

  if (!loaded) return null;

  return (
    <Map
      ref={mapRef}
      initialViewState={viewport}
      mapStyle={theme.mapStyle}
      minZoom={5}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
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
