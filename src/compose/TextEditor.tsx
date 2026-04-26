import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { getMoodById } from '@/moods/catalog';
import type { Mood } from '@/data/types';

const MAX = 1000;

export interface TextEditorProps {
  mood: Mood;
  onContinue: (body: string) => void;
}

export function TextEditor({ mood, onContinue }: TextEditorProps) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const moodEntry = getMoodById(mood);

  const tooLong = text.length > MAX;
  const empty = text.trim().length === 0;
  const canContinue = !tooLong && !empty;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]}>
      <Text style={[styles.prompt, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
        {moodEntry?.prompt ?? 'What is this?'}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={moodEntry?.description}
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.input, { color: theme.textPrimary, borderColor: theme.surface }]}
      />
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <Text style={[styles.counter, { color: tooLong ? '#ff8a8a' : theme.textMuted }]}>
        {text.length} / {MAX}{tooLong ? ' — Too long' : ''}
      </Text>
      <Pressable
        onPress={() => canContinue && onContinue(text.trim())}
        // eslint-disable-next-line react-native/no-inline-styles
        style={[styles.btn, { backgroundColor: canContinue ? theme.accent : theme.surface }]}
      >
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={[styles.btnTxt, { color: canContinue ? '#2a1f0a' : theme.textMuted }]}>Continue →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', borderRadius: 12, marginTop: 24, padding: 14 },
  btnTxt: { fontSize: 15, fontWeight: '600' },
  counter: { alignSelf: 'flex-end', fontSize: 12, marginTop: 8 },
  input: { borderRadius: 12, borderWidth: 1, fontSize: 16, lineHeight: 22, minHeight: 200, padding: 16, textAlignVertical: 'top' },
  prompt: { fontSize: 24, marginBottom: 24 },
  wrap: { flex: 1, padding: 24, paddingTop: 60 },
});
