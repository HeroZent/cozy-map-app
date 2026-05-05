import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useMoodFilter } from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';

export interface MoodFilterChipProps {
  /** Fired when the user taps the chip — parent opens the MoodFilterSheet. */
  onOpen: () => void;
}

/**
 * Lower-right pill chip that opens the mood filter sheet. Active state when
 * the user has narrowed the selection (fewer than all moods visible).
 */
export function MoodFilterChip({ onOpen }: MoodFilterChipProps) {
  const theme = useTheme();
  const { selectedMoods } = useMoodFilter();
  const active = selectedMoods.size < MOODS.length;
  const labelColor = active ? theme.accent : theme.textMuted;

  return (
    <PressableScale
      testID="mood-filter-chip"
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? 'Mood filter active — tap to change' : 'Filter by mood'}
      style={[
        styles.btn,
        { borderColor: active ? theme.accent : theme.border },
      ]}
    >
      <Text style={[styles.icon, { color: labelColor, opacity: active ? 1 : 0.85 }]}>🎚</Text>
      <Text style={[styles.label, { color: labelColor }]}>Moods</Text>
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
