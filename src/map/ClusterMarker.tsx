import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface ClusterMarkerProps {
  count: number;
  onPress: () => void;
}

export function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.cluster, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
        <Text style={[styles.count, { color: theme.textPrimary }]}>+{count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cluster: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  count: { fontSize: 11, fontWeight: '600' },
});
