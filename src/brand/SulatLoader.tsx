import { Platform, StyleSheet, Text, View } from 'react-native';
import { SulatLogo } from './SulatLogo';
import { SulatLantern } from './SulatLantern';

// ── Module-level keyframe injection (web only) ─────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'sulat-loader-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes sulatTwinkle {
        0%, 100% { opacity: 0.15; }
        50%      { opacity: 0.7; }
      }
      @keyframes sulatRise {
        0%   { transform: translate(0px, 0px); opacity: 0; }
        10%  { opacity: 1; }
        50%  { transform: translate(var(--sulat-sway, 0px), -65vh); opacity: 1; }
        90%  { opacity: 1; }
        100% { transform: translate(var(--sulat-sway, 0px), -130vh); opacity: 0; }
      }
      @keyframes sulatHalo {
        0%, 100% { opacity: 0.18; }
        50%      { opacity: 0.32; }
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Deterministic seeded random (mulberry32) ──────────────────────────────
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stars: pre-computed once at module scope, never reshuffles between renders.
const STAR_RNG = makeRng(2026);
const STARS = Array.from({ length: 30 }, () => ({
  left: STAR_RNG() * 100,           // %
  top: STAR_RNG() * 100,            // %
  size: 0.4 + STAR_RNG() * 1.6,     // 0.4–2.0 px
  opacity: 0.1 + STAR_RNG() * 0.5,  // 0.1–0.6
  delay: STAR_RNG() * 4,            // 0–4 s
}));

// Lanterns: 11 of them, also deterministic.
const LANTERN_RNG = makeRng(2027);
const LANTERNS = Array.from({ length: 11 }, () => ({
  left: LANTERN_RNG() * 100,           // %
  top: 100 + LANTERN_RNG() * 30,       // 100–130 % (offscreen below)
  width: 6 + LANTERN_RNG() * 12,       // 6–18 px
  duration: 12 + LANTERN_RNG() * 10,   // 12–22 s
  delay: -(LANTERN_RNG() * 22),        // negative delay so steady-state on first frame
  sway: -4 + LANTERN_RNG() * 8,        // -4 to +4 px
}));

export interface SulatLoaderProps {
  /** When false, the loader transitions to opacity 0 over 400ms then fires onDismissed. */
  visible: boolean;
  /** Fired after the fade-out transition completes. */
  onDismissed?: () => void;
}

export function SulatLoader({ visible, onDismissed }: SulatLoaderProps) {
  return (
    <View
      testID="sulat-loader"
      style={[
        styles.wrap,
        {
          opacity: visible ? 1 : 0,
          ...(Platform.OS === 'web'
            ? { transition: 'opacity 400ms ease-out' as any }
            : {}),
          background:
            'linear-gradient(180deg, #06091A 0%, #0D1A30 60%, #1A2440 100%)' as any,
          pointerEvents: visible ? 'auto' : ('none' as any),
        },
      ]}
      onTransitionEnd={() => {
        if (!visible) onDismissed?.();
      }}
    >
      {/* Horizon haze (anchored bottom) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 200,
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(232,184,106,0.25), transparent 70%)' as any,
        }}
      />

      {/* Star dust */}
      {STARS.map((s, i) => (
        <View
          key={`star-${i}`}
          testID="sulat-loader-star"
          style={{
            position: 'absolute',
            left: `${s.left}%` as any,
            top: `${s.top}%` as any,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#F2D08C',
            opacity: s.opacity,
            ...(Platform.OS === 'web'
              ? {
                  animationName: 'sulatTwinkle',
                  animationDuration: '3s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: 'infinite',
                  animationDelay: `${s.delay}s`,
                }
              : {}),
          } as any}
        />
      ))}

      {/* Floating lanterns */}
      {LANTERNS.map((l, i) => (
        <View
          key={`lantern-${i}`}
          style={{
            position: 'absolute',
            left: `${l.left}%` as any,
            top: `${l.top}%` as any,
            ...(Platform.OS === 'web'
              ? {
                  animationName: 'sulatRise',
                  animationDuration: `${l.duration}s`,
                  animationTimingFunction: 'linear',
                  animationIterationCount: 'infinite',
                  animationDelay: `${l.delay}s`,
                  ['--sulat-sway' as any]: `${l.sway}px`,
                }
              : {}),
          } as any}
        >
          <SulatLantern width={l.width} />
        </View>
      ))}

      {/* Center lockup */}
      <View style={styles.centerLockup} pointerEvents="none">
        <SulatLogo size={60} breathing />
        <View style={{ height: 16 }} />
        <Text style={styles.tagline}>a place for letters in the dark</Text>
      </View>

      {/* Bottom mono label */}
      <Text style={styles.bottomLabel}>FINDING NEARBY LANTERNS…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    overflow: 'hidden',
  },
  centerLockup: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }],
  },
  tagline: {
    color: 'rgba(242,208,140,0.7)',
    fontFamily: '"Cormorant Garamond", Georgia, serif',
    fontStyle: 'italic',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  bottomLabel: {
    position: 'absolute',
    bottom: 56,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(232,184,106,0.4)',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 9,
    letterSpacing: 3,
  },
});
