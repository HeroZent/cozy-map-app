// src/profile/DeleteConfirmSheet.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface DeleteConfirmSheetProps {
  visible: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmSheet({ visible, deleting, onConfirm, onCancel }: DeleteConfirmSheetProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Delete sulat</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>
          {"This sulat can't be recovered after deletion."}
        </Text>
        <View style={styles.buttons}>
          <Pressable onPress={deleting ? undefined : onCancel} disabled={deleting} accessibilityRole="button">
            <Text style={[styles.cancelTxt, { color: theme.textMuted }]}>Cancel</Text>
          </Pressable>
          <Pressable onPress={deleting ? undefined : onConfirm} disabled={deleting} accessibilityRole="button">
            <Text style={[styles.deleteTxt, { opacity: deleting ? 0.5 : 1 }]}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 24,
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelTxt: {
    fontSize: 14,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  card: {
    borderRadius: 16,
    maxWidth: 320,
    padding: 24,
    width: '80%',
  },
  deleteTxt: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
