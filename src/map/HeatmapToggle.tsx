import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface HeatmapToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function HeatmapToggle({ enabled, onToggle }: HeatmapToggleProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        style={[styles.btn, { backgroundColor: theme.surface, borderColor: theme.accent }]}
      >
        <Text style={[styles.txt, { color: theme.textPrimary }]}>
          {enabled ? '🔥 Heatmap on' : '🔥 Heatmap off'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  txt: { fontSize: 12, fontWeight: '600' },
  wrap: { position: 'absolute', right: 16, top: 16, zIndex: 10 },
});
