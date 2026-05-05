import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedSheet, type AnimatedSheetRef } from '@/components/AnimatedSheet';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useMoodFilter } from '@/data/useMoodFilter';
import { MOODS } from '@/moods/catalog';
import type { Mood } from '@/data/types';

export interface MoodFilterSheetProps {
  /** When true, the sheet is mounted and animates in. */
  open: boolean;
  /** Fired when the user dismisses the sheet (backdrop tap). */
  onClose: () => void;
}

/**
 * Bottom sheet listing the 8 moods. Tapping a mood row toggles its
 * inclusion in the visible set. Tapping "Reset" clears the override and
 * returns to the default (all moods visible).
 */
export function MoodFilterSheet({ open, onClose }: MoodFilterSheetProps) {
  const theme = useTheme();
  const sheetRef = useRef<AnimatedSheetRef>(null);
  const { selectedMoods, hasOverride, toggle, reset } = useMoodFilter();

  if (!open) return null;

  const dismiss = () => {
    sheetRef.current?.close(onClose);
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop — tap to dismiss */}
      <PressableScale
        onPress={dismiss}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
      />

      <AnimatedSheet
        ref={sheetRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.surface,
          borderTopLeftRadius: theme.radii.xl,
          borderTopRightRadius: theme.radii.xl,
          maxHeight: '80%',
          paddingBottom: 32,
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Moods</Text>
          <View style={styles.headerActions}>
            <PressableScale
              testID="mood-filter-reset"
              onPress={() => { if (hasOverride) reset(); }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasOverride }}
              accessibilityLabel={hasOverride ? 'Reset — show all moods' : 'Reset (nothing to reset)'}
              style={styles.resetBtn}
            >
              <Text
                style={[
                  styles.resetLabel,
                  { color: hasOverride ? theme.accent : theme.textFaint },
                ]}
              >
                Reset
              </Text>
            </PressableScale>
            <PressableScale
              testID="mood-filter-close"
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel="Close mood filter"
              style={[styles.closeBtn, { backgroundColor: theme.accentDim, borderColor: theme.border }]}
            >
              <Text style={[styles.closeGlyph, { color: theme.accent }]}>✕</Text>
            </PressableScale>
          </View>
        </View>

        <ScrollView style={styles.list}>
          {MOODS.map((m) => {
            const active = selectedMoods.has(m.id as Mood);
            return (
              <PressableScale
                key={m.id}
                testID={`mood-filter-row-${m.id}`}
                onPress={() => toggle(m.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${m.name} — ${active ? 'shown' : 'hidden'}`}
                style={styles.row}
              >
                <Text style={styles.emoji}>{m.emoji}</Text>
                <View style={styles.rowText}>
                  <Text style={[styles.name, { color: theme.textPrimary }]}>{m.name}</Text>
                  <Text style={[styles.desc, { color: theme.textMuted }]} numberOfLines={1}>
                    {m.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? theme.accent : 'transparent',
                    },
                  ]}
                />
              </PressableScale>
            );
          })}
        </ScrollView>
      </AnimatedSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  resetLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  list: {
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 12,
  },
  emoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Georgia, serif',
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
});
