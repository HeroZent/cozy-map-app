import { useRef } from 'react';
import { Linking, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { usePushSubscription } from '@/push/usePushSubscription';

export interface SettingsSheetProps {
  onClose: () => void;
  heatmapOn: boolean;
  onHeatmapToggle: () => void;
  bottomOffset?: number;
}

export function SettingsSheet({ onClose, heatmapOn, onHeatmapToggle, bottomOffset = 0 }: SettingsSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { subscribed, loading, permissionDenied, subscribe, unsubscribe } = usePushSubscription();

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { backgroundColor: theme.surface, bottom: bottomOffset }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
          Settings
        </Text>
        <Pressable onPress={() => sheetRef.current?.close(onClose)} style={styles.closeHitbox}>
          <Text style={[styles.closeTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      </View>

      <Row label="App" value="sulat. v0.1.0" theme={theme} />
      <Row label="Theme" value="Lantern Glow" theme={theme} />
      <Row label="Mode" value="Anonymous — no account needed" theme={theme} />
      <ToggleRow label="Heatmap" enabled={heatmapOn} onToggle={onHeatmapToggle} theme={theme} />

      {/* Push notifications toggle */}
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: theme.textMuted }]}>Push notifications</Text>
        {permissionDenied ? (
          <Text style={[styles.rowValue, { color: theme.textMuted }]}>Enable in browser settings</Text>
        ) : (
          <Switch
            testID="push-notifications-switch"
            value={subscribed}
            onValueChange={(val) => (val ? subscribe() : unsubscribe())}
            disabled={loading}
            trackColor={{ true: theme.accent, false: theme.textMuted }}
            thumbColor={theme.surface}
          />
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: 'rgba(245,230,200,0.08)' }]} />

      <Text style={[styles.about, { color: theme.textMuted }]}>
        sulat is a cozy anonymous map for leaving little notes at the places that matter to you. No usernames, no followers — just words and a pin.
      </Text>

      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL('/privacy')} accessibilityRole="link">
          <Text style={[styles.legalLink, { color: theme.textMuted }]}>Privacy Policy</Text>
        </Pressable>
        <Text style={[styles.legalSep, { color: 'rgba(245,230,200,0.2)' }]}>·</Text>
        <Pressable onPress={() => Linking.openURL('/terms')} accessibilityRole="link">
          <Text style={[styles.legalLink, { color: theme.textMuted }]}>Terms of Service</Text>
        </Pressable>
      </View>

      <Text style={[styles.credit, { color: 'rgba(245,230,200,0.3)' }]}>
        Made with warmth 🕯️
      </Text>
    </AnimatedSheet>
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
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  closeHitbox: { marginLeft: 'auto', padding: 4 },
  closeTxt: { fontSize: 14 },
  credit: { fontSize: 11, textAlign: 'center' },
  legalLink: { fontSize: 11 },
  legalRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 12 },
  legalSep: { fontSize: 11 },
  divider: { height: 1, marginBottom: 14, marginTop: 4 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 16 },
  headerTitle: { fontSize: 17, fontWeight: '500' },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500' },
  toggle: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  toggleTxt: { fontSize: 12, fontWeight: '600' },
});
