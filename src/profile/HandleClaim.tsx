// src/profile/HandleClaim.tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { supabase } from '@/data/supabase';

const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;

export interface HandleClaimProps {
  userId: string;
  onClaimed: (handle: string) => void;
}

export function HandleClaim({ userId, onClaimed }: HandleClaimProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!HANDLE_RE.test(trimmed)) {
      setError('3–20 chars, letters, numbers, and underscores only');
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: dbErr } = await supabase
      .from('users')
      .update({ display_handle: trimmed })
      .eq('id', userId);

    setSubmitting(false);

    if (dbErr) {
      if (dbErr.code === '23505') {
        setError('that handle is already taken');
      } else if (dbErr.code === '23514') {
        setError('3–20 chars, letters, numbers, and underscores only');
      } else {
        setError('something went wrong, try again');
      }
      return;
    }

    onClaimed(trimmed);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>claim your handle</Text>
      <TextInput
        style={[styles.input, {
          backgroundColor: theme.background,
          color: theme.textPrimary,
          borderColor: error ? '#e87c6a' : theme.accent,
        }]}
        value={draft}
        onChangeText={(t) => { setDraft(t); setError(null); }}
        placeholder="e.g. cozy_writer"
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
        maxLength={20}
      />
      {error !== null && (
        <Text style={styles.errorTxt}>{error}</Text>
      )}
      <Pressable
        onPress={handleSubmit}
        disabled={submitting || draft.trim().length === 0}
        style={[styles.btn, {
          backgroundColor: theme.accent,
          opacity: (submitting || draft.trim().length === 0) ? 0.5 : 1,
        }]}
      >
        {submitting
          ? <ActivityIndicator size="small" color="#2a1f0a" />
          : <Text style={styles.btnTxt}>Claim handle</Text>
        }
      </Pressable>
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        permanent · cannot be changed later
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', borderRadius: 12, marginTop: 8, paddingVertical: 10 },
  btnTxt: { color: '#2a1f0a', fontSize: 14, fontWeight: '600' },
  errorTxt: { color: '#e87c6a', fontSize: 12, marginTop: 4 },
  hint: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  label: { fontSize: 13, fontWeight: '500' },
  wrap: { marginBottom: 12 },
});
