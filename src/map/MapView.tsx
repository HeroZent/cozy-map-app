import { useEffect, useRef, type ReactNode } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapMouseEvent, MapLayerTouchEvent } from 'react-map-gl/maplibre';
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
  // Single source of truth: this hook owns the viewport state. MapView writes
  // to it on moveEnd; downstream components read the same state via useViewport
  // (now backed by a module-level subscriber so all consumers see the same data).
  const { viewport, setViewport, loaded } = useViewport();
  const mapRef = useRef<MapRef>(null);
  const lastTapRef = useRef<number>(0);
  /** True if any point during the current touch gesture had 2+ fingers
   *  (i.e. a pinch). Prevents the touch-end double-tap detector from firing
   *  spuriously when the user lifts their fingers off a pinch-zoom. */
  const wasMultiTouchRef = useRef<boolean>(false);

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
      onTouchStart={(e: MapLayerTouchEvent) => {
        // Mark gesture as multi-touch the moment 2+ fingers land. We can't
        // un-mark mid-gesture — once a pinch happens, the entire gesture
        // is a pinch even if the user lifts a finger and re-lands one.
        if (e.points.length > 1) {
          wasMultiTouchRef.current = true;
          lastTapRef.current = 0;
        }
      }}
      onTouchEnd={(e: MapLayerTouchEvent) => {
        if (!onDoubleClick) return;

        // Reset the multi-touch flag once all fingers have left the screen.
        const remaining =
          (e.originalEvent as TouchEvent | undefined)?.touches?.length ?? 0;

        if (wasMultiTouchRef.current) {
          if (remaining === 0) wasMultiTouchRef.current = false;
          // Don't fire double-tap detection during/after a pinch.
          return;
        }

        // Only handle single-finger taps
        if (e.points.length !== 1) return;
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          e.preventDefault();
          onDoubleClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }}
    >
      {children}
    </Map>
  );
}
