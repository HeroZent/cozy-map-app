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
  const tightLocation = stories?.location_label
    ? (stories.location_label.split(',')[0] ?? stories.location_label).trim()
    : null;

  // Memory notifications get a lavender accent; everything else uses gold.
  const accent =
    type === 'memory_promoted' ? (theme.pinMemory?.body ?? theme.accent) : theme.accent;

  return (
    <Pressable
      testID={`notification-row-${notification.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${LABEL[type]}, ${relativeTime(created_at)}`}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: isUnread ? theme.surfaceElevated : 'rgba(255,255,255,0.02)',
          borderColor: isUnread ? `${accent}26` : theme.border,
          borderLeftColor: isUnread ? '#f4c97a' : 'transparent',
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.inner}>
        {/* Left: icon badge */}
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: isUnread ? `${accent}1F` : (theme.accentDim ?? 'rgba(244,201,122,0.08)'),
              borderColor: isUnread ? `${accent}40` : theme.border,
            },
          ]}
        >
          <Text style={styles.icon}>{ICON[type]}</Text>
        </View>

        {/* Middle: label + excerpt + meta */}
        <View style={styles.body}>
          <Text
            style={[
              styles.label,
              { color: theme.textPrimary, opacity: isUnread ? 1 : 0.55 },
            ]}
            numberOfLines={1}
          >
            {LABEL[type]}
          </Text>

          {excerpt !== null && (
            <Text
              style={[styles.excerpt, { color: theme.textMuted, opacity: isUnread ? 0.85 : 0.5 }]}
              numberOfLines={1}
            >
              {excerpt}
            </Text>
          )}

          {tightLocation && (
            <Text
              style={[styles.location, { color: theme.textFaint }]}
              numberOfLines={1}
            >
              📍 {tightLocation}
            </Text>
          )}
        </View>

        {/* Right: time chip + unread dot */}
        <View style={styles.right}>
          <View
            style={[
              styles.timeChip,
              {
                borderColor: isUnread ? `${accent}33` : theme.border,
                backgroundColor: 'rgba(255,255,255,0.04)',
              },
            ]}
          >
            <Text style={[styles.timeChipText, { color: theme.textFaint }]}>
              {relativeTime(created_at)}
            </Text>
          </View>
          {isUnread && (
            <View style={[styles.unreadDot, { backgroundColor: accent }]} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    borderLeftWidth: 3,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },

  iconBadge: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  icon: { fontSize: 14 },

  body: { flex: 1, gap: 2 },
  label: { fontSize: 12.5, fontWeight: '600', letterSpacing: -0.05 },
  excerpt: { fontSize: 11.5 },
  location: { fontSize: 10.5, marginTop: 2 },

  right: { alignItems: 'flex-end', gap: 4 },
  timeChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  timeChipText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  unreadDot: { borderRadius: 3, height: 6, width: 6 },
});
