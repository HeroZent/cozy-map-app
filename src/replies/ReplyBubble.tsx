import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Reply } from './useReplies';

export interface ReplyBubbleProps {
  reply: Reply;
}

export function ReplyBubble({ reply }: ReplyBubbleProps) {
  const theme = useTheme();
  const handle = reply.display_handle ?? 'anon';
  const ageDays = Math.floor((Date.now() - new Date(reply.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;

  return (
    <View style={[styles.bubble, { backgroundColor: theme.background }]}>
      <Text style={styles.content}>
        <Text style={[styles.handle, { color: theme.accent }]}>{handle}</Text>
        <Text style={[styles.sep, { color: theme.textMuted }]}>{' · '}</Text>
        <Text style={[styles.body, { color: theme.textPrimary }]}>{reply.body}</Text>
        {'  '}
        <Text style={[styles.time, { color: theme.textMuted }]}>{timeLabel}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 13 },
  bubble: {
    borderRadius: 10,
    marginBottom: 6,
    padding: 10,
  },
  content: { fontSize: 13, lineHeight: 20 },
  handle: { fontWeight: '600' },
  sep: {},
  time: { fontSize: 11 },
});
