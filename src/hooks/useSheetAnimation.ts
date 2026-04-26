import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

export interface SheetAnimationResult {
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  creaseOpacity1: Animated.Value;
  creaseOpacity2: Animated.Value;
  glintOpacity: Animated.Value;
  glintTranslateX: Animated.Value;
  open: () => void;
  close: (onDone: () => void) => void;
}

export function useSheetAnimation(): SheetAnimationResult {
  const scaleAnim       = useRef(new Animated.Value(0.04)).current;
  const opacityAnim     = useRef(new Animated.Value(0)).current;
  const creaseOpacity1  = useRef(new Animated.Value(0)).current;
  const creaseOpacity2  = useRef(new Animated.Value(0)).current;
  const glintOpacity    = useRef(new Animated.Value(0)).current;
  const glintTranslateX = useRef(new Animated.Value(-300)).current;

  const open = useCallback(() => {
    // Reset all values
    scaleAnim.setValue(0.04);
    opacityAnim.setValue(0);
    creaseOpacity1.setValue(0);
    creaseOpacity2.setValue(0);
    glintOpacity.setValue(0);
    glintTranslateX.setValue(-300);

    Animated.parallel([
      // Fade in fast
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 60,
        useNativeDriver: true,
      }),
      // Three-phase scale: snap to each crease then settle
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.35,
          tension: 800,
          friction: 20,
          useNativeDriver: true,
        }),
        Animated.delay(25),
        Animated.spring(scaleAnim, {
          toValue: 0.70,
          tension: 700,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.delay(20),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 350,
          friction: 26,
          useNativeDriver: true,
        }),
      ]),
      // Crease 1 flickers at 60ms
      Animated.sequence([
        Animated.delay(60),
        Animated.timing(creaseOpacity1, { toValue: 1, duration: 35, useNativeDriver: true }),
        Animated.timing(creaseOpacity1, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]),
      // Crease 2 flickers at 140ms
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(creaseOpacity2, { toValue: 1, duration: 35, useNativeDriver: true }),
        Animated.timing(creaseOpacity2, { toValue: 0, duration: 110, useNativeDriver: true }),
      ]),
      // Glint fires after unfold settles (~340ms)
      Animated.sequence([
        Animated.delay(340),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(glintOpacity, { toValue: 1, duration: 35, useNativeDriver: true }),
            Animated.timing(glintOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]),
          Animated.timing(glintTranslateX, {
            toValue: 300,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [scaleAnim, opacityAnim, creaseOpacity1, creaseOpacity2, glintOpacity, glintTranslateX]);

  const close = useCallback(
    (onDone: () => void) => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.04,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    },
    [scaleAnim, opacityAnim],
  );

  return {
    scaleAnim,
    opacityAnim,
    creaseOpacity1,
    creaseOpacity2,
    glintOpacity,
    glintTranslateX,
    open,
    close,
  };
}
