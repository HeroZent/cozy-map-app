import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  type ReactNode,
} from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useSheetAnimation } from '@/hooks/useSheetAnimation';

export interface AnimatedSheetRef {
  open: () => void;
  close: (onDone: () => void) => void;
}

interface AnimatedSheetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps any sheet content with iOS-style entrance/exit physics
 * (translate-up + subtle scale settle + fade). Auto-opens on mount.
 *
 * Use the ref's `close(onDone)` to play the exit animation before the
 * parent unmounts the sheet — caller passes `onDone` to actually clear
 * the sheet from state.
 */
export const AnimatedSheet = forwardRef<AnimatedSheetRef, AnimatedSheetProps>(
  function AnimatedSheet({ children, style }, ref) {
    const {
      translateYAnim,
      opacityAnim,
      scaleAnim,
      open,
      close,
    } = useSheetAnimation();

    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    // Auto-open on mount
    useEffect(() => {
      open();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <Animated.View
        style={[
          style,
          {
            transform: [
              { translateY: translateYAnim },
              { scale: scaleAnim },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        {children}
      </Animated.View>
    );
  },
);
