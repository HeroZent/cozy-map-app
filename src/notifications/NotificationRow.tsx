// src/notifications/NotificationRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Notification } from '@/data/useNotifications';

export interface NotificationRowProps {
  notification: Notification;
  isUnread: boolean;
  onPress: () => void;
}

/** Compact relative time: "now", "2m", "3h", "5d" */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

/** Story age: "today", "1d ago", "5d ago" */
function sulatAge(iso: string): string {
  const ageDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (ageDays === 0) return 'today';
  if (ageDays === 1) return '1d ago';
  return `${ageDays}d ago`;
}

const LABEL: Record<Notification['type'], string> = {
  new_reply: 'Someone replied to your sulat',
  new_reaction: 'Someone reacted to your sulat',
  memory_promoted: 'Your sulat became a memory',
};

const ICON: Record<Notification['type'], string> = {
  new_reply: '💬',
  new_reaction: '✦',
  memory_promoted: '✦',
};

export function NotificationRow({ notification, isUnread, onPress }: NotificationRowProps) {
  const theme = useTheme();
  const { type, created_at, stories } = notification;

  const excerpt =
    stories === null
      ? null
      : stories.body.length > 40
        ? `${stories.body.slice(0, 40)}…`
        : stories.body;
  const location = stories?.location_label ?? null;
  const sulatDate = stories?.created_at ?? null;

  return (
    <Pressable
      testID={`notification-row-${notification.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${LABEL[type]}, ${relativeTime(created_at)}`}
      style={[
        styles.row,
        {
          borderLeftColor: isUnread ? '#f4c97a' : 'transparent',
          backgroundColor: isUnread ? 'rgba(255,255,255,0.05)' : 'transparent',
        },
      ]}
    >
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{ICON[type]}</Text>
        <Text
          style={[styles.label, { color: theme.textPrimary, opacity: isUnread ? 1 : 0.45 }]}
          numberOfLines={1}
        >
          {LABEL[type]}
        </Text>
        <Text style={[styles.time, { color: theme.textMuted, opacity: isUnread ? 0.6 : 0.3 }]}>
          {relativeTime(created_at)}
        </Text>
      </View>

      {excerpt !== null && (
        <Text
          style={[styles.excerpt, { color: theme.textMuted, opacity: isUnread ? 0.6 : 0.35 }]}
          numberOfLines={1}
        >
          {excerpt}
        </Text>
      )}

      {(location !== null || sulatDate !== null) && (
        <Text
          style={[styles.sulatMeta, { color: theme.accent, opacity: isUnread ? 0.6 : 0.35 }]}
          numberOfLines={1}
        >
          {location !== null ? `📍 ${location}` : ''}
          {location !== null && sulatDate !== null ? ' · ' : ''}
          {sulatDate !== null ? sulatAge(sulatDate) : ''}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  excerpt: { fontSize: 9, fontStyle: 'italic', marginBottom: 2, paddingLeft: 20 },
  icon: { fontSize: 13, marginRight: 6 },
  label: { flex: 1, fontSize: 10, fontWeight: '500' },
  labelRow: { alignItems: 'center', flexDirection: 'row', marginBottom: 3 },
  row: { borderLeftWidth: 4, borderRadius: 6, marginBottom: 6, paddingHorizontal: 8, paddingVertical: 8 },
  sulatMeta: { fontSize: 9, paddingLeft: 20 },
  time: { fontSize: 9 },
});
