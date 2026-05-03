// src/map/MapView.tsx — NATIVE (iOS/Android) implementation.
// On the web target Metro picks `MapView.web.tsx` instead.
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type NativeSyntheticEvent } from 'react-native';
import {
  Map,
  Camera,
  type MapRef,
  type CameraRef,
  type PressEvent,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useViewport } from './useViewport';
import { useRegisterScreenLookup } from './screenToMapCoords';
import { MapProvider } from './MapContext';
import type { LatLng } from '@/lib/geo';

export interface FlyTarget extends LatLng {
  zoom?: number;
}

export interface MapViewProps {
  children?: ReactNode;
  onDoubleClick?: (loc: LatLng) => void;
  flyTarget?: FlyTarget | null;
}

/**
 * Native MapLibre wrapper. Uses the same prop shape as the web wrapper so
 * downstream components don't need platform branches at the call site —
 * Metro picks the right file based on extension (.web.tsx vs .tsx).
 *
 * API differences from the web build (handled inside platform-split files):
 *   • `<Map>` from this lib replaces `<Map>` from react-map-gl
 *   • `<Marker coordinate={[lng,lat]}>` replaces `<Marker longitude latitude>`
 *   • `<GeoJSONSource>` + `<Layer>` replace `<Source>` + `<Layer>`
 *   • No `useMap()` hook — children read camera ref via context
 */
export function MapView({ children, onDoubleClick, flyTarget }: MapViewProps) {
  const theme = useTheme();
  const { viewport, setViewport, loaded } = useViewport();
  const mapRef = useRef<MapRef>(null);
  const cameraRef = useRef<CameraRef>(null);
  const lastTapRef = useRef<number>(0);
  const lastTapCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!flyTarget || !cameraRef.current) return;
    cameraRef.current.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: flyTarget.zoom ?? 13,
      duration: 1800,
    });
  }, [flyTarget]);

  const lookup = useCallback(async (point: { x: number; y: number }) => {
    const m = mapRef.current;
    if (!m) return null;
    // Native MapLibre RN unproject is async and returns LngLat as [lng, lat].
    const ll = await m.unproject([point.x, point.y]);
    return { lat: ll[1], lng: ll[0] };
  }, []);
  useRegisterScreenLookup(lookup);

  if (!loaded) return null;

  return (
    <View style={styles.fill}>
      <Map
        ref={mapRef}
        style={styles.fill}
        mapStyle={theme.mapStyle}
        attribution={false}
        logo={false}
        compass={false}
        onPress={(e: NativeSyntheticEvent<PressEvent>) => {
          if (!onDoubleClick) return;
          const [lng, lat] = e.nativeEvent.lngLat;
          const tapCoord = { lat, lng };
          const now = Date.now();
          if (now - lastTapRef.current < 300 && lastTapCoordRef.current) {
            const first = lastTapCoordRef.current;
            onDoubleClick({
              lat: (first.lat + tapCoord.lat) / 2,
              lng: (first.lng + tapCoord.lng) / 2,
            });
            lastTapRef.current = 0;
            lastTapCoordRef.current = null;
          } else {
            lastTapRef.current = now;
            lastTapCoordRef.current = tapCoord;
          }
        }}
        onRegionDidChange={(e: NativeSyntheticEvent<ViewStateChangeEvent>) => {
          const { center, zoom } = e.nativeEvent;
          setViewport({
            longitude: center[0],
            latitude: center[1],
            zoom,
          });
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [viewport.longitude, viewport.latitude],
            zoom: viewport.zoom,
          }}
          minZoom={5}
        />
        {/* Expose camera ref so descendants (StoryPins, DraftPin, etc.)
            can call flyTo without the web-only useMap() hook. */}
        <MapProvider cameraRef={cameraRef}>
          {children}
        </MapProvider>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
