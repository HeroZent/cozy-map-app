// src/story/StorySheet.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { ReactionBar } from '@/reactions/ReactionBar';
import { FlagSheet } from '@/reactions/FlagSheet';
import { ReplyThread } from '@/replies/ReplyThread';
import { markSeen } from '@/profile/useUnreadReplies';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { StoryCard } from './StoryCard';
import { PH_HOTLINE } from '@/moderation/hotlines';
import type { Story } from '@/data/types';

export interface StorySheetProps {
  story: Story;
  onClose: () => void;
  onReacted?: () => void;
  bottomOffset?: number;
}

/** Estimate reading length from body text. Average reading speed = 200 wpm. */
function readingHint(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const seconds = (words / 200) * 60;
  if (words < 12) return 'haiku';
  if (seconds < 30) return 'short note';
  if (seconds < 90) return '1min letter';
  if (seconds < 180) return `${Math.ceil(seconds / 60)}min letter`;
  return `${Math.ceil(seconds / 60)}min letter`;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setThreadOpen(false); setReplyCount(story.reply_count); }, [story.id]);

  // Sync reply count from fresh story data without disturbing an open thread.
  useEffect(() => {
    if (!threadOpen) setReplyCount(story.reply_count);
  }, [story.reply_count, threadOpen]);

  useEffect(() => {
    if (threadOpen) markSeen(story.id, replyCount);
  }, [threadOpen, story.id, replyCount]);

  // Mood color drives the ambient backdrop tint behind the card.
  const moodColor = useMemo(
    () =>
      theme.moods[story.mood as keyof typeof theme.moods] ?? theme.accent,
    [theme.moods, theme.accent, story.mood],
  );

  const reading = useMemo(() => readingHint(story.body), [story.body]);

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.cardWrap, { bottom: bottomOffset }]}
    >
      {/* ── Layered ambient backdrop ──────────────────────────────────── */}
      {/* Base surface — keeps text legible */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, borderRadius: 18 },
        ]}
        pointerEvents="none"
      />
      {/* Mood-tinted wash — subtle but you *feel* the mood before reading */}
      <LinearGradient
        colors={[`${moodColor}26`, `${moodColor}10`, 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
        pointerEvents="none"
      />
      {/* Top-edge gold highlight — gives the sheet a "lit from above" lift */}
      <LinearGradient
        colors={['rgba(244,201,122,0.18)', 'rgba(244,201,122,0)']}
        style={styles.topHighlight}
        pointerEvents="none"
      />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <View style={styles.content}>
        {/* Header pills row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.moodPill,
                {
                  backgroundColor: `${moodColor}1F`,
                  borderColor: `${moodColor}3D`,
                },
              ]}
            >
              <Text style={styles.moodPillEmoji}>{mood?.emoji ?? '·'}</Text>
              <Text style={[styles.moodPillText, { color: moodColor }]}>
                {mood?.name?.toLowerCase() ?? story.mood}
              </Text>
            </View>

            {story.location_label && (
              <View
                style={[
                  styles.locationPill,
                  { borderColor: 'rgba(244,201,122,0.18)' },
                ]}
              >
                <Text style={styles.locationPillIcon}>📍</Text>
                <Text style={[styles.locationPillText, { color: theme.textMuted }]}>
                  {story.location_label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {!flagged && (
              <PressableScale
                onPress={() => setFlagOpen((v) => !v)}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: flagOpen ? 'rgba(244,201,122,0.18)' : 'rgba(255,255,255,0.04)',
                    borderColor: flagOpen ? 'rgba(244,201,122,0.4)' : 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <Text style={[styles.iconBtnText, { color: flagOpen ? theme.accent : theme.textMuted }]}>⚑</Text>
              </PressableScale>
            )}
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
        </View>

        {flagOpen ? (
          <FlagSheet storyId={story.id} onClose={() => { setFlagOpen(false); setFlagged(true); }} />
        ) : (
          <>
            {/* Body card */}
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
                <PressableScale
                  onPress={() => Linking.openURL(PH_HOTLINE.tel).catch(() => {})}
                  style={styles.crisisHotlineBtn}
                >
                  <Text style={[styles.crisisNoteLink, { color: theme.accent }]}>
                    {PH_HOTLINE.name} · {PH_HOTLINE.number}
                  </Text>
                </PressableScale>
              </View>
            )}

            {/* Footer pills row */}
            <View style={styles.footerRow}>
              <View style={[styles.metaChip, { borderColor: 'rgba(244,201,122,0.12)' }]}>
                <Text style={[styles.metaChipText, { color: theme.textFaint }]}>
                  {reading}
                </Text>
              </View>

              <View style={[styles.metaChip, { borderColor: 'rgba(244,201,122,0.12)' }]}>
                <Text style={[styles.metaChipText, { color: theme.textFaint }]}>
                  {timeLabel}
                </Text>
              </View>

              {story.is_memory && (
                <View
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: 'rgba(208,184,255,0.1)',
                      borderColor: 'rgba(208,184,255,0.28)',
                    },
                  ]}
                >
                  <Text style={[styles.metaChipText, { color: theme.pinMemory.body }]}>
                    ✦ memory
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }} />

              <PressableScale
                onPress={() => setThreadOpen((v) => !v)}
                style={[
                  styles.replyChip,
                  {
                    backgroundColor: (threadOpen || replyCount > 0)
                      ? 'rgba(244,201,122,0.16)'
                      : 'transparent',
                    borderColor: (threadOpen || replyCount > 0)
                      ? 'rgba(244,201,122,0.32)'
                      : 'rgba(244,201,122,0.14)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.replyChipText,
                    {
                      color: (threadOpen || replyCount > 0) ? theme.accent : theme.textMuted,
                      fontWeight: replyCount > 0 ? '700' : '500',
                    },
                  ]}
                >
                  {replyCount > 0
                    ? `💬 ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                    : '💬 reply'}
                </Text>
              </PressableScale>
            </View>
          </>
        )}
      </View>
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 18,
    elevation: 14,
    left: 12,
    maxHeight: 480,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  content: {
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topHighlight: {
    height: 14,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  /* ── Header pills row ────────────────────────── */
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  headerLeft: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  /* Mood pill */
  moodPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  moodPillEmoji: { fontSize: 12 },
  moodPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },

  /* Location pill */
  locationPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 180,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  locationPillIcon: { fontSize: 10 },
  locationPillText: { fontSize: 11, fontWeight: '500' },

  /* Header icon buttons */
  iconBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconBtnText: {
    fontSize: 12,
    lineHeight: 14,
  },

  /* Crisis note */
  crisisNote: {
    borderTopWidth: 1,
    marginBottom: 2,
    marginTop: 8,
    paddingTop: 8,
  },
  crisisHotlineBtn: { alignSelf: 'flex-start' },
  crisisNoteText: { fontSize: 11, lineHeight: 16, marginBottom: 2 },
  crisisNoteLink: { fontSize: 11, fontWeight: '600' },

  /* ── Footer pills row ────────────────────────── */
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  metaChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaChipText: {
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  replyChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  replyChipText: {
    fontSize: 11.5,
    letterSpacing: -0.05,
  },
});
