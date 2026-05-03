// src/map/screenToMapCoords.tsx
// Shared helper for converting a screen-pixel point to a geographic
// coordinate (lng/lat) using whatever map is currently active.
//
// MapView (.web.tsx and .tsx) calls useRegisterScreenLookup on mount to
// register its platform-specific lookup function. Other parts of the app
// (currently: the FAB drag handler) call screenToMapCoords() with a screen
// point and get back the world coord, regardless of platform.

import { useEffect } from 'react';

export type ScreenLookup = (point: { x: number; y: number }) => Promise<{ lat: number; lng: number } | null>;

let activeLookup: ScreenLookup | null = null;

/** Register the active screen->map lookup. The MapView calls this on
 *  mount to expose its platform-specific implementation; cleans up on
 *  unmount so a subsequent map registration takes over. */
export function useRegisterScreenLookup(lookup: ScreenLookup) {
  useEffect(() => {
    activeLookup = lookup;
    return () => { if (activeLookup === lookup) activeLookup = null; };
  }, [lookup]);
}

/** Convert a screen-pixel coordinate (relative to the entire viewport)
 *  to a geographic lng/lat. Returns null if no map is currently active. */
export async function screenToMapCoords(
  point: { x: number; y: number },
): Promise<{ lat: number; lng: number } | null> {
  if (!activeLookup) return null;
  return activeLookup(point);
}
