// src/profile/MySulatRow.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { MyStory } from './useMyStories';

export interface MySulatRowProps {
  story: MyStory;
  isUnread: boolean;
  onNavigate: () => void;
}

export function MySulatRow({ story, isUnread, onNavigate }: MySulatRowProps) {
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
          {isUnread && (
            <Text style={[styles.unreadDot, { color: theme.accent }]}>●</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { fontSize: 11, fontWeight: '600', marginLeft: 8 },
  body: { fontSize: 14, lineHeight: 20 },
  main: { flex: 1 },
  meta: { alignItems: 'center', flexDirection: 'row', marginTop: 4 },
  metaTxt: { fontSize: 11 },
  row: { borderBottomWidth: 1, paddingVertical: 12 },
  unreadDot: { fontSize: 8, marginLeft: 6 },
});
