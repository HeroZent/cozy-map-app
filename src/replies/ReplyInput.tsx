// src/replies/ReplyInput.tsx
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { PressableScale } from '@/components/PressableScale';
import { checkCrisis } from '@/moderation/crisisTripwire';
import { HotlineOverlay } from '@/moderation/HotlineOverlay';

const MAX_CHARS = 300;

export interface ReplyInputProps {
  onSubmit: (body: string) => Promise<void>;
}

export function ReplyInput({ onSubmit }: ReplyInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHotline, setShowHotline] = useState(false);
  const pendingBodyRef = useRef('');

  const isEmpty = draft.trim().length === 0;

  const submitBody = async (body: string) => {
    setSubmitting(true);
    setError(null);
    setShowHotline(false);   // <-- Fix I1: clear overlay if somehow still visible
    try {
      await onSubmit(body);
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

  const handleSend = () => {
    if (isEmpty || submitting) return;
    const trimmed = draft.trim();
    // Layer 1: crisis tripwire — show overlay, hold submission
    if (checkCrisis(trimmed)) {
      pendingBodyRef.current = trimmed;
      setShowHotline(true);
      return;
    }
    submitBody(trimmed);
  };

  const sendDisabled = isEmpty || submitting;

  return (
    <View style={styles.wrap}>
      {error ? (
        <Text style={[styles.errorTxt, { color: theme.accent }]}>{error}</Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              color: theme.textPrimary,
              borderRadius: theme.radii.full,
            },
          ]}
          placeholder="leave a reply…"
          placeholderTextColor={theme.textFaint}
          value={draft}
          onChangeText={(t) => {
            setDraft(t.slice(0, MAX_CHARS));
            setError(null);
          }}
          editable={!submitting && !showHotline}
          multiline
        />
        <PressableScale
          onPress={handleSend}
          disabled={sendDisabled}
          style={[
            styles.sendBtn,
            {
              backgroundColor: sendDisabled ? theme.accentDim : theme.accent,
              borderRadius: theme.radii.full,
              opacity: sendDisabled ? 0.55 : 1,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.background} size="small" />
          ) : (
            <Text style={[styles.sendTxt, { color: theme.background }]}>{'↑'}</Text>
          )}
        </PressableScale>
      </View>
      <HotlineOverlay
        visible={showHotline}
        onGetHelp={() => setShowHotline(false)}
        onContinue={() => {
          setShowHotline(false);
          // Replies always use Layer 2a — no crisis_hint for edge function
          submitBody(pendingBodyRef.current);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  errorTxt: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  row: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  sendBtn: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sendTxt: { fontSize: 16, fontWeight: '700' },
  wrap: { marginTop: 8 },
});
