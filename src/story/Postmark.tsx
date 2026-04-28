import { View, Text, StyleSheet } from 'react-native';

function formatLocation(label: string | null | undefined): string {
  if (!label) return '';
  return (label.split(',')[0] ?? '').trim().toUpperCase().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export interface PostmarkProps {
  locationLabel: string | null | undefined;
  date: string; // ISO string
  inkColor: string;
}

/**
 * A circular ink-stamp postmark applied to warm card styles.
 * Slight wobble + concentric rings give it the hand-stamped feel
 * of a real postal mark, never perfectly aligned.
 */
export function Postmark({ locationLabel, date, inkColor }: PostmarkProps) {
  const loc = formatLocation(locationLabel);
  if (!loc) return null;
  const dateStr = formatDate(date);

  return (
    <View style={[styles.outer, { borderColor: inkColor }]}>
      <View style={[styles.inner, { borderColor: inkColor }]} />
      <Text style={[styles.text, { color: inkColor }]}>
        {loc}{'\n'}
        <Text style={styles.divider}>—</Text>{'\n'}
        {dateStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 2,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    width: 56,
    /* Stamp wobble — hand-applied feel */
    transform: [{ rotate: '-4deg' }],
    zIndex: 2,
  },
  inner: {
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1,
    bottom: 6,
    left: 6,
    position: 'absolute',
    right: 6,
    top: 6,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 9.5,
    position: 'relative',
    textAlign: 'center',
    zIndex: 1,
  },
  divider: {
    fontSize: 6,
    opacity: 0.6,
  },
});
