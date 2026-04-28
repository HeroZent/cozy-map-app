import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * iOS-style sheet entrance/exit physics.
 *
 * Tuned to mimic Apple's UISheetPresentationController:
 *   • Slides up from below (translateY 32 → 0)
 *   • Subtle scale settle (0.97 → 1.0) so the card "lands" rather than pops
 *   • Fast opacity fade-in (0 → 1, ~180ms)
 *   • Snappy springs — total ~280ms to fully open
 *
 * The previous letter-fold animation (~640ms with crease flickers + glint)
 * was beautiful but too leisurely for iOS muscle memory. This trades the
 * folded-paper metaphor for crisp Apple-spring physics; the cozy mood-tinted
 * backdrop in StorySheet preserves the warm aesthetic.
 */
export interface SheetAnimationResult {
  /** Vertical translate — slides the sheet up from below. */
  translateYAnim: Animated.Value;
  /** Opacity fade — keeps the entrance feeling smooth, not sudden. */
  opacityAnim: Animated.Value;
  /** Subtle scale settle — Apple's signature "lands" feel. */
  scaleAnim: Animated.Value;
  open: () => void;
  close: (onDone: () => void) => void;
}

const FROM_Y = 32;       // px below resting position when closed
const FROM_SCALE = 0.97; // start slightly compressed so it "swells" into place
const OPEN_OPACITY_MS = 180;
const CLOSE_TRANSLATE_MS = 200;
const CLOSE_OPACITY_MS = 160;

export function useSheetAnimation(): SheetAnimationResult {
  const translateYAnim = useRef(new Animated.Value(FROM_Y)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(FROM_SCALE)).current;

  const open = useCallback(() => {
    // Reset
    translateYAnim.setValue(FROM_Y);
    opacityAnim.setValue(0);
    scaleAnim.setValue(FROM_SCALE);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: OPEN_OPACITY_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // iOS-snappy spring: stiff (high tension) + critically damped (high
      // friction) so it stops cleanly with no bounce.
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 320,
        friction: 22,
        useNativeDriver: true,
      }),
      // Subtle scale settle — slightly less stiff so it lands a hair after
      // the slide, giving the card a tactile "settle" cue.
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 260,
        friction: 22,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateYAnim, opacityAnim, scaleAnim]);

  const close = useCallback(
    (onDone: () => void) => {
      Animated.parallel([
        Animated.timing(translateYAnim, {
          toValue: FROM_Y,
          duration: CLOSE_TRANSLATE_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: CLOSE_OPACITY_MS,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone();
      });
    },
    [translateYAnim, opacityAnim],
  );

  return { translateYAnim, opacityAnim, scaleAnim, open, close };
}
