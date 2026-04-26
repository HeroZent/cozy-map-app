import { TextInput, StyleSheet } from 'react-native';
import { StoryCardShell } from '@/story/StoryCardShell';
import { Postmark } from '@/story/Postmark';
import { getCardStyle, type CardStyleId } from '@/story/cardStyles';

export interface ComposeCardProps {
  cardStyle: CardStyleId;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  locationLabel: string | null;
  maxLength: number;
}

/** Converts a 6-digit hex colour to rgba at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function ComposeCard({
  cardStyle,
  value,
  onChangeText,
  placeholder,
  locationLabel,
  maxLength,
}: ComposeCardProps) {
  const def = getCardStyle(cardStyle);
  const showPostmark = def.showPostmark && !!locationLabel;
  const placeholderColor = def.textColor.startsWith('#')
    ? hexToRgba(def.textColor, 0.4)
    : def.textColor;

  return (
    <StoryCardShell cardStyle={cardStyle}>
      {showPostmark && (
        <Postmark
          locationLabel={locationLabel}
          date={new Date().toISOString()}
          inkColor="rgba(120,80,20,0.45)"
        />
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: def.textColor,
            fontFamily: def.fontFamily,
            fontSize: def.fontSize,
            lineHeight: def.lineHeight,
            paddingRight: showPostmark ? 60 : 0,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        multiline
        maxLength={maxLength}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="top"
      />
    </StoryCardShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
    minHeight: 96,
    position: 'relative',
    zIndex: 1,
  },
});
