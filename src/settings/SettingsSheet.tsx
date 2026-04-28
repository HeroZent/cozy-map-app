import { useRef } from 'react';
import { Linking, View, Text, Switch, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { usePushSubscription } from '@/push/usePushSubscription';

export interface SettingsSheetProps {
  onClose: () => void;
  heatmapOn: boolean;
  onHeatmapToggle: () => void;
  bottomOffset?: number;
}

const APP_VERSION = 'sulat. v0.1.0';

export function SettingsSheet({ onClose, heatmapOn, onHeatmapToggle, bottomOffset = 0 }: SettingsSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { subscribed, loading, permissionDenied, subscribe, unsubscribe } = usePushSubscription();

  return (
    <AnimatedSheet ref={sheetRef} style={[styles.card, { bottom: bottomOffset }]}>
      {/* Base surface */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.surface, borderRadius: 18 },
        ]}
        pointerEvents="none"
      />
      {/* Top-edge gold highlight */}
      <LinearGradient
        colors={['rgba(244,201,122,0.18)', 'rgba(244,201,122,0)']}
        style={styles.topHighlight}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary, fontFamily: theme.fontFamily }]}>
            settings
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            tune your sulat
          </Text>
        </View>
        <PressableScale
          onPress={() => sheetRef.current?.close(onClose)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.06)',
            },
          ]}
        >
          <Text style={[styles.iconBtnText, { color: theme.textMuted }]}>✕</Text>
        </PressableScale>
      </View>

      {/* About section */}
      <Text style={[styles.sectionTitle, { color: theme.textFaint }]}>ABOUT</Text>
      <View style={[styles.group, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <InfoRow label="Theme" value="Lantern Glow" theme={theme} />
        <Divider color={theme.borderSoft} />
        <InfoRow label="Mode" value="Anonymous · no account needed" theme={theme} />
      </View>

      {/* Display section */}
      <Text style={[styles.sectionTitle, { color: theme.textFaint }]}>DISPLAY</Text>
      <View style={[styles.group, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <ToggleRow
          label="Heatmap"
          subtitle="show density across the map"
          enabled={heatmapOn}
          onToggle={onHeatmapToggle}
          theme={theme}
        />
      </View>

      {/* Notifications section */}
      <Text style={[styles.sectionTitle, { color: theme.textFaint }]}>NOTIFICATIONS</Text>
      <View style={[styles.group, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={styles.rowLabelCol}>
            <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>Push notifications</Text>
            <Text style={[styles.rowSub, { color: theme.textFaint }]}>
              {permissionDenied ? 'Enable in browser settings' : 'replies, reactions, memories'}
            </Text>
          </View>
          {!permissionDenied && (
            <Switch
              testID="push-notifications-switch"
              value={subscribed}
              onValueChange={(val) => (val ? subscribe() : unsubscribe())}
              disabled={loading}
              trackColor={{ true: theme.accent, false: 'rgba(245,230,200,0.16)' }}
              thumbColor={theme.surface}
            />
          )}
        </View>
      </View>

      {/* About blurb */}
      <Text style={[styles.about, { color: theme.textMuted }]}>
        sulat is a cozy anonymous map for leaving little notes at the places that matter to you. No usernames, no followers — just words and a pin.
      </Text>

      {/* Legal links */}
      <View style={styles.legalRow}>
        <PressableScale onPress={() => Linking.openURL('/privacy')} accessibilityRole="link">
          <Text style={[styles.legalLink, { color: theme.textMuted }]}>Privacy Policy</Text>
        </PressableScale>
        <Text style={[styles.legalSep, { color: 'rgba(245,230,200,0.2)' }]}>·</Text>
        <PressableScale onPress={() => Linking.openURL('/terms')} accessibilityRole="link">
          <Text style={[styles.legalLink, { color: theme.textMuted }]}>Terms of Service</Text>
        </PressableScale>
      </View>

      {/* Footer */}
      <Text style={[styles.credit, { color: 'rgba(245,230,200,0.3)' }]}>
        Made with warmth 🕯️
      </Text>
      <Text style={[styles.version, { color: theme.textFaint }]}>
        {APP_VERSION}
      </Text>
    </AnimatedSheet>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.textMuted }]}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  subtitle,
  enabled,
  onToggle,
  theme,
}: {
  label: string;
  subtitle?: string;
  enabled: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelCol}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: theme.textFaint }]}>{subtitle}</Text>
        )}
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ true: theme.accent, false: 'rgba(245,230,200,0.16)' }}
        thumbColor={theme.surface}
      />
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    elevation: 14,
    left: 12,
    overflow: 'hidden',
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    position: 'absolute',
    right: 12,
    shadowColor: '#1a0e00',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.32,
    shadowRadius: 24,
  },
  topHighlight: {
    height: 14,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },

  /* Header */
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
  subtitle: { fontSize: 11, marginTop: 1 },
  iconBtn: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconBtnText: { fontSize: 12, lineHeight: 14 },

  /* Section */
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.05,
    marginBottom: 6,
    marginTop: 4,
  },
  group: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },

  /* Row inside a group */
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowLabelCol: { flex: 1, paddingRight: 8 },
  rowLabel: { fontSize: 13, fontWeight: '500' },
  rowSub: { fontSize: 11, marginTop: 1 },
  rowValue: { fontSize: 12.5 },
  divider: { height: 1, marginHorizontal: 12 },

  /* About + footer */
  about: { fontSize: 12.5, lineHeight: 19, marginBottom: 14, marginTop: 2 },
  legalRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 12 },
  legalLink: { fontSize: 11 },
  legalSep: { fontSize: 11 },
  credit: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
  version: { fontSize: 10, letterSpacing: 0.3, textAlign: 'center' },
});
