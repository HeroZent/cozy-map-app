import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/data/supabase';
import { getMoodById } from '@/moods/catalog';
import type { Story } from '@/data/types';

const SELECT = 'id, author_id, mood, body, location_label, pin_mode, language, status, is_memory, created_at, lat, lng';

export interface LanternSheetProps {
  onClose: () => void;
  onSelectStory?: (story: Story) => void;
  bottomOffset?: number;
}

export function LanternSheet({ onClose, onSelectStory, bottomOffset = 0 }: LanternSheetProps) {
  const theme = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) { setLoading(false); return; }

      const { data } = await supabase
        .from('stories')
        .select(SELECT)
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setStories(
          data.map((r: typeof data[number] & { lat: number; lng: number }) => ({
            ...r,
            location: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
            reaction_count: 0,
            reaction_counts: {},
            my_reactions: [],
          })) as Story[],
        );
      }
      setLoading(false);
    })();
  }, []);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          🪔  Your lantern
        </Text>
        <Pressable onPress={onClose} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={styles.loader} />
      ) : stories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyEmoji]}>🪔</Text>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No sulats yet</Text>
          <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
            Double-tap the map to drop your first one.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {stories.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              theme={theme}
              onPress={() => { onClose(); onSelectStory?.(story); }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StoryRow({ story, theme, onPress }: { story: Story; theme: ReturnType<typeof useTheme>; onPress: () => void }) {
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  const location = story.location_label ? story.location_label.toUpperCase() : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: theme.background }]}
    >
      <Text style={styles.rowEmoji}>{mood?.emoji ?? '·'}</Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowText, { color: theme.textPrimary }]} numberOfLines={2}>
          {story.body}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
          {mood?.name}  ·  {timeLabel}{location ? `  ·  ${location}` : ''}
        </Text>
      </View>
      {story.is_memory && (
        <Text style={[styles.memoryDot, { color: theme.pinMemory.body }]}>✦</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    maxHeight: 380,
    paddingBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyHint: { fontSize: 13, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  headerTitle: { fontSize: 17, fontWeight: '500' },
  list: { gap: 8, paddingBottom: 4 },
  loader: { marginVertical: 32 },
  memoryDot: { fontSize: 12, marginLeft: 8 },
  row: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  rowBody: { flex: 1 },
  rowEmoji: { fontSize: 20, marginTop: 1 },
  rowMeta: { fontSize: 11, marginTop: 4 },
  rowText: { fontSize: 14, lineHeight: 20 },
});
