// src/profile/MySulatRow.tsx
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { PressableScale } from '@/components/PressableScale';
import type { MyStory } from './useMyStories';

export interface MySulatRowProps {
  story: MyStory;
  isUnread: boolean;
  onNavigate: () => void;
  onDelete?: () => void;
}

export function MySulatRow({ story, isUnread, onNavigate, onDelete }: MySulatRowProps) {
  const theme = useTheme();
  const ageDays = Math.floor((Date.now() - new Date(story.created_at).getTime()) / 86400000);
  const timeLabel = ageDays === 0 ? 'today' : ageDays === 1 ? '1d ago' : `${ageDays}d ago`;
  // MyStory doesn't carry mood — fall back to memory color when applicable, accent otherwise.
  const stripeColor = story.is_memory ? (theme.pinMemory?.body ?? theme.accent) : theme.accent;
  const locationText = story.location_label ?? 'somewhere';

  return (
    <PressableScale
      onPress={onNavigate}
      scaleAmount={0.97}
      style={[
        styles.row,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Left stripe — gold for normal stories, lavender for memories */}
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <View style={styles.main}>
        <Text style={[styles.body, { color: theme.textPrimary }]} numberOfLines={2}>
          {story.body}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.metaTxt, { color: theme.textMuted }]} numberOfLines={1}>
            {locationText}{' · '}{timeLabel}
          </Text>
          {story.reaction_count > 0 && (
            <Text style={[styles.badge, { color: theme.accent }]}>
              {`✦ ${story.reaction_count}`}
            </Text>
          )}
          {story.is_memory && (
            <Text style={[styles.memoryBadge, { color: theme.pinMemory?.body ?? theme.accent }]}>
              ✦ memory
            </Text>
          )}
          {isUnread && (
            <Text style={[styles.unreadDot, { color: theme.accent }]}>●</Text>
          )}
        </View>
      </View>

      {onDelete && (
        <PressableScale
          onPress={onDelete}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Delete sulat"
          testID="delete-sulat-button"
          style={[
            styles.deleteBtn,
            {
              borderColor: 'rgba(224,123,84,0.28)',
              backgroundColor: 'rgba(224,123,84,0.08)',
            },
          ]}
        >
          <Text style={[styles.deleteTxt, { color: '#e07b54' }]}>✕</Text>
        </PressableScale>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: { width: 3 },
  main: { flex: 1, gap: 6, padding: 12 },

  body: { fontSize: 13, lineHeight: 19 },

  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaTxt: { fontSize: 11 },
  badge: { fontSize: 11, fontWeight: '600' },
  memoryBadge: { fontSize: 11, fontStyle: 'italic' },
  unreadDot: { fontSize: 8 },

  deleteBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 10,
    width: 26,
  },
  deleteTxt: { fontSize: 11, fontWeight: '600' },
});
