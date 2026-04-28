import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, type ViewStyle, type StyleProp } from 'react-native';

interface Props {
  icon: string;
  count: number;
  active: boolean;
  activeBg: string;
  inactiveBg: string;
  activeFg: string;
  inactiveFg: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reaction chip with a satisfying "pop" on tap — emoji scales up
 * and overshoots before settling, like Apple's reaction picker.
 *
 * Animation:
 *  • press in:    scale 0.94 (slight squash)
 *  • release:     scale 1.18 (overshoot)
 *  • settle:      scale 1.0  (spring rest)
 *
 * The chip background is animated separately so toggling on/off feels
 * solid (no jitter), but the emoji itself does the celebratory pop.
 */
export function ReactionChip({
  icon,
  count,
  active,
  activeBg,
  inactiveBg,
  activeFg,
  inactiveFg,
  onPress,
  style,
}: Props) {
  const emojiScale = useRef(new Animated.Value(1)).current;

  const pop = () => {
    Animated.sequence([
      // squash on press
      Animated.timing(emojiScale, { toValue: 0.94, duration: 60, useNativeDriver: true }),
      // overshoot
      Animated.spring(emojiScale, {
        toValue: 1.18,
        tension: 380,
        friction: 8,
        useNativeDriver: true,
      }),
      // settle back
      Animated.spring(emojiScale, {
        toValue: 1,
        tension: 240,
        friction: 14,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    pop();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.chip,
        { backgroundColor: active ? activeBg : inactiveBg },
        style,
      ]}
    >
      <Animated.Text style={[styles.icon, { transform: [{ scale: emojiScale }] }]}>
        {icon}
      </Animated.Text>
      {count > 0 && (
        <Text style={[styles.count, { color: active ? activeFg : inactiveFg }]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  count: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    fontSize: 14,
  },
});
