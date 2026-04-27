// src/moderation/HotlineOverlay.tsx
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { PH_HOTLINE, GLOBAL_FALLBACK_URL } from './hotlines';

export interface HotlineOverlayProps {
  visible: boolean;
  onGetHelp: () => void;
  onContinue: () => void;
}

export function HotlineOverlay({ visible, onGetHelp, onContinue }: HotlineOverlayProps) {
  // useTheme must be called before the early-return to satisfy rules-of-hooks.
  const theme = useTheme();

  if (!visible) return null;

  const handleGetHelp = () => {
    Linking.openURL(PH_HOTLINE.tel).catch(() => {
      Linking.openURL(GLOBAL_FALLBACK_URL).catch(() => { /* best-effort; no further fallback */ });
    });
    onGetHelp();
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => { /* intentionally no-op: user must choose a button */ }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Someone sees you 🕯️
          </Text>
          <Text style={[styles.body, { color: theme.textMuted }]}>
            It sounds like you might be going through something heavy. You
            don't have to carry it alone.
          </Text>
          <View style={[styles.hotlineBox, { borderColor: theme.accent }]}>
            <Text style={[styles.hotlineName, { color: theme.accent }]}>
              {PH_HOTLINE.name}
            </Text>
            <Text style={[styles.hotlineNumber, { color: theme.textPrimary }]}>
              {PH_HOTLINE.number}
            </Text>
          </View>
          <Pressable
            style={[styles.btn, { backgroundColor: theme.accent }]}
            onPress={handleGetHelp}
          >
            <Text style={[styles.btnPrimaryTxt, { color: theme.background }]}>
              Get help now
            </Text>
          </Pressable>
          <Pressable style={styles.btnSecondary} onPress={onContinue}>
            <Text style={[styles.btnSecondaryTxt, { color: theme.textMuted }]}>
              Continue posting
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  btn: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    marginBottom: 10,
  },
  btnPrimaryTxt: { fontSize: 15, fontWeight: '600' },
  btnSecondary: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
  },
  btnSecondaryTxt: { fontSize: 13 },
  card: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  hotlineBox: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  hotlineName: { fontSize: 11, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase' },
  hotlineNumber: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
});
