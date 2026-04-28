import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { PressableScale } from '@/components/PressableScale';

export interface ClusterMarkerProps {
  count: number;
  onPress: () => void;
}

/**
 * Cluster pin — radiates the warm accent and scales with density.
 * Tiny clusters (≤5 stories): 32px. Medium (≤10): 38px. Big (>10): 44px.
 * The size delta gives an instant read of where conversation is concentrated.
 */
export function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  const theme = useTheme();
  const size = count > 10 ? 44 : count > 5 ? 38 : 32;
  const fontSize = count > 10 ? 13 : count > 5 ? 12 : 11;

  return (
    <PressableScale onPress={onPress} scaleAmount={0.9}>
      <View
        style={[
          styles.cluster,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.accentSoft,
            borderColor: theme.accent,
            shadowColor: theme.accent,
          },
        ]}
      >
        <Text style={[styles.count, { color: theme.accent, fontSize }]}>
          {count}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cluster: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  count: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
