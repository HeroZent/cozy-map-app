// src/notifications/NotificationSheet.tsx
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useNotifications } from '@/data/useNotifications';
import type { Notification } from '@/data/useNotifications';
import { NotificationRow } from './NotificationRow';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';

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

  return (
    <AnimatedSheet
      ref={sheetRef}
      style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          notifications
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      {loading && snapshot.length === 0 ? (
        <ActivityIndicator
          testID="notif-loading"
          color={theme.accent}
          style={styles.centred}
        />
      ) : snapshot.length === 0 ? (
        <Text style={[styles.emptyTxt, { color: theme.textMuted }]}>nothing new yet</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.feed}>
          {snapshot.map((notif) => (
            <NotificationRow
              key={notif.id}
              notification={notif}
              isUnread={true}
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
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  emptyTxt: { fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  feed: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '500' },
});
