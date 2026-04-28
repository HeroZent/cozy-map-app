// src/cluster/ClusterStoriesSheet.tsx
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import type { Story } from '@/data/types';

export interface ClusterStoriesSheetProps {
  stories: Story[];
  onClose: () => void;
  onSelectStory: (story: Story) => void;
  bottomOffset?: number;
}

/**
 * When a user taps a cluster of sulats — especially one where multiple
 * stories share (or nearly share) the same coordinates — we can't simply
 * zoom in to break them apart. This sheet lists every sulat in the cluster
 * so the user can pick any one to read.
 *
 * Each row shows: mood pill, body excerpt, location, age. Tap to open
 * the full StorySheet for that story.
 */
export function ClusterStoriesSheet({
  stories,
  onClose,
  onSelectStory,
  bottomOffset = 0,
}: ClusterStoriesSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);

  const handleClose = () => {
    sheetRef.current?.close(onClose);
  };

  const handlePick = (story: Story) => {
    sheetRef.current?.close(() => onSelectStory(story));
  };

  // Show a tighter location label by trimming after the first comma when long
  const tightLocation = (label?: string | null): string =>
    !label ? '' : (label.split(',')[0] ?? label).trim();

  return (
    <View style={[styles.outerWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
      <AnimatedSheet
        ref={sheetRef}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: 'rgba(244,201,122,0.22)',
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {stories.length} sulat at this place
            </Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              tap one to read
            </Text>
          </View>
          <PressableScale onPress={handleClose} style={[styles.closeBtn, { backgroundColor: theme.surfaceElevated }]}>
            <Text style={[styles.closeIcon, { color: theme.textMuted }]}>✕</Text>
          </PressableScale>
        </View>

        {/* Story list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {stories.map((story) => {
            const moodEntry = getMoodById(story.mood);
            const moodColor = theme.moods[story.mood as keyof typeof theme.moods] ?? theme.accent;
            const ageDays = Math.floor(
              (Date.now() - new Date(story.created_at).getTime()) / 86400000,
            );
            const ageLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d' : `${ageDays}d`;
            const truncated = story.body.length > 110
              ? story.body.slice(0, 110).trim() + '…'
              : story.body;

            return (
              <PressableScale
                key={story.id}
                onPress={() => handlePick(story)}
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
                {/* Mood color stripe on the left */}
                <View
                  style={[styles.moodStripe, { backgroundColor: moodColor }]}
                />

                <View style={styles.rowContent}>
                  {/* Top: mood pill + age */}
                  <View style={styles.rowMeta}>
                    <View
                      style={[
                        styles.moodPill,
                        {
                          backgroundColor: moodColor + '24',
                          borderColor: moodColor + '40',
                          borderRadius: theme.radii.full,
                        },
                      ]}
                    >
                      <Text style={[styles.moodText, { color: moodColor }]}>
                        {moodEntry?.emoji ?? '·'} {moodEntry?.name ?? story.mood}
                      </Text>
                    </View>
                    <Text style={[styles.age, { color: theme.textFaint }]}>{ageLabel}</Text>
                  </View>

                  {/* Body excerpt */}
                  <Text
                    numberOfLines={3}
                    style={[styles.body, { color: theme.textPrimary }]}
                  >
                    {truncated}
                  </Text>

                  {/* Location */}
                  {story.location_label && (
                    <Text
                      numberOfLines={1}
                      style={[styles.location, { color: theme.textFaint }]}
                    >
                      📍 {tightLocation(story.location_label)}
                    </Text>
                  )}
                </View>
              </PressableScale>
            );
          })}
        </ScrollView>
      </AnimatedSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxHeight: '70%',
  },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },

  /* Header */
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: 'rgba(244,201,122,0.08)',
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  closeIcon: { fontSize: 13 },

  /* List */
  list: {
    maxHeight: 380,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },

  /* Row */
  row: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
  },
  moodStripe: {
    width: 3,
  },
  rowContent: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  moodText: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  age: {
    fontSize: 10,
    fontWeight: '500',
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
  },
  location: {
    fontSize: 11,
  },
});
