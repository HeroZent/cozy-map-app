import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { PressableScale } from '@/components/PressableScale';
import { useFlag } from './useFlag';

const REASONS = [
  { id: 'harmful', label: 'Harmful or dangerous', emoji: '⚠️' },
  { id: 'sexual', label: 'Sexual or explicit', emoji: '🚫' },
  { id: 'spam', label: 'Spam', emoji: '🗑️' },
  { id: 'harassment', label: 'Harassment', emoji: '💢' },
  { id: 'other', label: 'Other', emoji: '·' },
];

export interface FlagSheetProps {
  storyId: string;
  onClose: () => void;
}

export function FlagSheet({ storyId, onClose }: FlagSheetProps) {
  const theme = useTheme();
  const flag = useFlag();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const reason = REASONS.find((r) => r.id === selected)?.label ?? 'Other';
      await flag(storyId, reason);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      {done ? (
        <View style={styles.thanksWrap}>
          <View
            style={[
              styles.emptyBadge,
              { backgroundColor: theme.accentDim, borderColor: 'rgba(244,201,122,0.28)' },
            ]}
          >
            <Text style={styles.emptyEmoji}>🤍</Text>
          </View>
          <Text style={[styles.thanksTitle, { color: theme.textPrimary }]}>
            Thanks for letting us know
          </Text>
          <Text style={[styles.thanksSub, { color: theme.textFaint }]}>
            We{'’'}ll take a look soon
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.thanksWrap}>
          <ActivityIndicator color={theme.accent} />
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Why are you reporting this?
              </Text>
              <Text style={[styles.subtitle, { color: theme.textFaint }]}>
                pick a reason
              </Text>
            </View>
            <PressableScale
              onPress={onClose}
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

          {/* Reason rows */}
          <View style={styles.reasons}>
            {REASONS.map((reason) => {
              const active = selected === reason.id;
              return (
                <PressableScale
                  key={reason.id}
                  onPress={() => setSelected(reason.id)}
                  scaleAmount={0.97}
                  style={[
                    styles.reasonRow,
                    {
                      backgroundColor: active ? theme.accentSoft : 'rgba(255,255,255,0.03)',
                      borderColor: active ? 'rgba(244,201,122,0.4)' : theme.border,
                      borderRadius: theme.radii.full,
                    },
                  ]}
                >
                  <Text style={styles.reasonEmoji}>{reason.emoji}</Text>
                  <Text
                    style={[
                      styles.reasonText,
                      { color: active ? theme.accent : theme.textPrimary },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  <View
                    style={[
                      styles.radio,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? theme.accent : 'transparent',
                      },
                    ]}
                  />
                </PressableScale>
              );
            })}
          </View>

          {/* Submit */}
          <PressableScale
            onPress={submit}
            disabled={!selected}
            style={[
              styles.submitBtn,
              {
                backgroundColor: selected ? '#c0392b' : 'rgba(192,57,43,0.3)',
                borderRadius: theme.radii.md,
                opacity: selected ? 1 : 0.6,
              },
            ]}
          >
            <Text style={styles.submitTxt}>Report</Text>
          </PressableScale>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    padding: 14,
  },

  /* Header */
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 12 },
  title: { fontSize: 14, fontWeight: '600', letterSpacing: 0.1 },
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

  /* Reason rows */
  reasons: { gap: 6, marginBottom: 12 },
  reasonRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  reasonEmoji: { fontSize: 14 },
  reasonText: { flex: 1, fontSize: 13, fontWeight: '500' },
  radio: {
    borderRadius: 8,
    borderWidth: 1.5,
    height: 14,
    width: 14,
  },

  /* Submit */
  submitBtn: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
  },
  submitTxt: {
    color: '#fff',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  /* Thanks state */
  thanksWrap: { alignItems: 'center', paddingVertical: 18 },
  emptyBadge: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginBottom: 10,
    width: 52,
  },
  emptyEmoji: { fontSize: 22 },
  thanksTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  thanksSub: { fontSize: 12.5 },
});
