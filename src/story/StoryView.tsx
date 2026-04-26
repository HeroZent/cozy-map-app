import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Story } from '@/data/types';

export interface StoryViewProps {
  story: Story;
}

export function StoryView({ story }: StoryViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={[styles.backTxt, { color: theme.textMuted }]}>← Back to map</Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={[styles.mood, { color: theme.accent }]}>{mood?.emoji} {mood?.name}</Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {story.location_label ?? 'Somewhere'} · {ageDays}d ago
        </Text>
      </View>

      <Text style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        {story.body}
      </Text>

      {story.is_memory && (
        <Text style={[styles.memoryLabel, { color: theme.pinMemory.body }]}>
          ✦ This is now a memory
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  back: { marginBottom: 24 },
  backTxt: { fontSize: 14 },
  body: { fontSize: 17, lineHeight: 26 },
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  memoryLabel: { fontSize: 13, fontStyle: 'italic', marginTop: 32 },
  meta: { fontSize: 12 },
  mood: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
});
