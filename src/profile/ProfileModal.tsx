// src/profile/ProfileModal.tsx
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useUser } from '@/data/useUser';
import { useMyStories } from './useMyStories';
import { getSeenCount, isUnread as checkUnread } from './useUnreadReplies';
import { HandleClaim } from './HandleClaim';
import { MySulatRow } from './MySulatRow';
import { supabase } from '@/data/supabase';
import { StylePicker } from '@/story/StylePicker';
import { DEFAULT_CARD_STYLE, type CardStyleId } from '@/story/cardStyles';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';

export interface ProfileModalProps {
  onClose: () => void;
  /** Called when user taps a sulat row. Caller should fly the map to this location. */
  onNavigate: (lat: number, lng: number) => void;
  bottomOffset?: number;
}

export function ProfileModal({ onClose, onNavigate, bottomOffset = 0 }: ProfileModalProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { user, loading: userLoading, error: userError } = useUser();
  const { stories, loading: storiesLoading, error: storiesError } = useMyStories();
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const [preferredStyle, setPreferredStyle] = useState<CardStyleId>(DEFAULT_CARD_STYLE);
  const [saved, setSaved] = useState(false);

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

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          your sulat
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {userLoading ? (
        <ActivityIndicator color={theme.accent} style={styles.centred} />
      ) : userError ? (
        <Text style={[styles.errorTxt, { color: '#e87c6a' }]}>could not load profile</Text>
      ) : (
        <>
          {/* Handle section */}
          {displayHandle !== null ? (
            <>
              <View style={styles.handleRow}>
                <Text style={[styles.handleTxt, { color: theme.accent }]}>
                  @{displayHandle}
                </Text>
                <Text style={[styles.lockIcon, { color: theme.textMuted }]}>{'  🔒'}</Text>
              </View>
              <View style={styles.styleSection}>
                <Text style={[styles.styleSectionLabel, { color: theme.textMuted }]}>your paper</Text>
                <StylePicker selected={preferredStyle} onSelect={handleStyleChange} showLabel />
                {saved && (
                  <Text style={[styles.savedTxt, { color: theme.accent }]}>Saved ✓</Text>
                )}
              </View>
            </>
          ) : user !== null ? (
            <HandleClaim
              userId={user.id}
              onClaimed={(h) => setClaimedHandle(h)}
            />
          ) : null}

          <View style={[styles.divider, { backgroundColor: 'rgba(245,230,200,0.08)' }]} />

          {/* Sulat feed */}
          {storiesError ? (
            <Text style={[styles.emptyTxt, { color: '#e87c6a' }]}>could not load sulats</Text>
          ) : storiesLoading ? (
            <ActivityIndicator color={theme.accent} style={styles.centred} />
          ) : stories.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>
              you haven't posted any sulats yet
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.feed}>
              {stories.map((story) => (
                <MySulatRow
                  key={story.id}
                  story={story}
                  isUnread={checkUnread(story.reply_count, seenCounts[story.id] ?? 0)}
                  onNavigate={() => {
                    onClose();
                    onNavigate(story.lat, story.lng);
                  }}
                />
              ))}
            </ScrollView>
          )}
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
    maxHeight: 520,
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
  centred: { marginVertical: 20 },
  errorTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  divider: { height: 1, marginBottom: 10, marginTop: 10 },
  emptyTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  feed: { flex: 1 },
  handleRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 4 },
  handleTxt: { fontSize: 18, fontWeight: '600' },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  lockIcon: { fontSize: 13 },
  title: { fontSize: 17, fontWeight: '500' },
  savedTxt: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  styleSectionLabel: { fontSize: 11, fontWeight: '500', marginBottom: 6 },
  styleSection: { marginBottom: 4, marginTop: 8 },
});
