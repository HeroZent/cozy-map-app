import { Platform, View, StyleSheet, type ViewProps } from 'react-native';

type Tint = 'dark' | 'light';

interface Props extends ViewProps {
  /** Background tint family. Defaults to 'dark' for night-map UI. */
  tint?: Tint;
  /** Background opacity (0–1). Lower = more see-through. Default 0.72. */
  opacity?: number;
  /** Blur radius in px (web only — native falls back to higher opacity). Default 28. */
  blur?: number;
}

/**
 * Glass-morphism surface: frosted-blur backdrop on web, layered
 * semi-transparent fallback on native. Use for floating chrome
 * (header bars, bottom nav, sheet backgrounds) over the map.
 *
 * On native (iOS/Android), this renders as a higher-opacity solid
 * since `expo-blur` isn't installed — adding it would unlock real
 * native blur, but the solid fallback already looks intentional.
 */
export function GlassSurface({
  tint = 'dark',
  opacity = 0.72,
  blur = 28,
  style,
  children,
  ...rest
}: Props) {
  const baseDark  = `rgba(10, 14, 34, ${opacity})`;
  const baseLight = `rgba(245, 230, 200, ${opacity})`;
  const fillDark  = `rgba(20, 26, 58, ${Math.min(opacity + 0.18, 1)})`;
  const fillLight = `rgba(245, 230, 200, ${Math.min(opacity + 0.18, 1)})`;

  const webStyle = Platform.OS === 'web'
    ? {
        backgroundColor: tint === 'dark' ? baseDark : baseLight,
        // @ts-ignore — RN-Web CSS passthrough
        backdropFilter:        `blur(${blur}px) saturate(180%)`,
        // @ts-ignore
        WebkitBackdropFilter:  `blur(${blur}px) saturate(180%)`,
      }
    : { backgroundColor: tint === 'dark' ? fillDark : fillLight };

  return (
    <View {...rest} style={[styles.base, webStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
