import { Platform, View } from 'react-native';

/** Radial dark vignette over the map edges — web only. */
export function MapVignette() {
  if (Platform.OS !== 'web') return null;

  // Native div bypasses React Native style validation and accepts any CSS
  return (
    <div
      style={{
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        // radial-gradient: transparent centre, deep navy at edges
        background: 'radial-gradient(ellipse at 50% 45%, transparent 38%, rgba(10,14,34,0.80) 100%)',
        zIndex: 1,
      }}
    />
  );
}

/** Subtle warm amber tint over the map — takes the cold blue out of dark tiles. */
export function MapWarmTint() {
  return (
    <View
      style={{
        backgroundColor: 'rgba(244,201,122,0.04)',
        bottom: 0,
        left: 0,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 0,
      } as object}
    />
  );
}
