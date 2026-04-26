import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface MoodPickerProps {
  onPick: (mood: Mood) => void;
}

export function MoodPicker({ onPick }: MoodPickerProps) {
  const theme = useTheme();
  return (
    <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        What is this?
      </Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>Pick a mood that fits.</Text>
      <View style={styles.grid}>
        {MOODS.map((m) => (
          <Pressable key={m.id} onPress={() => onPick(m.id)} style={[styles.cell, { backgroundColor: theme.surface }]}>
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.name, { color: theme.textPrimary }]}>{m.name}</Text>
            <Text style={[styles.desc, { color: theme.textMuted }]}>{m.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cell: { borderRadius: 14, flexBasis: '48%', padding: 14 },
  desc: { fontSize: 12, lineHeight: 16 },
  emoji: { fontSize: 32, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 28 },
  title: { fontSize: 28, marginBottom: 6 },
  wrap: { minHeight: '100%', padding: 24, paddingTop: 60 },
});
