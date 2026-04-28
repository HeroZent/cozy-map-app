import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Reply } from './useReplies';

export interface ReplyBubbleProps {
  reply: Reply;
  /** Mood color of the parent story — drives the left stripe and identity dot */
  stripeColor?: string;
}

export function ReplyBubble({ reply, stripeColor }: ReplyBubbleProps) {
  const theme = useTheme();
  const handle = reply.display_handle ?? 'anon';
  const ageDays = Math.floor((Date.now() - new Date(reply.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  const accent = stripeColor ?? theme.accent;

  return (
    <View
      style={[
        styles.bubble,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      {/* Mood-color stripe on the left */}
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <View style={styles.inner}>
        {/* Author identity row */}
        <View style={styles.headerRow}>
          <View style={[styles.identityDot, { backgroundColor: accent }]} />
          <Text style={[styles.handle, { color: accent }]} numberOfLines={1}>
            {handle}
          </Text>
          <View style={{ flex: 1 }} />
          <View
            style={[
              styles.timeChip,
              { borderColor: theme.border, backgroundColor: 'rgba(255,255,255,0.04)' },
            ]}
          >
            <Text style={[styles.timeChipText, { color: theme.textFaint }]}>{timeLabel}</Text>
          </View>
        </View>

        {/* Body */}
        <Text style={[styles.body, { color: theme.textPrimary }]}>{reply.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  stripe: { width: 3 },
  inner: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },

  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  identityDot: {
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  handle: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
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

  body: {
    fontSize: 13,
    lineHeight: 19,
  },
});
