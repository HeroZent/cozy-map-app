import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import Map, { type MapRef, type ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type { MapMouseEvent, MapLayerTouchEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';
import { useRegisterScreenLookup } from './screenToMapCoords';
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
  /** Coords of the first tap in a potential double-tap pair. Used to
   *  average with the second tap so fingertip imprecision (typically
   *  10–15px between the two contacts) doesn't shift the compose pin. */
  const firstTapLocRef = useRef<{ lat: number; lng: number } | null>(null);
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

  const lookup = useCallback(async (point: { x: number; y: number }) => {
    const m = mapRef.current?.getMap();
    if (!m) return null;
    const ll = m.unproject([point.x, point.y]);
    return { lat: ll.lat, lng: ll.lng };
  }, []);
  useRegisterScreenLookup(lookup);

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
          firstTapLocRef.current = null;
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
        const here = { lat: e.lngLat.lat, lng: e.lngLat.lng };

        if (now - lastTapRef.current < 300 && firstTapLocRef.current) {
          // Double-tap detected. Use the AVERAGE of the two contact points
          // so any fingertip drift between the two taps cancels out.
          const first = firstTapLocRef.current;
          e.preventDefault();
          onDoubleClick({
            lat: (first.lat + here.lat) / 2,
            lng: (first.lng + here.lng) / 2,
          });
          lastTapRef.current = 0;
          firstTapLocRef.current = null;
        } else {
          lastTapRef.current = now;
          firstTapLocRef.current = here;
        }
      }}
    >
      {children}
    </Map>
  );
}
