import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useFlag } from './useFlag';

const REASONS = [
  'Harmful or dangerous',
  'Sexual or explicit',
  'Spam',
  'Harassment',
  'Other',
];

export interface FlagSheetProps {
  storyId: string;
  onClose: () => void;
}

export function FlagSheet({ storyId, onClose }: FlagSheetProps) {
  const theme = useTheme();
  const flag = useFlag();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFlag = async (reason: string) => {
    setLoading(true);
    try {
      await flag(storyId, reason);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface }]}>
      {done ? (
        <Text style={[styles.thanks, { color: theme.textPrimary }]}>
          Thanks for letting us know.
        </Text>
      ) : loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Report this sulat</Text>
            <Pressable onPress={onClose} style={styles.closeHitbox}>
              <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
            </Pressable>
          </View>
          {REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => handleFlag(reason)}
              style={[styles.row, { borderBottomColor: 'rgba(245,230,200,0.08)' }]}
            >
              <Text style={[styles.reason, { color: theme.textPrimary }]}>{reason}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 8 },
  reason: { fontSize: 14, paddingVertical: 12 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth },
  thanks: { fontSize: 15, paddingVertical: 16, textAlign: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  wrap: { borderRadius: 14, padding: 14 },
});
