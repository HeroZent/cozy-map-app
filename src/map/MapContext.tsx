// src/map/MapContext.tsx
import { createContext, useContext, type ReactNode, type RefObject } from 'react';
import type { CameraRef } from '@maplibre/maplibre-react-native';

/**
 * Context that exposes the native MapLibre Camera ref to descendant components.
 *
 * On the web target, downstream components use `useMap()` from
 * `react-map-gl/maplibre` instead — that's why this is only consumed inside
 * `*.tsx` (native) variants of map children, never inside `*.web.tsx`.
 */
export interface MapContextValue {
  cameraRef: RefObject<CameraRef | null>;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  cameraRef,
  children,
}: {
  cameraRef: RefObject<CameraRef | null>;
  children: ReactNode;
}) {
  return <MapContext.Provider value={{ cameraRef }}>{children}</MapContext.Provider>;
}

export function useMapCamera(): RefObject<CameraRef | null> | null {
  const ctx = useContext(MapContext);
  return ctx?.cameraRef ?? null;
}
