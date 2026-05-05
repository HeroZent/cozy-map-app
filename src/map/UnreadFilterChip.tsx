import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useUnreadFilter } from '@/data/useUnreadFilter';

/**
 * Bottom-bar toggle that hides sulat the user has already opened. Mirrors
 * the styling of the adjacent "Near me" / "Lantern" nav buttons. Active
 * state tints the icon + label with theme.accent.
 */
export function UnreadFilterChip() {
  const theme = useTheme();
  const { unreadOnly, toggle } = useUnreadFilter();
  const labelColor = unreadOnly ? theme.accent : theme.textMuted;

  return (
    <PressableScale
      testID="unread-filter-chip"
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ selected: unreadOnly }}
      accessibilityLabel={unreadOnly ? 'Showing unread only — tap to show all' : 'Show unread only'}
      style={styles.btn}
    >
      <Text style={[styles.icon, { opacity: unreadOnly ? 1 : 0.85 }]}>✉︎</Text>
      <Text style={[styles.label, { color: labelColor }]}>Unread</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  icon: { fontSize: 17 },
  label: { fontSize: 11, letterSpacing: 0.3 },
});
