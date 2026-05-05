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
      style={[
        styles.btn,
        { borderColor: unreadOnly ? theme.accent : theme.border },
      ]}
    >
      <Text style={[styles.icon, { color: labelColor, opacity: unreadOnly ? 1 : 0.85 }]}>✉︎</Text>
      <Text style={[styles.label, { color: labelColor }]}>{unreadOnly ? 'Unread only' : 'Unread'}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(20, 26, 58, 0.85)',
    borderRadius: 999,
    borderWidth: 1,
  },
  icon: { fontSize: 14 },
  label: { fontSize: 12, letterSpacing: 0.5 },
});
