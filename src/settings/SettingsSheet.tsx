import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface SettingsSheetProps {
  onClose: () => void;
  heatmapOn: boolean;
  onHeatmapToggle: () => void;
  bottomOffset?: number;
}

export function SettingsSheet({ onClose, heatmapOn, onHeatmapToggle, bottomOffset = 0 }: SettingsSheetProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          Settings
        </Text>
        <Pressable onPress={onClose} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <Row label="App" value="sulat. v0.1.0" theme={theme} />
      <Row label="Theme" value="Lantern Glow" theme={theme} />
      <Row label="Mode" value="Anonymous — no account needed" theme={theme} />
      <ToggleRow label="Heatmap" enabled={heatmapOn} onToggle={onHeatmapToggle} theme={theme} />

      <View style={[styles.divider, { backgroundColor: 'rgba(245,230,200,0.08)' }]} />

      <Text style={[styles.about, { color: theme.textMuted }]}>
        sulat is a cozy anonymous map for leaving little notes at the places that matter to you. No usernames, no followers — just words and a pin.
      </Text>

      <Text style={[styles.credit, { color: 'rgba(245,230,200,0.3)' }]}>
        Made with warmth 🕯️
      </Text>
    </View>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ToggleRow({ label, enabled, onToggle, theme }: { label: string; enabled: boolean; onToggle: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textMuted }]}>{label}</Text>
      <Pressable onPress={onToggle} style={[styles.toggle, { borderColor: theme.accent, backgroundColor: enabled ? theme.accent : 'transparent' }]}>
        <Text style={[styles.toggleTxt, { color: enabled ? '#2a1f0a' : theme.textMuted }]}>
          {enabled ? 'on' : 'off'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  about: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  card: {
    borderRadius: 18,
    elevation: 12,
    left: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  credit: { fontSize: 11, textAlign: 'center' },
  divider: { height: 1, marginBottom: 14, marginTop: 4 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '500' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  toggle: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  toggleTxt: { fontSize: 12, fontWeight: '600' },
});
