// src/notifications/NotificationSheet.tsx
import { useRef, useState, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { useNotifications } from '@/data/useNotifications';
import type { Notification } from '@/data/useNotifications';
import { NotificationRow } from './NotificationRow';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';

export interface NotificationSheetProps {
  onClose: () => void;
  onNavigate: (lat: number, lng: number) => void;
  bottomOffset?: number;
}

export function NotificationSheet({ onClose, onNavigate, bottomOffset = 0 }: NotificationSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { notifications, activityNotificationIds, markRead, loading } = useNotifications();

  // Snapshot the notifications once on first non-loading render.
  // markRead is optimistic and removes rows from the live array — rendering from
  // the snapshot means rows stay visible until the sheet is closed.
  const [snapshot, setSnapshot] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const markedRef = useRef(false);

  useEffect(() => {
    if (loading || markedRef.current) return;
    markedRef.current = true;
    setSnapshot(notifications);
    const memoryIds = notifications
      .filter((n) => n.type === 'memory_promoted')
      .map((n) => n.id);
    markRead([...activityNotificationIds, ...memoryIds]).catch((err) => {
      console.error('[NotificationSheet] markRead failed:', err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleRowPress = (notif: Notification) => {
    // Call onClose directly (not via animated ref) so it fires immediately —
    // matches ProfileModal's navigation tap pattern.
    onClose();
    if (notif.stories !== null) {
      onNavigate(notif.stories.lat, notif.stories.lng);
    }
  };

  const unreadCount = useMemo(
    () => snapshot.filter((n) => !readIds.has(n.id)).length,
    [snapshot, readIds],
  );

  const handleMarkAllRead = () => {
    setReadIds(new Set(snapshot.map((n) => n.id)));
  };

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
            notifications
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {snapshot.length === 0 ? 'inbox' : `${snapshot.length} update${snapshot.length === 1 ? '' : 's'}`}
          </Text>
        </View>

        {unreadCount > 0 && (
          <PressableScale
            onPress={handleMarkAllRead}
            style={[
              styles.markAllPill,
              {
                backgroundColor: theme.accentSoft ?? 'rgba(244,201,122,0.18)',
                borderColor: 'rgba(244,201,122,0.4)',
              },
            ]}
          >
            <Text style={[styles.markAllTxt, { color: theme.accent }]}>mark all read</Text>
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

      {loading && snapshot.length === 0 ? (
        <ActivityIndicator
          testID="notif-loading"
          color={theme.accent}
          style={styles.centred}
        />
      ) : snapshot.length === 0 ? (
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
            <Text style={styles.emptyEmoji}>🔔</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            nothing new yet
          </Text>
          <Text style={[styles.emptyHint, { color: theme.textFaint }]}>
            We{'’'}ll let you know when someone replies or reacts
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
        >
          {snapshot.map((notif) => (
            <NotificationRow
              key={notif.id}
              notification={notif}
              isUnread={!readIds.has(notif.id)}
              onPress={() => handleRowPress(notif)}
            />
          ))}
        </ScrollView>
      )}
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
  header: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 12 },
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
  markAllPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markAllTxt: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  centred: { marginVertical: 24 },
  feed: { flex: 1 },
  feedContent: { gap: 6, paddingBottom: 6 },

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
