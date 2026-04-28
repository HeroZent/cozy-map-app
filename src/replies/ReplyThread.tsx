// src/replies/ReplyThread.tsx
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useReplies } from './useReplies';
import { usePostReply } from './usePostReply';
import { ReplyBubble } from './ReplyBubble';
import { ReplyInput } from './ReplyInput';
import type { Mood } from '@/data/types';

export interface ReplyThreadProps {
  storyId: string;
  onCountChange: (delta: number) => void;
  /** Parent story's mood — drives the left-stripe color on each reply card */
  storyMood?: Mood;
}

export function ReplyThread({ storyId, onCountChange, storyMood }: ReplyThreadProps) {
  const theme = useTheme();
  const { replies, loading, error, fetch } = useReplies(storyId);
  const postReply = usePostReply();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch();
  }, [fetch]);

  const handleSubmit = async (body: string) => {
    await postReply(storyId, body);
    onCountChange(1);
    await fetch();
  };

  const moodColor = storyMood
    ? theme.moods[storyMood as keyof typeof theme.moods] ?? theme.accent
    : theme.accent;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} size="small" />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {error ? (
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
            <Text style={styles.emptyEmoji}>·</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            Couldn{'’'}t load replies
          </Text>
          <Text style={[styles.emptySub, { color: theme.textFaint }]}>
            Try again in a moment
          </Text>
        </View>
      ) : replies.length === 0 ? (
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
            <Text style={styles.emptyEmoji}>💬</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No replies yet
          </Text>
          <Text style={[styles.emptySub, { color: theme.textFaint }]}>
            Be the first to respond
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} stripeColor={moodColor} />
          ))}
        </ScrollView>
      )}
      <ReplyInput onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 12 },
  list: { maxHeight: 200 },
  wrap: { marginTop: 6 },

  /* Empty state */
  empty: {
    alignItems: 'center',
    paddingVertical: 18,
  },
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
  emptyTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  emptySub: { fontSize: 12.5 },
});
