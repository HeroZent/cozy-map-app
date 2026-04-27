// src/profile/MySulatRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
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

  return (
    <Pressable
      onPress={onNavigate}
      style={[styles.row, { borderBottomColor: 'rgba(245,230,200,0.08)' }]}
    >
      <View style={styles.main}>
        <Text style={[styles.body, { color: theme.textPrimary }]} numberOfLines={2}>
          {story.body}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.metaTxt, { color: theme.textMuted }]}>
            {story.location_label ?? 'somewhere'}{' · '}{timeLabel}
          </Text>
          {story.reaction_count > 0 && (
            <Text style={[styles.badge, { color: theme.accent }]}>
              {`✦ ${story.reaction_count}`}
            </Text>
          )}
          {story.is_memory && (
            <Text style={[styles.memoryBadge, { color: theme.pinMemory.body }]}>✦ memory</Text>
          )}
          {isUnread && (
            <Text style={[styles.unreadDot, { color: theme.accent }]}>●</Text>
          )}
        </View>
      </View>
      {onDelete && (
        <Pressable
          onPress={onDelete}
          style={styles.deleteBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete sulat"
          testID="delete-sulat-button"
        >
          <Text style={[styles.deleteTxt, { color: theme.textMuted }]}>✕</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  deleteBtn: { padding: 12, position: 'absolute', right: 0, top: 0 },
  deleteTxt: { fontSize: 11 },
  main: { flex: 1, paddingRight: 24 },
  memoryBadge: { fontSize: 11, fontStyle: 'italic', marginLeft: 8 },
  meta: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  metaTxt: { fontSize: 11 },
  row: { borderBottomWidth: 1, paddingVertical: 12 },
  unreadDot: { fontSize: 8, marginLeft: 6 },
});
