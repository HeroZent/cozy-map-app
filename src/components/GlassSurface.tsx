import { Platform, View, StyleSheet, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

type Tint = 'dark' | 'light';

interface Props extends ViewProps {
  /** Background tint family. Defaults to 'dark' for night-map UI. */
  tint?: Tint;
  /** Web-only: background opacity behind the blur (0–1). Default 0.72. */
  opacity?: number;
  /** Web-only blur radius in px (default 28). Native uses BlurView's
   *  intensity scale (0–100) — this value is multiplied by ~1.6 to map. */
  blur?: number;
}

/**
 * Glass-morphism surface used for floating chrome (header, bottom nav,
 * sheet backgrounds) over the map.
 *
 *  • Web: CSS `backdrop-filter: blur(...) saturate(180%)` over a tinted
 *    background. The map shines through the blur.
 *  • Native: `<BlurView>` from expo-blur — real frosted glass on iOS and
 *    Android. On Android we enable `experimentalBlurMethod="dimezisBlurView"`
 *    to get actual blur (the default is a semi-transparent fallback).
 */
export function GlassSurface({
  tint = 'dark',
  opacity = 0.72,
  blur = 28,
  style,
  children,
  ...rest
}: Props) {
  if (Platform.OS === 'web') {
    const bg = tint === 'dark'
      ? `rgba(10, 14, 34, ${opacity})`
      : `rgba(245, 230, 200, ${opacity})`;
    return (
      <View
        {...rest}
        style={[
          styles.base,
          {
            backgroundColor: bg,
            // @ts-ignore — RN-Web CSS passthrough
            backdropFilter: `blur(${blur}px) saturate(180%)`,
            // @ts-ignore
            WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // Native — real frosted blur via expo-blur.
  // intensity 0–100; tune so it reads similar to web's 28-px blur.
  const intensity = Math.min(85, Math.round(blur * 1.6));
  return (
    <BlurView
      {...rest}
      tint={tint === 'dark' ? 'dark' : 'light'}
      intensity={intensity}
      experimentalBlurMethod="dimezisBlurView"
      style={[styles.base, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
