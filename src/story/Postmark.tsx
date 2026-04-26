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

export function Postmark({ locationLabel, date, inkColor }: PostmarkProps) {
  const loc = formatLocation(locationLabel);
  if (!loc) return null;
  const dateStr = formatDate(date);

  return (
    <View style={[styles.outer, { borderColor: inkColor }]}>
      <View style={[styles.inner, { borderColor: inkColor }]} />
      <Text style={[styles.text, { color: inkColor }]}>
        {loc}{'\n'}{dateStr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1,
    bottom: 6,
    left: 6,
    position: 'absolute',
    right: 6,
    top: 6,
  },
  outer: {
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1.5,
    height: 52,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 52,
    zIndex: 2,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 7,
    lineHeight: 11,
    position: 'relative',
    textAlign: 'center',
    zIndex: 1,
  },
});
