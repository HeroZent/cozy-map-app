// src/story/StorySheet.tsx
import { useState, useEffect, useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { ReactionBar } from '@/reactions/ReactionBar';
import { FlagSheet } from '@/reactions/FlagSheet';
import { ReplyThread } from '@/replies/ReplyThread';
import { markSeen } from '@/profile/useUnreadReplies';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { StoryCard } from './StoryCard';
import { PH_HOTLINE } from '@/moderation/hotlines';
import type { Story } from '@/data/types';

export interface StorySheetProps {
  story: Story;
  onClose: () => void;
  onReacted?: () => void;
  bottomOffset?: number;
}

export function StorySheet({ story, onClose, onReacted, bottomOffset = 0 }: StorySheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const mood = getMoodById(story.mood);
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [replyCount, setReplyCount] = useState(story.reply_count);

  // Close thread and reset count only when a different story is selected.
  // Do NOT include story.reply_count here — updating it would collapse
  // an open reply thread every time the parent refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setThreadOpen(false); setReplyCount(story.reply_count); }, [story.id]);

  // Sync reply count from fresh story data without disturbing an open thread.
  useEffect(() => {
    if (!threadOpen) setReplyCount(story.reply_count);
  }, [story.reply_count, threadOpen]);

  useEffect(() => {
    if (threadOpen) {
      markSeen(story.id, replyCount);
    }
  }, [threadOpen, story.id, replyCount]);

  const replyLabel =
    replyCount > 0 ? `💬 ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : '💬 Reply';

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
    >
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
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {flagOpen ? (
        <FlagSheet storyId={story.id} onClose={() => { setFlagOpen(false); setFlagged(true); }} />
      ) : (
        <>
          {/* Body */}
          <StoryCard
            body={story.body}
            cardStyle={story.card_style}
            locationLabel={story.location_label}
            createdAt={story.created_at}
            hasCrisisNote={story.has_crisis_note}
          />

          {/* Reactions */}
          <ReactionBar story={story} onReacted={onReacted} />

          {/* Reply thread (lazy — mounts on first open) */}
          {threadOpen && (
            <ReplyThread
              storyId={story.id}
              onCountChange={(delta) => setReplyCount((c) => c + delta)}
            />
          )}

          {/* Crisis note */}
          {story.has_crisis_note && (
            <View style={[styles.crisisNote, { borderTopColor: 'rgba(244,201,122,0.08)' }]}>
              <Text style={[styles.crisisNoteText, { color: theme.textMuted }]}>
                💙 Support is available if you need it.
              </Text>
              <Pressable onPress={() => Linking.openURL(PH_HOTLINE.tel).catch(() => {})}>
                <Text style={[styles.crisisNoteLink, { color: theme.accent }]}>
                  {PH_HOTLINE.name} · {PH_HOTLINE.number}
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerTxt, { color: theme.textMuted }]}>
              {mood?.emoji}{'  '}{mood?.name}{'  ·  '}{timeLabel}
            </Text>
            {story.is_memory && (
              <Text style={[styles.memoryBadge, { color: theme.pinMemory.body }]}>✦ memory</Text>
            )}
            <Pressable onPress={() => setThreadOpen((v) => !v)} style={styles.replyHitbox}>
              <Text style={[styles.replyToggle, { color: (threadOpen || replyCount > 0) ? theme.accent : theme.textMuted, fontWeight: replyCount > 0 ? '600' : '400' }]}>
                {replyLabel}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    maxHeight: 480,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
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
  replyHitbox: { marginLeft: 'auto', padding: 4 },
  replyToggle: { fontSize: 12 },
  crisisNote: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
    marginBottom: 2,
  },
  crisisNoteText: { fontSize: 11, lineHeight: 16, marginBottom: 2 },
  crisisNoteLink: { fontSize: 11, fontWeight: '600' },
});
