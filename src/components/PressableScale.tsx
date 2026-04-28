import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How much to shrink on press. Default 0.96 (Apple-standard). */
  scaleAmount?: number;
  /** Opacity dip on press. Default 0.85. */
  pressOpacity?: number;
}

/**
 * Pressable wrapper that gives every interactive element Apple-style
 * scale-down + opacity-dip feedback. Spring back to rest with snappy physics.
 *
 * Use this in place of `Pressable` for any tap target — buttons, cards,
 * list rows, FABs. Use `style` on this component just like on a regular View.
 */
export function PressableScale({
  children,
  style,
  scaleAmount = 0.96,
  pressOpacity = 0.85,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue:        scaleAmount,
        useNativeDriver: true,
        tension:         320,
        friction:        14,
      }),
      Animated.timing(opacity, {
        toValue:        pressOpacity,
        duration:       80,
        useNativeDriver: true,
      }),
    ]).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue:        1,
        useNativeDriver: true,
        tension:         260,
        friction:        12,
      }),
      Animated.timing(opacity, {
        toValue:        1,
        duration:       140,
        useNativeDriver: true,
      }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <Pressable {...rest} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
