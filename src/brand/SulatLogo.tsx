import { Platform, StyleSheet, Text, View } from 'react-native';

// Inject the breathing keyframe once at module scope (web only).
// 3.4s ease-in-out infinite, scale + brightness as per brand handoff.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sulat-logo-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes sulatBreathe {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50%      { transform: scale(1.03); filter: brightness(1.15); }
      }
    `;
    document.head.appendChild(style);
  }
}

export interface SulatLogoProps {
  /** Font size of the wordmark in px. Dot scales proportionally (13% of fontSize). */
  size?: number;
  /** When true, applies the 3.4s breathing animation (scale + brightness). Web only. */
  breathing?: boolean;
}

export function SulatLogo({ size = 26, breathing = false }: SulatLogoProps) {
  const dotSize = Math.round(size * 0.13);
  const dotMarginLeft = Math.round(size * 0.04);
  const innerBlur = size * 0.18;
  const innerSpread = size * 0.04;
  const outerBlur = size * 0.5;
  const outerSpread = size * 0.1;

  const dotShadowStyle =
    Platform.OS === 'web'
      ? {
          boxShadow:
            `0 0 ${innerBlur}px ${innerSpread}px rgba(242,208,140,0.7), ` +
            `0 0 ${outerBlur}px ${outerSpread}px rgba(232,184,106,0.4)`,
        }
      : {
          shadowColor: '#E8B86A',
          shadowOpacity: 1,
          shadowRadius: outerBlur,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        };

  const wrapStyle = breathing
    ? {
        animationName: 'sulatBreathe',
        animationDuration: '3.4s',
        animationTimingFunction: 'ease-in-out',
        animationIterationCount: 'infinite',
      }
    : undefined;

  return (
    <View testID="sulat-logo-wrap" style={[styles.wrap, wrapStyle as any]}>
      <Text
        style={[
          styles.wordmark,
          {
            fontSize: size,
            lineHeight: size,
          },
        ]}
      >
        sulat
      </Text>
      <View
        testID="sulat-logo-dot"
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            marginLeft: dotMarginLeft,
            marginBottom: 0,
          },
          dotShadowStyle as any,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  wordmark: {
    color: '#E8B86A',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontStyle: 'italic',
    fontWeight: '500',
    letterSpacing: -0.02 * 60,
  },
  dot: {
    backgroundColor: '#F2D08C',
  },
});
