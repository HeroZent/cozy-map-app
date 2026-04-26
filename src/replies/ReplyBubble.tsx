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
      <Text style={[styles.handle, { color: theme.accent }]}>{handle}</Text>
      <Text style={[styles.sep, { color: theme.textMuted }]}>{' · '}</Text>
      <Text style={[styles.body, { color: theme.textPrimary }]}>{reply.body}</Text>
      <Text style={[styles.time, { color: theme.textMuted }]}>{timeLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, fontSize: 13, lineHeight: 18 },
  bubble: {
    alignItems: 'flex-start',
    borderRadius: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    padding: 10,
  },
  handle: { fontSize: 12, fontWeight: '600' },
  sep: { fontSize: 13 },
  time: { fontSize: 11, marginLeft: 4 },
});
