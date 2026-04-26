import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  type ReactNode,
} from 'react';
import { Animated, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useSheetAnimation } from '@/hooks/useSheetAnimation';

export interface AnimatedSheetRef {
  open: () => void;
  close: (onDone: () => void) => void;
}

interface AnimatedSheetProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedSheet = forwardRef<AnimatedSheetRef, AnimatedSheetProps>(
  function AnimatedSheet({ children, style }, ref) {
    const {
      scaleAnim,
      opacityAnim,
      creaseOpacity1,
      creaseOpacity2,
      glintOpacity,
      glintTranslateX,
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
            transform: [{ scaleY: scaleAnim }],
            opacity: opacityAnim,
            // @ts-ignore — transformOrigin CSS passthrough for React Native Web
            transformOrigin: 'center bottom',
          },
        ]}
      >
        {/* Crease line 1 — flickers at first fold hesitation */}
        <Animated.View
          style={[styles.crease, { top: '33%', opacity: creaseOpacity1 }]}
          pointerEvents="none"
        />
        {/* Crease line 2 — flickers at second fold hesitation */}
        <Animated.View
          style={[styles.crease, { top: '66%', opacity: creaseOpacity2 }]}
          pointerEvents="none"
        />
        {/* Glint — diagonal light streak after unfold settles */}
        <View style={styles.glintContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.glintStripe,
              {
                opacity: glintOpacity,
                transform: [{ translateX: glintTranslateX }],
              },
            ]}
          />
        </View>
        {children}
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  crease: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    height: 1.5,
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  glintContainer: {
    borderRadius: 18,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 100,
  },
  glintStripe: {
    bottom: -40,
    position: 'absolute',
    top: -40,
    width: 80,
    // @ts-ignore — CSS gradient passthrough for React Native Web
    background:
      'linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.16) 50%, rgba(255,255,255,0.04) 75%, transparent 100%)',
  },
});
