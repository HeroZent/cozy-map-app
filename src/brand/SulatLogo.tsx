import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export interface SulatLogoProps {
  /** Font size of the wordmark. Dot scales proportionally. */
  size?: number;
}

export function SulatLogo({ size = 26 }: SulatLogoProps) {
  const theme = useTheme();
  const dotSize = Math.round(size * 0.24);
  const dotBottom = Math.round(size * 0.08);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.wordmark, { color: theme.accent, fontFamily: theme.fontFamily, fontSize: size }]}>
        sulat
      </Text>
      {/* Glowing period — the brand mark */}
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: theme.accent,
            marginBottom: dotBottom,
            shadowColor: theme.accent,
            shadowRadius: dotSize * 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    elevation: 6,
    marginLeft: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
  },
  wordmark: { fontWeight: '400', letterSpacing: -0.5 },
  wrap: { alignItems: 'flex-end', flexDirection: 'row' },
});
