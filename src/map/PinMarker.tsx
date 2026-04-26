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

export function PinMarker({ mood, isMemory }: PinMarkerProps) {
  const theme = useTheme();
  const moodEntry = getMoodById(mood);
  const tokens = isMemory ? theme.pinMemory : theme.pin;

  return (
    <View style={styles.wrap}>
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
