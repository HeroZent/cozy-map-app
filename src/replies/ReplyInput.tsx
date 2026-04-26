// src/replies/ReplyInput.tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

const MAX_CHARS = 300;

export interface ReplyInputProps {
  onSubmit: (body: string) => Promise<void>;
}

export function ReplyInput({ onSubmit }: ReplyInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = draft.trim().length === 0;

  const handleSend = async () => {
    if (isEmpty || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(draft.trim());
      setDraft('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message :
        typeof e === 'string' ? e :
        'Something went wrong. Try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.wrap}>
      {error ? (
        <Text style={[styles.errorTxt, { color: theme.accent }]}>{error}</Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.background, borderColor: theme.surface, color: theme.textPrimary },
          ]}
          placeholder="leave a reply…"
          placeholderTextColor={theme.textMuted}
          value={draft}
          onChangeText={(t) => {
            setDraft(t.slice(0, MAX_CHARS));
            setError(null);
          }}
          editable={!submitting}
          multiline
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: theme.accent, opacity: (isEmpty || submitting) ? 0.4 : 1 }]}
          onPress={handleSend}
          disabled={submitting || isEmpty}
        >
          {submitting ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <Text style={[styles.sendTxt, { color: theme.background }]}>{'↑'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorTxt: { fontSize: 12, marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  sendBtn: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sendTxt: { fontSize: 16, fontWeight: '700' },
  wrap: { marginTop: 8 },
});
