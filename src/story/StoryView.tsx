import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Story } from '@/data/types';
import { PH_HOTLINE } from '@/moderation/hotlines';

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

      {story.has_crisis_note && (
        <View style={styles.crisisNote}>
          <Text style={[styles.crisisNoteText, { color: theme.textMuted }]}>
            💙 If you're going through something heavy, support is available.
          </Text>
          <Pressable onPress={() => Linking.openURL(PH_HOTLINE.tel).catch(() => {})}>
            <Text style={[styles.crisisNoteLink, { color: theme.accent }]}>
              {PH_HOTLINE.name} · {PH_HOTLINE.number}
            </Text>
          </Pressable>
        </View>
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
  crisisNote: {
    borderTopColor: 'rgba(244,201,122,0.08)',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  crisisNoteText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  crisisNoteLink: {
    fontSize: 12,
    fontWeight: '600',
  },
});
