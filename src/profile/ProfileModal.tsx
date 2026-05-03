// src/profile/ProfileModal.tsx
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';
import { useMyStories } from './useMyStories';
import { getSeenCount, isUnread as checkUnread } from './useUnreadReplies';
import { HandleClaim } from './HandleClaim';
import { MySulatRow } from './MySulatRow';
import { DeleteConfirmSheet } from './DeleteConfirmSheet';
import { supabase } from '@/data/supabase';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { useBackgroundMusic } from '@/audio/useBackgroundMusic';

export interface ProfileModalProps {
  onClose: () => void;
  /** Called when user taps a sulat row. Caller should fly the map to this location. */
  onNavigate: (lat: number, lng: number) => void;
  /** Called after a story is successfully deleted so the map can refresh. */
  onDeleted?: () => void;
  bottomOffset?: number;
}

export function ProfileModal({ onClose, onNavigate, onDeleted, bottomOffset = 0 }: ProfileModalProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const bgMusic = useBackgroundMusic();
  const { user, loading: userLoading, error: userError } = useUser();
  const { stories, loading: storiesLoading, error: storiesError, deleteStory } = useMyStories();
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [preferredStyle, setPreferredStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);
  const [saved, setSaved] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Resolved handle: prefer the just-claimed one over the DB value.
  const displayHandle = claimedHandle ?? user?.display_handle ?? null;

  // Load AsyncStorage seen counts once stories are ready.
  useEffect(() => {
    if (stories.length === 0) return;
    (async () => {
      const counts: Record<string, number> = {};
      for (const story of stories) {
        counts[story.id] = await getSeenCount(story.id);
      }
      setSeenCounts(counts);
    })();
  }, [stories]);

  useEffect(() => {
    if (user?.preferred_card_style) {
      setPreferredStyle(user.preferred_card_style);
    }
  }, [user?.preferred_card_style]);

  const handleStyleChange = async (id: CardStyleId) => {
    if (!user) return;
    setPreferredStyle(id);
    const { error: saveErr } = await supabase
      .from('users')
      .update({ preferred_card_style: id })
      .eq('id', user.id);
    if (!saveErr) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteStory(pendingDeleteId);
      setPendingDeleteId(null);
      onDeleted?.();
    } catch (err) {
      console.error('[ProfileModal] delete failed:', err);
      setPendingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const storyCount = stories.length;
  const subtitle =
    storyCount === 0
      ? 'your sulat'
      : `${storyCount} ${storyCount === 1 ? 'story' : 'stories'} shared`;

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { bottom: bottomOffset }]}>
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
          <Text
            style={[styles.title, { color: theme.accent, fontFamily: theme.fontFamily }]}
            numberOfLines={1}
          >
            {displayHandle ? `@${displayHandle}` : 'your sulat'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
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

      {userLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.centred} />
      ) : userError ? (
        <Text style={[styles.errorTxt, { color: '#e87c6a' }]}>could not load profile</Text>
      ) : (
        <>
          {/* Handle / claim section */}
          {displayHandle === null && user !== null && (
            <HandleClaim
              userId={user.id}
              onClaimed={(h) => setClaimedHandle(h)}
            />
          )}

          {displayHandle !== null && (
            <View style={styles.styleSection}>
              <Text style={[styles.sectionLabel, { color: theme.textFaint }]}>
                YOUR PAPER
              </Text>
              <StylePicker selected={preferredStyle} onSelect={handleStyleChange} showLabel />
              {saved && (
                <Text style={[styles.savedTxt, { color: theme.accent }]}>Saved ✓</Text>
              )}
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />

          {/* Music section — only shown when audio is available (manifest non-empty). */}
          {bgMusic.isAudioAvailable && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textFaint }]}>MUSIC</Text>
              <View style={styles.musicRow}>
                <Text style={[styles.musicLabel, { color: theme.textPrimary }]}>Music off</Text>
                <Switch
                  value={bgMusic.isMuted}
                  onValueChange={bgMusic.toggleMute}
                  trackColor={{ false: theme.borderSoft, true: theme.accent }}
                  thumbColor={theme.surface}
                />
              </View>
              <PressableScale onPress={bgMusic.skipTrack} style={styles.musicRow}>
                <Text style={[styles.musicLabel, { color: theme.textPrimary }]}>Skip track</Text>
                <Text style={[styles.musicAction, { color: theme.accent }]}>↦</Text>
              </PressableScale>
              {bgMusic.currentTrackName && (
                <Text style={[styles.nowPlaying, { color: theme.textFaint }]}>
                  Now playing: {bgMusic.currentTrackName}
                </Text>
              )}
              <View style={[styles.divider, { backgroundColor: theme.borderSoft }]} />
            </>
          )}

          {/* Sulat feed */}
          <Text style={[styles.sectionLabel, { color: theme.textFaint, marginBottom: 6 }]}>
            YOUR SULAT
          </Text>

          {storiesError ? (
            <Text style={[styles.errorTxt, { color: '#e87c6a' }]}>could not load sulats</Text>
          ) : storiesLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.centred} />
          ) : stories.length === 0 ? (
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
                <Text style={styles.emptyEmoji}>✉️</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                No stories yet
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textFaint }]}>
                Tap + on the map to share your first sulat
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.feed} contentContainerStyle={styles.feedContent}>
              {stories.map((story) => (
                <MySulatRow
                  key={story.id}
                  story={story}
                  isUnread={checkUnread(story.reply_count, seenCounts[story.id] ?? 0)}
                  onNavigate={() => {
                    onClose();
                    onNavigate(story.lat, story.lng);
                  }}
                  onDelete={pendingDeleteId ? undefined : () => setPendingDeleteId(story.id)}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}

      {/* Delete confirmation overlay — rendered outside ScrollView per DeleteConfirmSheet placement requirement */}
      <DeleteConfirmSheet
        visible={pendingDeleteId !== null}
        deleting={deleting}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </AnimatedSheet>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 14,
    left: 12,
    maxHeight: 520,
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
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
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

  centred: { marginVertical: 20 },
  errorTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  divider: { height: 1, marginBottom: 12, marginTop: 12 },
  feed: { flex: 1 },
  feedContent: { gap: 8, paddingBottom: 6 },

  savedTxt: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  styleSection: { marginBottom: 4, marginTop: 4 },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.05,
    marginBottom: 6,
  },

  /* Music section */
  musicRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  musicLabel: { fontSize: 14 },
  musicAction: { fontSize: 18, fontWeight: '600' },
  nowPlaying: { fontSize: 11, marginTop: 2 },

  /* Empty state */
  empty: { alignItems: 'center', paddingVertical: 28 },
  emptyBadge: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginBottom: 10,
    width: 52,
  },
  emptyEmoji: { fontSize: 22 },
  emptyTitle: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  emptyHint: { fontSize: 12.5, paddingHorizontal: 24, textAlign: 'center' },
});
