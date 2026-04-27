import { Text, StyleSheet, View } from 'react-native';
import { StoryCardShell } from './StoryCardShell';
import { Postmark } from './Postmark';
import { getCardStyle, type CardStyleId } from './cardStyles';

export interface StoryCardProps {
  body: string;
  cardStyle: CardStyleId;
  locationLabel?: string | null;
  createdAt?: string;
  hasCrisisNote?: boolean;
}

export function StoryCard({ body, cardStyle, locationLabel, createdAt, hasCrisisNote }: StoryCardProps) {
  const def = getCardStyle(cardStyle);
  const showPostmark = def.showPostmark && !!locationLabel && !!createdAt;

  return (
    <StoryCardShell cardStyle={cardStyle}>
      {showPostmark && (
        <Postmark
          locationLabel={locationLabel}
          date={createdAt!}
          inkColor="rgba(120,80,20,0.45)"
        />
      )}
      <Text
        style={[
          styles.body,
          {
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            paddingRight: showPostmark ? 60 : 0,
          },
        ]}
      >
        {body}
      </Text>
      {hasCrisisNote && (
        <View style={styles.crisisIndicator} pointerEvents="none">
          <Text style={styles.crisisEmoji}>💙</Text>
        </View>
      )}
    </StoryCardShell>
  );
}

const styles = StyleSheet.create({
  body: {
    position: 'relative',
    zIndex: 1,
  },
  crisisIndicator: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    zIndex: 2,
  },
  crisisEmoji: {
    fontSize: 11,
    opacity: 0.5,
  },
});
