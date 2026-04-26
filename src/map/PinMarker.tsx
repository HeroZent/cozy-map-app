// src/map/PinMarker.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
  reactionCount?: number;
}

function getGlowTier(count: number): { opacityRange: [number, number]; scaleRange: [number, number]; duration: number } {
  if (count >= 20) return { opacityRange: [0.50, 0.85], scaleRange: [1.00, 1.45], duration: 2800 };
  if (count >= 5)  return { opacityRange: [0.35, 0.65], scaleRange: [0.92, 1.28], duration: 4000 };
  return                  { opacityRange: [0.22, 0.52], scaleRange: [0.88, 1.14], duration: 5600 };
}

export function PinMarker({ mood, isMemory, reactionCount = 0 }: PinMarkerProps) {
  const theme = useTheme();
  const moodEntry = getMoodById(mood);
  const tokens = isMemory ? theme.pinMemory : theme.pin;
  const tier = getGlowTier(reactionCount);

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: tier.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: tier.duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, tier.duration]);

  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: tier.opacityRange });
  const glowScale  = pulse.interpolate({ inputRange: [0, 1], outputRange: tier.scaleRange });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: tokens.glow,
            shadowColor: tokens.glow,
            opacity: glowOpacity,
            transform: [{ scaleX: glowScale }, { scaleY: glowScale }],
          },
        ]}
      />
      <View style={[styles.pin, { backgroundColor: theme.background, borderColor: tokens.body, shadowColor: tokens.glow }]}>
        <Text style={styles.emoji}>{moodEntry?.emoji ?? '·'}</Text>
      </View>
      {isMemory && <Text style={styles.decoration}>{theme.pinMemory.decoration}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  decoration: { color: '#d0b8ff', fontSize: 10, position: 'absolute', right: -4, top: -4 },
  emoji: { fontSize: 13 },
  glow: {
    borderRadius: 40,
    bottom: -14,
    height: 56,
    left: -22,
    position: 'absolute',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    width: 72,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 2,
    elevation: 4,
    height: 26,
    justifyContent: 'center',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 26,
  },
  wrap: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
});
