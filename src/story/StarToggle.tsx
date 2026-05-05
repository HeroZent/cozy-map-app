import { StyleSheet, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useTheme } from '@/theme/ThemeContext';
import { useReadStories } from '@/data/useReadStories';

export interface StarToggleProps {
  storyId: string;
}

/**
 * Star icon inside StorySheet's header. Tap to toggle the story between
 * starred / not-starred. Starred sulat remain visible on the map even when
 * the user has the "Unread only" filter on.
 */
export function StarToggle({ storyId }: StarToggleProps) {
  const theme = useTheme();
  const { isStarred, toggleStarred } = useReadStories();
  const starred = isStarred(storyId);

  return (
    <PressableScale
      testID="star-toggle"
      onPress={() => toggleStarred(storyId)}
      accessibilityRole="button"
      accessibilityState={{ selected: starred }}
      accessibilityLabel={starred ? 'Remove star — let this sulat hide when filtered' : 'Star — keep this sulat visible'}
      style={styles.btn}
    >
      <Text
        style={[
          styles.glyph,
          { color: starred ? theme.accent : theme.textMuted },
        ]}
      >
        {starred ? '★' : '☆'}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  glyph: { fontSize: 22 },
});
