import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shimmering placeholder block. Use to reserve space and signal
 * "content is on its way" — a single skeleton looks unfinished;
 * use 2-3 stacked at varying widths for a natural rhythm.
 *
 * Animation: opacity pulses 0.45 → 1 over 1.4s, ease-in-out, repeated.
 * Keeps things calm — no rapid shimmer that competes with content.
 */
export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: Props) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: width as ViewStyle['width'],
          height: height as ViewStyle['height'],
          borderRadius,
          backgroundColor: theme.surface,
          opacity: pulse,
        },
        style,
      ]}
    >
      {/* Soft top-edge highlight to give the skeleton subtle depth */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: theme.surfaceElevated,
            opacity: 0.35,
          },
        ]}
        pointerEvents="none"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
