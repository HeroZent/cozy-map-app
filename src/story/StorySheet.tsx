// src/story/StorySheet.tsx
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { ReactionBar } from '@/reactions/ReactionBar';
import { FlagSheet } from '@/reactions/FlagSheet';
import type { Story } from '@/data/types';

export interface StorySheetProps {
  story: Story;
  onClose: () => void;
  onReacted?: () => void;
  bottomOffset?: number;
}

export function StorySheet({ story, onClose, onReacted, bottomOffset = 0 }: StorySheetProps) {
  const theme = useTheme();
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Location header */}
      <View style={styles.locationRow}>
        <Text style={[styles.locationPin, { color: theme.accent }]}>📍</Text>
        <Text style={[styles.locationLabel, { color: theme.textMuted }]}>
          {story.location_label ? story.location_label.toUpperCase() : 'SOMEWHERE'}
        </Text>
        <Pressable
          onPress={() => !flagged && setFlagOpen((v) => !v)}
          style={styles.flagHitbox}
        >
          <Text style={[styles.flagTxt, { color: (flagOpen || flagged) ? theme.accent : theme.textMuted }]}>⚑</Text>
        </Pressable>
        <Pressable onPress={onClose} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {flagOpen ? (
        <FlagSheet storyId={story.id} onClose={() => { setFlagOpen(false); setFlagged(true); }} />
      ) : (
        <>
          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bodyWrap}
          >
            <Text
              style={[styles.body, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}
              numberOfLines={4}
            >
              {story.body}
            </Text>
          </ScrollView>

          {/* Reactions */}
          <ReactionBar story={story} onReacted={onReacted} />

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTxt, { color: theme.textMuted }]}>
              {mood?.emoji}  {mood?.name}  ·  {timeLabel}
            </Text>
            {story.is_memory && (
              <Text style={[styles.memoryBadge, { color: theme.pinMemory.body }]}>✦ memory</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 24 },
  bodyWrap: { paddingBottom: 4 },
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    maxHeight: 280,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  closeHitbox: { padding: 4 },
  closeTxt: { fontSize: 14 },
  flagHitbox: { marginLeft: 'auto', padding: 4 },
  flagTxt: { fontSize: 13 },
  footer: { alignItems: 'center', flexDirection: 'row', marginTop: 10 },
  footerTxt: { fontSize: 12 },
  locationLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  locationPin: { fontSize: 11, marginRight: 4 },
  locationRow: { alignItems: 'center', flexDirection: 'row', gap: 4, marginBottom: 10 },
  memoryBadge: { fontSize: 11, fontStyle: 'italic', marginLeft: 10 },
});
