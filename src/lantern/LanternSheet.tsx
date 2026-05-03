import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/data/supabase';
import { getMoodById, MOODS } from '@/moods/catalog';
import type { Mood, Story } from '@/data/types';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';

const SELECT = 'id, author_id, mood, body, card_style, location_label, pin_mode, language, status, is_memory, created_at, lat, lng, users(display_handle)';

export interface LanternSheetProps {
  onClose: () => void;
  onSelectStory?: (story: Story) => void;
  bottomOffset?: number;
}

export function LanternSheet({ onClose, onSelectStory, bottomOffset = 0 }: LanternSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [moodFilter, setMoodFilter] = useState<Mood | null>(null);

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
          data.map((r: typeof data[number] & { lat: number; lng: number; users: { display_handle: string | null } | null }) => ({
            ...r,
            location: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
            reaction_count: 0,
            reaction_counts: {},
            my_reactions: [],
            reply_count: 0,
            card_style: r.card_style || 'a',
            display_handle: r.users?.display_handle ?? null,
          })) as Story[],
        );
      }
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(
    () => (moodFilter ? stories.filter((s) => s.mood === moodFilter) : stories),
    [stories, moodFilter],
  );

  // Only surface mood filters that exist in the user's stories.
  const availableMoods = useMemo(() => {
    const set = new Set<Mood>();
    stories.forEach((s) => set.add(s.mood));
    return MOODS.filter((m) => set.has(m.id));
  }, [stories]);

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.card, { bottom: bottomOffset }]}
    >
      {/* Base surface */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, borderRadius: 18 },
        ]}
        pointerEvents="none"
      />
      {/* Top-edge gold highlight */}
      <LinearGradient
        colors={['rgba(244,201,122,0.18)', 'rgba(244,201,122,0)']}
        style={styles.topHighlight}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
            lantern
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            memories from far places
          </Text>
        </View>
        <PressableScale
          onPress={() => sheetRef.current?.close(onClose)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <Text style={[styles.iconBtnText, { color: theme.textMuted }]}>✕</Text>
        </PressableScale>
      </View>

      {/* Mood filter chips — only shown when there are stories */}
      {!loading && stories.length > 0 && availableMoods.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <PressableScale
            onPress={() => setMoodFilter(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: moodFilter === null ? theme.accentSoft : 'transparent',
                borderColor: moodFilter === null ? 'rgba(244,201,122,0.4)' : theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: moodFilter === null ? theme.accent : theme.textMuted },
              ]}
            >
              all
            </Text>
          </PressableScale>
          {availableMoods.map((m) => {
            const active = moodFilter === m.id;
            const moodColor = theme.moods[m.id as keyof typeof theme.moods] ?? theme.accent;
            return (
              <PressableScale
                key={m.id}
                onPress={() => setMoodFilter(active ? null : m.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? `${moodColor}24` : 'transparent',
                    borderColor: active ? `${moodColor}55` : theme.border,
                  },
                ]}
              >
                <Text style={styles.filterChipEmoji}>{m.emoji}</Text>
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? moodColor : theme.textMuted },
                  ]}
                >
                  {m.name.toLowerCase()}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={theme.accent} style={styles.loader} />
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <View
            style={[
              styles.emptyBadge,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={styles.emptyEmoji}>🪔</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {moodFilter ? 'No memories in this mood' : 'No memories yet'}
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textFaint }]}>
            {moodFilter
              ? 'Try a different mood filter'
              : 'Stories that touch others come back here as memories'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {visible.map((story) => (
            <StoryRow
              key={story.id}
              story={story}
              theme={theme}
              onPress={() => { sheetRef.current?.close(() => { onClose(); onSelectStory?.(story); }); }}
            />
          ))}
        </ScrollView>
      )}
    </AnimatedSheet>
  );
}

function StoryRow({ story, theme, onPress }: { story: Story; theme: ReturnType<typeof useTheme>; onPress: () => void }) {
  const moodEntry = getMoodById(story.mood);
  const moodColor = theme.moods[story.mood as keyof typeof theme.moods] ?? theme.accent;
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const ageLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d' : `${ageDays}d`;
  const truncated = story.body.length > 110
    ? story.body.slice(0, 110).trim() + '…'
    : story.body;
  const tightLocation = story.location_label
    ? (story.location_label.split(',')[0] ?? story.location_label).trim()
    : null;

  return (
    <PressableScale
      onPress={onPress}
      scaleAmount={0.97}
      style={[
        styles.row,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      {/* Mood color stripe */}
      <View style={[styles.moodStripe, { backgroundColor: moodColor }]} />

      <View style={styles.rowContent}>
        {/* Top: mood pill + age */}
        <View style={styles.rowMeta}>
          <View
            style={[
              styles.moodPill,
              {
                backgroundColor: `${moodColor}24`,
                borderColor: `${moodColor}40`,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Text style={[styles.moodText, { color: moodColor }]}>
              {moodEntry?.emoji ?? '·'} {moodEntry?.name ?? story.mood}
            </Text>
          </View>
          <View style={styles.ageRow}>
            {story.is_memory && (
              <Text style={[styles.memoryDot, { color: theme.pinMemory.body }]}>✦</Text>
            )}
            <Text style={[styles.age, { color: theme.textFaint }]}>{ageLabel}</Text>
          </View>
        </View>

        {/* Body */}
        <Text numberOfLines={3} style={[styles.body, { color: theme.textPrimary }]}>
          {truncated}
        </Text>

        {/* Location */}
        {tightLocation && (
          <Text numberOfLines={1} style={[styles.location, { color: theme.textFaint }]}>
            📍 {tightLocation}
          </Text>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 14,
    left: 12,
    maxHeight: 480,
    overflow: 'hidden',
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
  },
  topHighlight: {
    height: 14,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  /* Header */
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
  subtitle: { fontSize: 11, marginTop: 1 },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconBtnText: { fontSize: 12, lineHeight: 14 },

  /* Filter row */
  filterScroll: { marginBottom: 10, marginHorizontal: -2 },
  filterRow: { gap: 6, paddingHorizontal: 2, paddingVertical: 2 },
  filterChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterChipEmoji: { fontSize: 11 },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  loader: { marginVertical: 32 },

  /* List */
  list: { gap: 8, paddingBottom: 4 },

  /* Row */
  row: {
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  moodStripe: { width: 3 },
  rowContent: { flex: 1, gap: 6, padding: 12 },
  rowMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  moodPill: {
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  moodText: { fontSize: 10.5, fontWeight: '600', letterSpacing: 0.1 },
  ageRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  memoryDot: { fontSize: 11 },
  age: { fontSize: 10, fontWeight: '500' },
  body: { fontSize: 13, lineHeight: 19 },
  location: { fontSize: 11 },

  /* Empty state */
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyBadge: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginBottom: 10,
    width: 52,
  },
  emptyEmoji: { fontSize: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  emptyHint: { fontSize: 12.5, paddingHorizontal: 24, textAlign: 'center' },
});
