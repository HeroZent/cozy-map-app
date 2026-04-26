// src/replies/ReplyThread.tsx
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useReplies } from './useReplies';
import { usePostReply } from './usePostReply';
import { ReplyBubble } from './ReplyBubble';
import { ReplyInput } from './ReplyInput';

export interface ReplyThreadProps {
  storyId: string;
  onCountChange: (delta: number) => void;
}

export function ReplyThread({ storyId, onCountChange }: ReplyThreadProps) {
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
        <Text style={[styles.hint, { color: theme.textMuted }]}>Failed to load replies.</Text>
      ) : replies.length === 0 ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>be the first to reply</Text>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {replies.map((reply) => (
            <ReplyBubble key={reply.id} reply={reply} />
          ))}
        </ScrollView>
      )}
      <ReplyInput onSubmit={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 12 },
  hint: { fontSize: 13, paddingVertical: 8, textAlign: 'center' },
  list: { maxHeight: 160 },
  wrap: { marginTop: 6 },
});
