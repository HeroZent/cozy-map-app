// src/map/PinMarker.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface PinMarkerProps {
  mood: Mood;
  isMemory: boolean;
  reactionCount?: number;
}

/**
 * A story pin on the map. Each mood has its own warm tint that radiates
 * subtly outward — at a glance you can read the emotional weather of an
 * area (rose-orange for regret, lavender for dream, sage for hopeful, etc.).
 *
 * Memory stories override the mood tint with the lavender memory glow.
 *
 * High-engagement stories (>2 reactions) get a soft outer halo so they
 * draw the eye without being loud.
 */
export function PinMarker({ mood, isMemory, reactionCount = 0 }: PinMarkerProps) {
  const theme = useTheme();
  const moodEntry = getMoodById(mood);

  // Pick the tint: memory stories use the dedicated memory glow,
  // others pull from the new mood palette (falls back to amber accent).
  const tintColor = isMemory
    ? theme.pinMemory.body
    : (theme.moods[mood as keyof typeof theme.moods] ?? theme.accent);

  const glowColor = isMemory ? theme.pinMemory.glow : tintColor;
  const isHighlighted = reactionCount > 2;

  return (
    <View style={styles.wrap}>
      {/* Soft outer halo when story has resonance — pulls the eye gently */}
      {isHighlighted && (
        <View
          style={[
            styles.halo,
            { backgroundColor: tintColor, opacity: 0.18 },
          ]}
          pointerEvents="none"
        />
      )}

      <View
        style={[
          styles.pin,
          {
            backgroundColor: theme.surfaceMuted,
            borderColor: tintColor,
            shadowColor: glowColor,
          },
        ]}
      >
        <Text style={styles.emoji}>{moodEntry?.emoji ?? '·'}</Text>
      </View>

      {isMemory && (
        <Text
          style={[
            styles.decoration,
            { color: theme.pinMemory.body, textShadowColor: theme.pinMemory.glow },
          ]}
        >
          {theme.pinMemory.decoration}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  halo: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  pin: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    elevation: 4,
    height: 28,
    justifyContent: 'center',
    /* Smaller shadow radius = much cheaper paint when 50+ pins are visible.
       The mood-tinted border already gives the pin its colored signature,
       so we don't need the heavy glow to read at a glance. */
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    width: 28,
  },
  emoji: {
    fontSize: 13.5,
    lineHeight: 16,
  },
  decoration: {
    fontSize: 11,
    position: 'absolute',
    right: -3,
    top: -3,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
});
