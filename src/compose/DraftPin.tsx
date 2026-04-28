// src/compose/DraftPin.tsx
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

/**
 * The draft pin shown on the map while ComposeSheet is open.
 * Visually distinct from regular story pins:
 *   • Larger, teardrop shape so it reads as "I'm a placement marker"
 *   • Subtle bobbing animation to invite a drag
 *   • Compact "drag to adjust" hint label above the head
 *
 * Wrapped in a draggable <Marker> by the parent so the user can fine-tune
 * placement before posting.
 */
export function DraftPin() {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 700, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0,  duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: bob }] }]}>
      {/* Hint label */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>drag to adjust</Text>
      </View>

      {/* Pin head — circular with center plus glyph */}
      <View style={styles.head}>
        <View style={styles.headInner}>
          <Text style={styles.headIcon}>✦</Text>
        </View>
      </View>

      {/* Pin tail — triangle pointing down to the actual map coord */}
      <View style={styles.tail} />
    </Animated.View>
  );
}

const ACCENT = '#f4c97a';
const ACCENT_DARK = '#2a1f0a';

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    /* Marker anchor="bottom" places this View's bottom at the lng/lat */
  },

  /* Hint */
  hint: {
    backgroundColor: 'rgba(20, 26, 58, 0.85)',
    borderColor: 'rgba(244,201,122,0.35)',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  hintText: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  /* Head */
  head: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 18,
    elevation: 10,
    height: 36,
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    width: 36,
  },
  headInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 26, 58, 0.18)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  headIcon: {
    color: ACCENT_DARK,
    fontSize: 16,
    fontWeight: '700',
  },

  /* Tail (downward triangle) */
  tail: {
    borderLeftColor: 'transparent',
    borderLeftWidth: 7,
    borderRightColor: 'transparent',
    borderRightWidth: 7,
    borderStyle: 'solid',
    borderTopColor: ACCENT,
    borderTopWidth: 12,
    marginTop: -3,
  },
});
