import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardStyle, type CardStyleId } from './cardStyles';

// ── Private decorative helpers ──────────────────────────────────────────────

function RuledLineOverlay({ lineColor, lineHeight: lh }: { lineColor: string; lineHeight: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: 20 }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: lh * (i + 1),
            height: StyleSheet.hairlineWidth,
            backgroundColor: lineColor,
          }}
        />
      ))}
    </View>
  );
}

function MarginStripe({ color }: { color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 3,
        backgroundColor: color,
      }}
    />
  );
}

function FoldCornerTriangle({ color }: { color: string }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        borderStyle: 'solid',
        borderTopWidth: 32,
        borderRightWidth: 32,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
        borderTopColor: color,
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
      }}
    />
  );
}

function TornEdgeStrip({ color }: { color: string }) {
  return (
    <View style={{ height: 22, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: -4,
          right: -4,
          height: 36,
          backgroundColor: color,
          // @ts-ignore — clipPath is CSS-only, passed through on React Native Web
          clipPath:
            'polygon(0% 70%,2% 20%,5% 65%,8% 10%,11% 58%,14% 8%,18% 52%,21% 18%,25% 62%,28% 5%,32% 48%,36% 22%,40% 68%,44% 12%,48% 55%,52% 8%,56% 50%,60% 18%,64% 60%,68% 8%,72% 52%,76% 22%,80% 65%,84% 10%,88% 55%,92% 20%,96% 62%,98% 30%,100% 70%,100% 100%,0% 100%)',
        }}
      />
    </View>
  );
}

/**
 * Subtle "lifted paper" highlight: a faint top-edge gradient that hints
 * a sheet curling up from the surface beneath. Disabled for dark cards
 * (b, d) since highlights read poorly on dark grounds — those use a
 * subtle bottom shadow instead via the outer shadow tokens.
 */
function PaperLift({ tone }: { tone: 'warm' | 'dark' }) {
  if (tone === 'dark') return null;
  return (
    <LinearGradient
      colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
      style={styles.paperLift}
      pointerEvents="none"
    />
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────

export interface StoryCardShellProps {
  cardStyle: CardStyleId;
  children: ReactNode;
}

export function StoryCardShell({ cardStyle, children }: StoryCardShellProps) {
  const def = getCardStyle(cardStyle);

  const gradColors =
    def.backgroundColors.length >= 2
      ? (def.backgroundColors as [string, string, ...string[]])
      : ([def.backgroundColors[0], def.backgroundColors[0]] as [string, string]);

  // Dark vs warm tone determines whether we add the paper-lift highlight.
  const isDarkTone = cardStyle === 'b' || cardStyle === 'd';

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: def.borderColor,
          borderWidth: def.borderColor !== 'transparent' ? 1 : 0,
          shadowColor: def.shadowColor,
        },
      ]}
    >
      {def.tornTopEdge && <TornEdgeStrip color={def.backgroundColors[0] ?? '#000000'} />}
      <LinearGradient
        colors={gradColors}
        start={def.gradientStart}
        end={def.gradientEnd}
        style={[
          styles.card,
          def.tornTopEdge && styles.tornCard,
          def.leftMarginStripe && styles.marginPadding,
        ]}
      >
        {def.ruledLines && (
          <RuledLineOverlay lineColor={def.ruledLineColor} lineHeight={def.lineHeight} />
        )}
        {def.leftMarginStripe && <MarginStripe color={def.leftMarginColor} />}
        <PaperLift tone={isDarkTone ? 'dark' : 'warm'} />
        {def.foldCorner && <FoldCornerTriangle color={def.foldColor} />}
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    /* Multi-layer shadow — deeper, softer drop for lifted-paper feel */
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 18,
    elevation: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 18,
  },
  tornCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  marginPadding: {
    paddingLeft: 22,
  },
  paperLift: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    zIndex: 1,
  },
});
