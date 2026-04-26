import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardStyle, type CardStyleId } from './cardStyles';

export interface StoryCardProps {
  body: string;
  cardStyle: CardStyleId;
}

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
        borderTopWidth: 28,
        borderRightWidth: 28,
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
        // @ts-ignore — clipPath is CSS-only, passed through on React Native Web
        style={{
          position: 'absolute',
          bottom: 0,
          left: -4,
          right: -4,
          height: 36,
          backgroundColor: color,
          clipPath:
            'polygon(0% 70%,2% 20%,5% 65%,8% 10%,11% 58%,14% 8%,18% 52%,21% 18%,25% 62%,28% 5%,32% 48%,36% 22%,40% 68%,44% 12%,48% 55%,52% 8%,56% 50%,60% 18%,64% 60%,68% 8%,72% 52%,76% 22%,80% 65%,84% 10%,88% 55%,92% 20%,96% 62%,98% 30%,100% 70%,100% 100%,0% 100%)',
        }}
      />
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function StoryCard({ body, cardStyle }: StoryCardProps) {
  const def = getCardStyle(cardStyle);

  // LinearGradient requires at least 2 colors
  const gradColors =
    def.backgroundColors.length >= 2
      ? (def.backgroundColors as [string, string, ...string[]])
      : ([def.backgroundColors[0], def.backgroundColors[0]] as [string, string]);

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
      {def.tornTopEdge && <TornEdgeStrip color={def.backgroundColors[0]} />}
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
        {def.foldCorner && <FoldCornerTriangle color={def.foldColor} />}

        <Text
          style={{
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {body}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    elevation: 4,
    overflow: 'hidden',
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  marginPadding: {
    paddingLeft: 22,
  },
  outer: {
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  tornCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
});
