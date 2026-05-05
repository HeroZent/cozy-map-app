// src/story/StorySheet.tsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import { ReactionBar } from '@/reactions/ReactionBar';
import { FlagSheet } from '@/reactions/FlagSheet';
import { ReplyThread } from '@/replies/ReplyThread';
import { markSeen } from '@/profile/useUnreadReplies';
import { useReadStories } from '@/data/useReadStories';
import { StarToggle } from './StarToggle';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { StoryCard } from './StoryCard';
import { PH_HOTLINE } from '@/moderation/hotlines';
import { useUser } from '@/data/useUser';
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

  // Author handle for the header.
  //   • Other people's sulats: show story.display_handle, falling back to
  //     'anon' (matches the ReplyBubble convention so the same person reads
  //     consistently across the story and their replies).
  //   • Your own sulats: always show 'anon'. You already know you wrote it,
  //     and this keeps your handle out of any screenshot/share you take of
  //     your own sulat — handy for test data and for early users posting
  //     under throwaway claimed handles.
  const { user: currentUser } = useUser();
  const { markRead } = useReadStories();

  // Auto-mark the story as read on mount; the kv write is fire-and-forget.
  // Re-fires when the user navigates between different stories without
  // unmounting the sheet (story.id is stable per story).
  useEffect(() => {
    markRead(story.id).catch(() => {
      // Persistence failure is non-blocking — in-memory state is already
      // updated optimistically inside markRead.
    });
  }, [story.id, markRead]);

  const isOwnSulat = currentUser?.id === story.author_id;
  const handle = isOwnSulat ? 'anon' : (story.display_handle ?? 'anon');

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

            {/* Author handle — mood-tinted dot + handle text. Mirrors the
             *  identity treatment used in ReplyBubble so a reader recognises
             *  "@maryanne" the same way whether they're reading the sulat
             *  itself or one of her replies. */}
            <View
              style={[
                styles.handlePill,
                {
                  backgroundColor: `${moodColor}14`,
                  borderColor: `${moodColor}33`,
                },
              ]}
            >
              <View style={[styles.handleDot, { backgroundColor: moodColor }]} />
              <Text
                style={[styles.handleText, { color: moodColor }]}
                numberOfLines={1}
              >
                {handle}
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
            <StarToggle storyId={story.id} />
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
            {/* Scrollable middle: body + reactions + thread + crisis note.
             *  Header (close/flag) and footer (reply button) stay pinned so
             *  the user can always close the sheet or open the thread, no
             *  matter how long the sulat body is. Without this wrapper, long
             *  bodies overflow the cardWrap maxHeight and the reply chip is
             *  clipped invisibly. */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
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
                  storyMood={story.mood}
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
            </ScrollView>

            {/* Footer pills row — pinned outside the scroll so the reply
             *  button is always reachable. */}
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
    flex: 1,
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  /* Scrollable middle section. flex:1 + a defined parent height (cardWrap's
   * maxHeight 480) lets ScrollView claim the leftover space between the
   * fixed header and footer, so long bodies become scrollable instead of
   * clipped. */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 4,
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

  /* Author handle pill */
  handlePill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    maxWidth: 140,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  handleDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  handleText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.05,
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
