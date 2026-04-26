import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { CARD_STYLES, type CardStyleId } from './cardStyles';

export interface StylePickerProps {
  selected: CardStyleId;
  onSelect: (id: CardStyleId) => void;
  showLabel?: boolean;
}

export function StylePicker({ selected, onSelect, showLabel = false }: StylePickerProps) {
  const selectedDef = CARD_STYLES.find((s) => s.id === selected);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CARD_STYLES.map((def) => {
          const isSelected = def.id === selected;
          const isPremium = def.tier === 'premium';
          return (
            <Pressable
              key={def.id}
              testID={`style-swatch-${def.id}`}
              onPress={() => { if (!isPremium) onSelect(def.id); }}
              accessibilityRole="button"
              accessibilityLabel={def.label}
              style={[
                styles.swatch,
                { backgroundColor: def.backgroundColors[0] },
                isSelected && styles.swatchSelected,
                isPremium && styles.swatchPremium,
              ]}
            >
              {isPremium && <Text style={styles.lock}>🔒</Text>}
            </Pressable>
          );
        })}
      </ScrollView>
      {showLabel && selectedDef && (
        <Text style={styles.label}>{selectedDef.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: 'rgba(245,230,200,0.5)',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  lock: { fontSize: 12 },
  row: { gap: 10, paddingBottom: 2, paddingHorizontal: 2 },
  swatch: {
    alignItems: 'center',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  swatchPremium: { opacity: 0.45 },
  swatchSelected: {
    borderColor: '#f4c97a',
    borderWidth: 2,
  },
  wrap: { marginBottom: 12 },
});
